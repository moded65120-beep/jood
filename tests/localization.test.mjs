import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import { matchRoutes } from 'react-router-dom'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'
import { ageFromBirthDate } from '../src/components/doctor/medicalRecordData.js'

// Exercise component handlers and context effects without adding a DOM dependency.
// Browser layout and font rendering still require a manual browser check.
async function loadComponent(path, bindings, exports) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, path)
  code = code.replace(/^import .*;?\r?\n/gm, '').replace(/export default /g, '').replace(/export /g, '')
  // Function-based tests render the Preview toolbar without launching its dev-only root.
  code = code.replace(/import\.meta\.env\.DEV/g, 'false')
  return new Function(...Object.keys(bindings), code + `\nreturn { ${exports} };`)(...Object.values(bindings))
}

function hookHost() {
  const states = []
  let cursor = 0
  return {
    states,
    reset() { cursor = 0 },
    useState(initial) {
      const index = cursor++
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
      return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next }]
    },
    useCallback: (callback) => callback,
    useMemo: (factory) => factory(),
    useEffect: (effect) => effect(),
  }
}

const runtime = { _jsx: jsx.jsx, _jsxs: jsx.jsxs }

async function provider(saved, blocked = false, dictionaryOverrides = {}) {
  const storage = new Map(saved === undefined ? [] : [['nomu.language', saved]])
  const document = { documentElement: {} }
  const host = hookHost()
  const context = { Provider: 'provider' }
  const { LanguageProvider, useLanguage } = await loadComponent('../src/contexts/LanguageContext.jsx', {
    ...runtime, ...host, en, ar, ...dictionaryOverrides, document,
    window: { localStorage: {
      getItem: (key) => { if (blocked) throw Error('Storage blocked'); return storage.get(key) },
      setItem: (key, value) => { if (blocked) throw Error('Storage blocked'); storage.set(key, value) },
    } },
    createContext: () => context, useContext: () => context.value,
  }, 'LanguageProvider, useLanguage')
  function render() {
    host.reset()
    const tree = LanguageProvider({ children: null })
    context.value = tree.props.value
    return context.value
  }
  return { render, document, storage, useLanguage }
}

function leaves(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => typeof child === 'string'
    ? [`${prefix}${key}`] : leaves(child, `${prefix}${key}.`))
}

test('dictionaries have matching, nonempty translations', () => {
  assert.deepEqual(leaves(en).sort(), leaves(ar).sort())
  for (const dictionary of [en, ar]) {
    for (const key of leaves(dictionary)) assert.ok(key.split('.').reduce((value, part) => value[part], dictionary).trim())
  }
})

test('centralized milestone translations retain the LanguageContext English fallback', async () => {
  const { saved: _saved, ...milestones } = ar.childHealth.milestones
  const fallbackArabic = { ...ar, childHealth: { ...ar.childHealth, milestones } }
  const api = (await provider('ar', false, { ar: fallbackArabic })).render()
  assert.equal(api.t('childHealth.milestones.saved'), en.childHealth.milestones.saved)
  assert.equal(api.t('childHealth.milestones.title'), ar.childHealth.milestones.title)
})

