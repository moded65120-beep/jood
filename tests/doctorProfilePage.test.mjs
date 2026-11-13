import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'
import { createDoctorProfileRepository, doctorContactErrors } from '../src/services/doctorProfileRepository.js'
import { doctorDirectory, getDoctorProfile } from '../src/services/doctorDirectory.js'

function storage() {
  const values = new Map()
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]

test('profile details persist per canonical doctor without changing identity, credentials or clinical records', () => {
  const db = storage(), events = new EventTarget()
  let current = getDoctorProfile('ahmad')
  const repository = createDoctorProfileRepository({ storage: db, events, currentDoctor: () => current })
  db.setItem('nomu.demo.unifiedAuth.v1', 'credential sentinel')
  db.setItem('nomu.demo.medicalRecords.v1', 'clinical sentinel')
  assert.deepEqual(repository.read('ahmad'), { phone: '', email: '', bio: '' })
  repository.save('ahmad', { phone: '+962 79 123 4567', email: 'contact@example.com' })
  repository.save('ahmad', { bio: 'Pediatric care in Arabic and English.' })
  const afterRefresh = createDoctorProfileRepository({ storage: db, currentDoctor: () => current })
  assert.equal(afterRefresh.read('ahmad').email, 'contact@example.com')
  assert.equal(afterRefresh.read('ahmad').phone, '+962 79 123 4567')
  assert.equal(afterRefresh.read('ahmad').bio, 'Pediatric care in Arabic and English.')
  assert.deepEqual(repository.read('rania'), { phone: '', email: '', bio: '' })
  assert.throws(() => repository.save('rania', { bio: 'Unauthorized' }), /notAllowed/)
  for (const field of ['id', 'name', 'specialty', 'doctorId', 'password']) assert.throws(() => repository.save('ahmad', { [field]: 'Changed' }), /saveFailed/)
  current = null
  assert.throws(() => repository.save('ahmad', { bio: 'Unauthorized' }), /notAllowed/)
  assert.equal(db.getItem('nomu.demo.unifiedAuth.v1'), 'credential sentinel')
  assert.equal(db.getItem('nomu.demo.medicalRecords.v1'), 'clinical sentinel')
  assert.equal(getDoctorProfile('ahmad'), doctorDirectory.find(doctor => doctor.id === 'ahmad'))
})

test('contact validation, corrupt storage and failed writes never replace existing saved data', () => {
  assert.deepEqual(doctorContactErrors({ phone: '+962 79 123 4567', email: 'doctor@example.com' }), { phone: '', email: '' })
  assert.deepEqual(doctorContactErrors({ phone: '٠٧٩١٢٣٤٥٦٧', email: '' }), { phone: '', email: '' })
  assert.deepEqual(doctorContactErrors({ phone: '123', email: 'not an email' }), { phone: 'invalidPhone', email: 'invalidEmail' })
  const db = storage()
  const repository = createDoctorProfileRepository({ storage: db, currentDoctor: () => getDoctorProfile('ahmad') })
  repository.save('ahmad', { bio: 'Saved biography' })
  const original = [...db.values]
  assert.throws(() => repository.save('ahmad', { phone: 'invalid' }), /invalidPhone/)
  assert.throws(() => repository.save('ahmad', { email: 'invalid' }), /invalidEmail/)
  assert.throws(() => repository.save('ahmad', { bio: 'x'.repeat(2001) }), /bioTooLong/)
  assert.deepEqual([...db.values], original)
  const write = db.setItem
  db.setItem = () => { throw Error('quota') }
  assert.throws(() => repository.save('ahmad', { bio: 'Failed change' }), /quota/)
  assert.deepEqual([...db.values], original)
  db.setItem = write
  const key = original[0][0]
  db.setItem(key, '{broken')
  assert.throws(() => repository.read('ahmad'), /loadFailed/)
  assert.throws(() => repository.save('ahmad', { bio: 'Overwrite' }), /loadFailed/)
  assert.equal(db.getItem(key), '{broken')
})

