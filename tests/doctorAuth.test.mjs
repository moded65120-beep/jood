import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import { createDoctorDemoAuth, doctorAuthKey } from '../src/services/doctorDemoAuth.js'
import { createMotherDemoAuth } from '../src/services/motherDemoAuth.js'

const storage = () => {
  const data = new Map([['medical-records', 'preserved'], ['bookings', 'preserved']])
  return { data, getItem: key => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
}
test('doctor and mother sessions are independent, survive refresh, and logout preserves all other data', () => {
  const db = storage(), doctor = createDoctorDemoAuth(db), mother = createMotherDemoAuth(db)
  assert.equal(doctor.login('1234567890', 'Demo123!'), false)
  mother.login('1234567890', 'Demo123!')
  assert.equal(doctor.isAuthenticated(), false)
  mother.logout()
  assert.equal(doctor.login('9876543210', 'wrong'), false)
  assert.equal(doctor.login('9876543210', 'Demo123!'), false)
  assert.equal(doctor.isAuthenticated(), false)
  assert.equal(doctor.login('9876543210', 'Doctor123!'), true)
  assert.equal(mother.isAuthenticated(), false)
  assert.equal(createDoctorDemoAuth(db).isAuthenticated(), true)
  mother.login('1234567890', 'Demo123!')
  const before = new Map(db.data)
  before.delete(doctorAuthKey)
  doctor.logout()
  assert.deepEqual(db.data, before)
  assert.equal(mother.isAuthenticated(), true)
  assert.equal(createDoctorDemoAuth(db).isAuthenticated(), false)
})

test('restored login validates Doctor ID, navigates only on success, and renders bilingual labels without demo passwords', async () => {
  const source = await readFile(new URL('../src/pages/auth/DoctorLogin.jsx', import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, 'DoctorLogin.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace('export default ', '')
  for (const language of ['en', 'ar']) {
    const { default: translations } = await import(`../src/locales/${language}/translations.js`)
    const t = key => key.split('.').reduce((value, part) => value?.[part], translations)
    const auth = createDoctorDemoAuth(storage()), states = [], navigations = []
    let cursor = 0
    const useState = initial => {
      const index = cursor++
      if (!(index in states)) states[index] = initial
      return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next }]
    }
    const bindings = { _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment, useState, Link: 'a', useNavigate: () => (...args) => navigations.push(args), useLanguage: () => ({ language, t }), LanguageSwitcher: 'language-switcher', LogoSymbol: 'logo', loginDoctorDemo: (...args) => auth.login(...args) }
    const Login = new Function(...Object.keys(bindings), code + '\nreturn DoctorLogin')(...Object.values(bindings))
    const render = () => { cursor = 0; return Login() }
    const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]
    let tree = render()
    assert.equal(tree.props.dir, language === 'ar' ? 'rtl' : 'ltr')
    assert.ok(nodes(tree).some(node => node.type === 'label' && node.props.children === (language === 'ar' ? 'رقم الطبيب' : 'Doctor ID')))
    assert.equal(nodes(tree).find(node => node.type === 'input' && node.props.name === 'password').props.type, 'password')
    const enter = (name, value) => nodes(render()).find(node => node.type === 'input' && node.props.name === name).props.onChange({ target: { name, value } })
    const submit = () => nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { elements: { doctorId: { focus() {} }, password: { focus() {} } } } })
    submit()
    assert.equal(navigations.length, 0)
    enter('doctorId', 'wrong'); enter('password', 'Doctor123!'); submit()
    assert.equal(auth.isAuthenticated(), false)
    assert.equal(states[3], 'doctorAuth.invalid')
    enter('doctorId', '9876543210'); enter('password', 'wrong'); submit()
    assert.equal(auth.isAuthenticated(), false)
    assert.equal(navigations.length, 0)
    enter('password', 'Doctor123!'); submit()
    assert.equal(auth.isAuthenticated(), true)
    assert.deepEqual(navigations, [['/doctor', { replace: true }]])
    assert.ok(!JSON.stringify(render()).includes('demoNote'))
  }
})
test('blocked storage supports a document-only demo session and revokes it on logout', () => {
  const fail = () => { throw Error('blocked') }
  const auth = createDoctorDemoAuth({ getItem: fail, setItem: fail, removeItem: fail })
  assert.equal(auth.isAuthenticated(), false)
  auth.login('9876543210', 'Doctor123!')
  assert.equal(auth.isAuthenticated(), true)
  auth.logout()
  assert.equal(auth.isAuthenticated(), false)
})
test('doctor guard reevaluates session and redirects with replace after logout or history navigation', async () => {
  const source = await readFile(new URL('../src/components/doctor/DoctorProtectedRoute.jsx', import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, 'DoctorProtectedRoute.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace('export default ', '')
  const auth = createDoctorDemoAuth(storage())
  const Guard = new Function('_jsx', 'useSyncExternalStore', 'subscribeDoctorAuth', 'isDoctorAuthenticated', 'Navigate', code + '\nreturn DoctorProtectedRoute')(jsx.jsx, (_subscribe, snapshot) => snapshot(), () => {}, () => auth.isAuthenticated(), 'redirect')
  const check = () => {
    const result = Guard({ children: 'dashboard' })
    assert.equal(result.props.to, '/doctor/login')
    assert.equal(result.props.replace, true)
  }
  check()
  auth.login('9876543210', 'Doctor123!')
  assert.equal(Guard({ children: 'dashboard' }), 'dashboard')
  auth.logout()
  check()
})