test('milestone views resolve centralized copy for both languages, all ages, categories and save states', async () => {
  const { ageMedia, skillMedia } = await import('../src/components/child-health/milestoneMedia.js')
  const icons = Object.fromEntries(['Baby', 'Heart', 'MessageCircle', 'Brain', 'Footprints', 'ArrowLeft', 'ArrowRight', 'Info', 'Lightbulb', 'Sparkles', 'Blocks', 'Play', 'Pause', 'X', 'ZoomIn', 'Star', 'CircleCheck'].map(name => [name, name]))
  for (const [language, dictionary] of Object.entries({ en, ar })) {
    const api = (await provider(language)).render()
    const copy = dictionary.childHealth.milestones
    const translate = key => {
      const value = api.t(key)
      assert.notEqual(value, key, key)
      return value
    }
    for (const key of leaves(copy)) assert.equal(translate('childHealth.milestones.' + key), key.split('.').reduce((value, part) => value[part], copy))
    const observations = { records: {}, status: '', loadError: false, update() {}, retry() {} }
    for (const id of Object.keys(copy.skills)) observations.records[id] = { answer: 'yes', note: 'Untranslated parent note', updatedAt: '2026-01-01T12:00:00Z' }
    async function view() {
      const host = hookHost()
      const components = await loadComponent('../src/components/child-health/DevelopmentalMilestones.jsx', {
        ...runtime, _Fragment: jsx.Fragment, ...host, ...icons, ageMedia, skillMedia, ageFromBirthDate,
        useLanguage: () => ({ ...api, t: translate }),
        useEffect() {}, useRef: () => ({ current: null }), useId: () => 'milestones-test',
        useImperativeHandle() {}, useMilestonesStorage: () => observations,
        canonicalChildId: id => id, demoMotherId: 'demo-mother-sara',
        requestAnimationFrame() {}, createPortal: element => element, document: { body: {} },
      }, 'MilestoneSession, DoctorMilestones, DoctorNote, MilestonesPreview, MediaPreview, MilestoneVideo, ages')
      return { ...components, render(Component, props) { host.reset(); return Component(props) } }
    }
    const mother = await view(), doctor = await view()
    const props = { childId: 'demo-child-3', motherId: 'demo-mother-sara', child: { id: 'demo-child-3', name: 'Adam' }, currentAge: 4, stickyOffset: 0, role: 'mother', records: observations.records }
    const text = tree => {
      const collect = value => Array.isArray(value) ? value.map(collect).join(' ') : value && typeof value === 'object' ? collect(value.props?.children) : typeof value === 'string' || typeof value === 'number' ? String(value) : ''
      return collect(tree)
    }
    for (let index = 0; index < mother.ages.length; index++) {
      const age = mother.ages[index]
      const listing = mother.render(mother.MilestoneSession, props)
      assert.equal(listing.props.dir, language === 'ar' ? 'rtl' : 'ltr')
      assert.ok(nodes(listing).some(node => node.type === 'Star' && node.props.strokeWidth === 1.6))
      assert.ok(nodes(listing).some(node => node.type === 'h2' && node.props.children === copy.title))
      assert.ok(!nodes(listing).some(node => node.props.className === 'dm-hero' || node.props.href === '/mother'))
      const timelineNodes = nodes(listing).filter(node => node.props.className === 'dm-timeline-node')
      assert.equal(timelineNodes.length, 10)
      timelineNodes[index].props.onClick()
      const preview = mother.render(mother.MilestoneSession, props)
      assert.ok(!preview.props.className.includes('dm-details'))
      const stage = nodes(preview).find(node => node.props.className === 'dm-stage-preview')
      assert.ok(text(stage).includes(copy.ages[age.months]))
      nodes(preview).find(node => node.props.className === 'dm-stage-action').props.onClick()
      const details = mother.render(mother.MilestoneSession, props)
      assert.ok(nodes(details).some(node => node.type === 'h2' && node.props.children === copy.title))
      const detailText = text(details)
      for (const category of Object.values(copy.categories)) assert.ok(detailText.includes(category.title))
      for (const skill of age.sections.flat()) assert.ok(detailText.includes(copy.skills[skill.id].motherSentence || copy.skills[skill.id].title), skill.id)
      assert.ok(nodes(details).some(node => node.type === 'textarea' && node.props.value === 'Untranslated parent note'))
      assert.ok(nodes(details).some(node => node.type === 'textarea' && node.props.placeholder === copy.placeholder))
      nodes(details).find(node => node.props.className === 'dm-back').props.onClick()
      let doctorTree = doctor.render(doctor.DoctorMilestones, props)
      nodes(doctorTree).find(node => node.props.className === 'dd-ages').props.children[index].props.onClick()
      doctorTree = doctor.render(doctor.DoctorMilestones, props)
      assert.ok(nodes(doctorTree).some(node => node.type === 'Star'))
      assert.ok(!nodes(doctor.render(doctor.DoctorMilestones, { ...props, onBack() {} })).some(node => node.props.className === 'dd-back'))
      assert.equal(doctorTree.props.dir, language === 'ar' ? 'rtl' : 'ltr')
      for (const skill of age.sections.flat()) assert.ok(text(doctorTree).includes(copy.skills[skill.id].motherSentence || copy.skills[skill.id].title), skill.id)
      assert.ok(!nodes(doctorTree).some(node => node.type === 'textarea'))
    }
    for (const status of ['saving', 'saved', 'failed']) {
      observations.status = ''
      const statusView = await view()
      nodes(statusView.render(statusView.MilestoneSession, props)).find(node => node.props.className === 'dm-stage-action').props.onClick()
      observations.status = status
      assert.ok(text(statusView.render(statusView.MilestoneSession, props)).includes(copy.manualSave[status]))
    }
    observations.loadError = true
    assert.ok(text(mother.render(mother.MilestoneSession, props)).includes(copy.loadError))
    observations.loadError = false
    const previewToolbar = await view()
    assert.ok(text(previewToolbar.render(previewToolbar.MilestonesPreview, { onClose() {} })).includes(copy.preview))
    assert.ok(text(mother.render(mother.DoctorNote, { note: '', language })).includes(copy.doctorUi.noNotes))
    const modal = mother.render(mother.MediaPreview, { item: skillMedia['2m-social-smile'], label: 'Skill', onDismiss() {} })
    assert.ok(nodes(modal).some(node => node.props['aria-label'] === copy.mediaPlayer.close))
    const player = mother.render(mother.MilestoneVideo, { src: skillMedia['2m-social-smile'].mediaSrc, label: 'Skill' })
    assert.ok(nodes(player).some(node => node.props['aria-label'] === copy.mediaPlayer.play + ': Skill'))
  }
})