async function profileHost(language, repository) {
  const source = await readFile(new URL('../src/pages/doctor/DoctorProfile.jsx', import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, 'DoctorProfile.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace('export default ', '')
  const dictionary = language === 'ar' ? ar : en
  const t = key => key.split('.').reduce((value, part) => value?.[part], dictionary) ?? key
  let cursor = 0
  const states = []
  const bindings = {
    _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment,
    ...Object.fromEntries(['BadgeCheck', 'BriefcaseMedical', 'Mail', 'Pencil', 'Phone', 'UserRound', 'DoctorPhotoEditor'].map(name => [name, name])),
    useLanguage: () => ({ language, t }), useId: () => 'profile-test',
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next }] },
    doctorProfileRepository: repository, doctorContactErrors,
  }
  const Component = new Function(...Object.keys(bindings), code + '; return DoctorProfile')(...Object.values(bindings))
  return { render(doctor) { cursor = 0; return Component({ doctor }) } }
}

test('contact and biography editors validate, persist and discard drafts independently in both languages', async () => {
  for (const language of ['en', 'ar']) {
    const db = storage(), doctor = getDoctorProfile('ahmad')
    const repository = createDoctorProfileRepository({ storage: db, currentDoctor: () => doctor })
    const host = await profileHost(language, repository)
    const dictionary = (language === 'ar' ? ar : en).doctorProfilePage
    const render = () => host.render(doctor)
    const click = label => nodes(render()).find(node => node.type === 'button' && node.props.children?.includes?.(label)).props.onClick()
    click(dictionary.editContact)
    let tree = render()
    const input = field => nodes(render()).find(node => node.type === 'input' && node.props.type === field)
    input('tel').props.onChange({ target: { value: 'bad' } })
    input('email').props.onChange({ target: { value: 'bad' } })
    nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.equal(nodes(render()).filter(node => node.props.role === 'alert').length, 2)
    assert.equal(repository.read('ahmad').email, '')
    input('tel').props.onChange({ target: { value: '+962791234567' } })
    input('email').props.onChange({ target: { value: 'doctor@example.com' } })
    nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.equal(repository.read('ahmad').email, 'doctor@example.com')
    click(dictionary.editContact)
    input('email').props.onChange({ target: { value: 'discard@example.com' } })
    click(dictionary.cancel)
    assert.equal(repository.read('ahmad').email, 'doctor@example.com')
    click(dictionary.editAbout)
    nodes(render()).find(node => node.type === 'textarea').props.onChange({ target: { value: 'Discarded bio' } })
    click(dictionary.cancel)
    assert.equal(repository.read('ahmad').bio, '')
    click(dictionary.editAbout)
    nodes(render()).find(node => node.type === 'textarea').props.onChange({ target: { value: 'Saved professional bio' } })
    nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.equal(repository.read('ahmad').bio, 'Saved professional bio')
    tree = render()
    assert.ok(nodes(tree).some(node => node.props.children === 'Saved professional bio'))
    assert.ok(!nodes(tree).some(node => node.props.children === dictionary.experience))
    assert.equal(tree.props.dir, language === 'ar' ? 'rtl' : 'ltr')
    assert.deepEqual(repository.read('rania'), { phone: '', email: '', bio: '' })
  }
})

test('profile page displays each real doctor without invented experience and notifies subscribers after successful saves', async () => {
  const db = storage(), events = new EventTarget()
  let current = null
  const repository = createDoctorProfileRepository({ storage: db, events, currentDoctor: () => current })
  let changes = 0
  const unsubscribe = repository.subscribe(() => { changes++ })
  for (const doctor of doctorDirectory) {
    current = doctor
    repository.save(doctor.id, { bio: 'Biography for ' + doctor.id })
    for (const language of ['en', 'ar']) {
      const host = await profileHost(language, repository)
      const tree = host.render(doctor)
      assert.ok(nodes(tree).some(node => node.props.children === (language === 'ar' ? doctor.nameAr : doctor.name)))
      assert.ok(nodes(tree).some(node => node.props.children === (language === 'ar' ? doctor.specialtyAr : doctor.specialty)))
      assert.equal(nodes(tree).find(node => node.type === 'DoctorPhotoEditor').props.doctorId, doctor.id)
      assert.ok(!nodes(tree).some(node => node.props.children === 'Hospital ID' || node.props.children === 'Employee ID'))
    }
  }
  assert.equal(changes, 6)
  unsubscribe()
  repository.save(current.id, { bio: 'No listener' })
  assert.equal(changes, 6)
})

test('failed profile saves keep drafts visible, and unreadable saved data disables editing', async () => {
  const db = storage(), doctor = getDoctorProfile('ahmad')
  const repository = createDoctorProfileRepository({ storage: db, currentDoctor: () => doctor })
  repository.save(doctor.id, { phone: '+962791234567', email: 'saved@example.com', bio: 'Saved bio' })
  const host = await profileHost('en', repository)
  const render = () => host.render(doctor)
  nodes(render()).find(node => node.type === 'button' && node.props.children?.includes?.(en.doctorProfilePage.editContact)).props.onClick()
  nodes(render()).find(node => node.type === 'input' && node.props.type === 'email').props.onChange({ target: { value: 'draft@example.com' } })
  db.setItem = () => { throw Error('quota') }
  nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.equal(nodes(render()).find(node => node.type === 'input' && node.props.type === 'email').props.value, 'draft@example.com')
  assert.equal(repository.read(doctor.id).email, 'saved@example.com')
  assert.ok(nodes(render()).some(node => node.props.role === 'alert' && node.props.children === en.doctorProfilePage.saveFailed))
  const brokenHost = await profileHost('en', { ...repository, read() { throw Error('loadFailed') } })
  const broken = brokenHost.render(doctor)
  assert.ok(nodes(broken).filter(node => node.type === 'button').every(node => node.props.disabled))
  assert.ok(nodes(broken).some(node => node.props.children === en.doctorProfilePage.loadFailed))
})

test('Doctor sidebar opens the profile page with its active state and retains calendar/patient navigation', async () => {
  const source = await readFile(new URL('../src/pages/doctor/DoctorDashboard.jsx', import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, 'DoctorDashboard.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace('export default ', '')
  const states = []
  let cursor = 0, destination = '', active = getDoctorProfile('rania')
  const t = key => key.split('.').reduce((value, part) => value?.[part], en) ?? key
  const components = ['PatientRecordNavigation', 'DoctorProfile', 'DoctorCalendar', 'RequestInformation', 'LanguageSwitcher', 'Card', 'Icon', 'DoctorAvatar', 'DoctorModal', 'AddPatientModal', 'PatientTable', 'ChildMedicalRecord']
  const bindings = {
    ...Object.fromEntries(components.map(name => [name, name])), _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment,
    getDoctorProfile, currentDoctorProfile: () => active, useUnifiedDemoUser: () => ({ role: active ? 'doctor' : 'nurse', name: 'Nurse', clinicalEditing: Boolean(active) }),
    useLanguage: () => ({ language: 'en', t }), useNavigate: () => path => { destination = path },
    useDoctorBookings: () => ({ state: { requests: [] } }), useDoctorMedicalRecords: () => ({ patients: [] }),
    DEFAULT_DOCTOR_ID: 'demo-doctor-sarah-ahmad', nomuLogo: '/logo.png', useRef: () => ({ current: null }),
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next }] },
  }
  const Component = new Function(...Object.keys(bindings), code + '; return DoctorDashboard')(...Object.values(bindings))
  const render = profilePage => { cursor = 0; return Component({ profilePage }) }
  const button = (tree, label) => nodes(tree).find(node => node.type === 'button' && node.props.children?.includes?.(label))
  let tree = render(false)
  button(tree, en.doctor.profile).props.onClick()
  assert.equal(destination, '/doctor/profile')
  tree = render(true)
  assert.equal(nodes(tree).find(node => node.type === 'DoctorProfile').props.doctor.id, 'rania')
  assert.equal(button(tree, en.doctor.profile).props['aria-current'], 'page')
  assert.equal(button(tree, en.doctor.patients).props['aria-current'], undefined)
  assert.ok(!nodes(tree).some(node => node.type === 'DoctorModal'))
  assert.ok(nodes(tree).some(node => node.props.className === 'dd-topbar'))
  button(tree, en.doctor.calendar).props.onClick()
  assert.equal(destination, '/doctor')
  tree = render(false)
  assert.ok(nodes(tree).some(node => node.type === 'DoctorCalendar'))
  button(tree, en.doctor.patients).props.onClick()
  assert.ok(nodes(render(false)).some(node => node.type === 'PatientTable'))
  active = null
  assert.ok(!nodes(render(true)).some(node => node.type === 'DoctorProfile'))
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.ok(app.includes('<Route path="profile" element={<DoctorDashboard profilePage />} />'))
})