test('all existing route definitions still resolve to their original pages', async () => {
  const components = ['Home', 'MotherDashboard', 'MotherChildren', 'MotherAppointments', 'PortalBooking', 'MotherProfile', 'MotherSettings', 'Navigate', 'ChildOverview', 'DoctorDashboard', 'MotherLogin', 'DoctorLogin', 'MotherRegister', 'MotherLayout', 'MotherProtectedRoute', 'DoctorLayout', 'DoctorProtectedRoute', 'MotherPasswordRecovery']
  const { App } = await loadComponent('../src/App.jsx', {
    ...runtime, BrowserRouter: 'router', Routes: 'routes', Route: 'route',
    ...Object.fromEntries(components.map((name) => [name, name])),
  }, 'App')
  const routes = (children) => [children].flat().map((node) => ({
    path: node.props.path, index: node.props.index, element: node.props.element,
    ...(node.props.children ? { children: routes(node.props.children) } : {}),
  }))
  const config = routes(App().props.children.props.children)
  for (const path of ['/mother/appointments/demo-appointment-1/reschedule']) {
    const redirect = matchRoutes(config, path).at(-1).route.element.props
    assert.equal(redirect.to, '/mother/appointments')
    assert.equal(redirect.replace, true)
  }
  for (const [path, expected] of [
    ['/', 'Home'], ['/mother', 'MotherDashboard'], ['/doctor', 'DoctorDashboard'],
    ['/mother/children', 'MotherChildren'], ['/mother/appointments', 'MotherAppointments'],
    ['/mother/profile', 'MotherProfile'], ['/mother/settings', 'MotherSettings'],
    ['/mother/appointments/book', 'PortalBooking'], ['/mother/appointments/demo-appointment-1/reschedule', 'Navigate'],
    ['/mother/children/adam', 'ChildOverview'], ['/mother/children/lina/follow-up-visits', 'ChildOverview'],
    ['/mother/login', 'MotherLogin'], ['/doctor/login', 'DoctorLogin'], ['/mother/register', 'MotherRegister'],
    ['/mother/forgot-password', 'MotherPasswordRecovery'], ['/mother/verify-code', 'MotherPasswordRecovery'],
    ['/mother/new-password', 'MotherPasswordRecovery'], ['/mother/password-reset-success', 'MotherPasswordRecovery'],
  ]) assert.equal(matchRoutes(config, path).at(-1).route.element.type, expected)
})

test('English default, Arabic direction, persistence, reload, toggle and invalid values', async () => {
  const app = await provider()
  let api = app.render()
  assert.equal(api.language, 'en')
  assert.deepEqual(app.document.documentElement, { lang: 'en', dir: 'ltr' })
  assert.equal(api.t('common.home'), en.common.home)
  api.setLanguage('ar')
  api = app.render()
  assert.deepEqual(app.document.documentElement, { lang: 'ar', dir: 'rtl' })
  assert.equal(api.t('common.home'), ar.common.home)
  assert.equal(api.t('missing.key'), 'missing.key')
  assert.equal((await provider(app.storage.get('nomu.language'))).render().language, 'ar')
  api.setLanguage('invalid')
  assert.equal(app.render().language, 'ar')
  api.toggleLanguage()
  assert.equal(app.render().language, 'en')
  assert.deepEqual(app.document.documentElement, { lang: 'en', dir: 'ltr' })
  assert.equal((await provider('invalid')).render().language, 'en')
})

test('blocked storage does not prevent language switching; hook requires provider', async () => {
  const app = await provider(undefined, true)
  assert.throws(() => app.useLanguage(), /LanguageProvider/)
  app.render().setLanguage('ar')
  assert.equal(app.render().language, 'ar')
})

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  return [tree, ...nodes(tree.props?.children)]
}

test('shared switcher exposes active state and selects both languages', async () => {
  const app = await provider()
  let api = app.render()
  const { LanguageSwitcher } = await loadComponent('../src/components/common/LanguageSwitcher.jsx', {
    ...runtime, useLanguage: () => api,
  }, 'LanguageSwitcher')
  let tree = nodes(LanguageSwitcher())
  assert.equal(tree[0].props['aria-label'], en.common.language)
  assert.equal(tree.find((node) => node.props.lang === 'en').props['aria-pressed'], true)
  tree.find((node) => node.props.lang === 'ar').props.onClick()
  api = app.render(); tree = nodes(LanguageSwitcher())
  assert.equal(tree[0].props['aria-label'], ar.common.language)
  assert.equal(tree.find((node) => node.props.lang === 'ar').props['aria-pressed'], true)
  tree.find((node) => node.props.lang === 'en').props.onClick()
  assert.equal(app.render().language, 'en')
})

test('Mother Login translates active errors/status and preserves input and password behavior', async () => {
  const app = await provider()
  let api = app.render()
  const host = hookHost()
  const { MotherLogin } = await loadComponent('../src/pages/auth/MotherLogin.jsx', {
    ...runtime, ...host, loginMotherDemo: (id, password) => id === '1234567890' && password === 'Demo123!', useLanguage: () => api, useNavigate: () => () => {},
    Link: 'a', Button: 'button', Input: 'input', Card: 'article', LanguageSwitcher: 'switcher', LogoSymbol: 'logo-symbol', toddlerIllustration: '/toddler-illustration.png',
  }, 'MotherLogin')
  const render = () => { host.reset(); return nodes(MotherLogin()) }
  let tree = render()
  assert.equal(tree.find((node) => node.props.id === 'mother-login-title').props.children, en.mother.welcomeBack)
  let focused = false
  tree.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { elements: { nationalId: { focus() { focused = true } } } } })
  tree = render()
  assert.ok(focused)
  assert.equal(tree.find((node) => node.props.id === 'mother-national-id-error').props.children, en.auth.nationalIdRequired)
  api.setLanguage('ar'); api = app.render(); tree = render()
  assert.equal(tree.find((node) => node.props.id === 'mother-national-id-error').props.children, ar.auth.nationalIdRequired)
  assert.equal(tree.find((node) => node.props.id === 'mother-password-error').props.children, ar.auth.passwordRequired)
  assert.equal(tree.find((node) => node.props.id === 'mother-national-id').props.placeholder, ar.auth.nationalIdPlaceholder)
  for (const [name, value] of [['nationalId', 'test-id'], ['password', 'test-password']]) {
    render().find((node) => node.props.name === name).props.onChange({ target: { name, value } })
  }
  tree = render()
  tree.find((node) => node.props['aria-controls'] === 'mother-password').props.onClick()
  assert.equal(render().find((node) => node.props.id === 'mother-password').props.type, 'text')
  render().find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} })
  tree = render()
  assert.equal(tree.find((node) => node.props.role === 'status').props.children.props.children, ar.auth.demoInvalidCredentials)
  api.setLanguage('en'); api = app.render(); tree = render()
  assert.equal(tree.find((node) => node.props.role === 'status').props.children.props.children, en.auth.demoInvalidCredentials)
  assert.equal(tree.find((node) => node.props.name === 'nationalId').props.value, 'test-id')
  assert.deepEqual(tree.filter((node) => node.type === 'a').map((node) => node.props.to), ['/', '/mother/forgot-password', '/mother/register'])
})

test('Mother Registration retains validation, password toggles and demo submission in both languages', async () => {
  for (const dictionary of [en, ar]) {
    const host = hookHost()
    const t = key => key.split('.').reduce((value, part) => value[part], dictionary)
    const { MotherRegister } = await loadComponent('../src/pages/auth/MotherRegister.jsx', {
      ...runtime, ...host, useLanguage: () => ({ t }), Link: 'a', LanguageSwitcher: 'switcher', LogoSymbol: 'logo-symbol',
    }, 'MotherRegister')
    const render = () => { host.reset(); return nodes(MotherRegister()) }
    let tree = render()
    let focused = false
    tree.find(node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { elements: { fullName: { focus() { focused = true } } } } })
    assert.ok(focused)
    tree = render()
    assert.equal(tree.filter(node => node.props.role === 'alert').length, 5)
    const change = (name, value) => tree.find(node => node.type === 'input' && node.props.name === name).props.onChange({ target: { name, value } })
    for (const [name, value] of Object.entries({ fullName: 'Test Mother', email: 'mother@example.test', nationalId: 'test-id', password: 'test-password', confirmPassword: 'test-password' })) change(name, value)
    tree = render()
    for (const node of tree.filter(node => node.type === 'button' && node.props.type === 'button')) node.props.onClick()
    tree = render()
    assert.equal(tree.find(node => node.props.name === 'password').props.type, 'text')
    assert.equal(tree.find(node => node.props.name === 'confirmPassword').props.type, 'text')
    tree.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    tree = render()
    assert.equal(tree.find(node => node.props.role === 'status').props.children.props.children, dictionary.mother.registration.demoMessage)
    assert.equal(tree.find(node => node.props.name === 'fullName').props.value, '')
    assert.ok(tree.some(node => node.props.to === '/mother/login'))
    assert.ok(tree.some(node => node.props.to === '/'))
  }
})

test('Recovery validates input, stays unavailable, and guards success URLs in both languages', async () => {
  const { motherPasswordRecovery: recovery, validateRecovery } = await import('../src/services/motherPasswordRecovery.js')
  assert.equal(recovery.available, false)
  assert.deepEqual(validateRecovery('code', { code: '123' }), { code: 'codeInvalid' })
  assert.deepEqual(validateRecovery('password', { password: 'short', confirmPassword: 'different' }), { password: 'passwordShort', confirmPassword: 'passwordMismatch' })
  for (const dictionary of [en, ar]) {
    const host = hookHost()
    const navigation = []
    const t = key => key.split('.').reduce((value, part) => value[part], dictionary)
    const { MotherPasswordRecovery } = await loadComponent('../src/pages/auth/MotherPasswordRecovery.jsx', {
      ...runtime, ...host, useRef: () => ({ current: null }), useEffect: () => {}, useNavigate: () => (...args) => navigation.push(args),
      useLanguage: () => ({ t }), Link: 'a', Navigate: 'redirect', LanguageSwitcher: 'switcher', LogoSymbol: 'logo-symbol', recovery, validateRecovery,
    }, 'MotherPasswordRecovery')
    const render = step => { host.reset(); return nodes(MotherPasswordRecovery({ step })) }
    let tree = render('email')
    let focused = false
    await tree.find(node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { elements: { email: { focus() { focused = true } } } } })
    assert.ok(focused)
    tree = render('email')
    assert.equal(tree.find(node => node.props.role === 'alert').props.children, dictionary.mother.recovery.emailInvalid)
    tree.find(node => node.props.name === 'email').props.onChange({ target: { name: 'email', value: 'mother@example.test' } })
    tree = render('email')
    await tree.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    tree = render('email')
    assert.equal(navigation.length, 0)
    assert.equal(tree.find(node => node.props.role === 'status').props.children.props.children, dictionary.mother.recovery.unavailableShort)
    assert.ok(tree.some(node => node.props.to === '/mother/login'))
    assert.ok(render('success').some(node => node.type === 'redirect' && node.props.to === '/mother/forgot-password'))
  }
})

test('Mother demo login accepts only the exact fictional credentials and navigates to the dashboard', async () => {
  for (const dictionary of [en, ar]) {
    const host = hookHost()
    const navigation = []
    const t = key => key.split('.').reduce((value, part) => value[part], dictionary)
    const { MotherLogin } = await loadComponent('../src/pages/auth/MotherLogin.jsx', {
      ...runtime, ...host, loginMotherDemo: (id, password) => id === '1234567890' && password === 'Demo123!', useLanguage: () => ({ t }), useNavigate: () => (...args) => navigation.push(args),
      Link: 'a', LanguageSwitcher: 'switcher', LogoSymbol: 'logo-symbol', toddlerIllustration: '/toddler.png',
    }, 'MotherLogin')
    const render = () => { host.reset(); return nodes(MotherLogin()) }
    const change = (name, value) => render().find(node => node.type === 'input' && node.props.name === name).props.onChange({ target: { name, value } })
    const submit = () => render().find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    let focused = ''
    render().find(node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { elements: { nationalId: { focus() { focused = 'nationalId' } } } } })
    assert.equal(focused, 'nationalId')
    assert.equal(render().filter(node => node.props.role === 'alert').length, 2)
    assert.equal(navigation.length, 0)
    for (const [nationalId, password] of [['wrong', 'Demo123!'], ['1234567890', 'wrong'], ['wrong', 'wrong'], ['1234567890', 'Demo123! ']]) {
      change('nationalId', nationalId)
      change('password', password)
      submit()
      assert.equal(navigation.length, 0)
      assert.equal(render().find(node => node.props.role === 'status').props.children.props.children, dictionary.auth.demoInvalidCredentials)
    }
    change('nationalId', '1234567890')
    change('password', 'Demo123!')
    assert.equal(render().find(node => node.props.role === 'status').props.children, '')
    submit()
    assert.deepEqual(navigation, [['/mother', { replace: true }]])
  }
})
