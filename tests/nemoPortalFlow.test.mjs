import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import { loginNemoPortal, registerNemoParent } from '../src/services/nemoPortalFlow.js'
import { createUnifiedDemoAuth } from '../src/services/unifiedDemoAuth.js'
import { createMotherDemoAuth } from '../src/services/motherDemoAuth.js'
import { createDoctorDemoAuth } from '../src/services/doctorDemoAuth.js'
import { registerParentDemo, readParentAccounts } from '../src/services/parentDemoAccounts.js'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'

function fixture() {
  const data = new Map([['medical-record', 'unchanged']])
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
  const unified = createUnifiedDemoAuth(storage, webcrypto)
  const mother = createMotherDemoAuth(storage), doctor = createDoctorDemoAuth(storage)
  return { data, storage, auth: {
    loginUnifiedDemo: (id, password) => unified.login(id, password), logoutUnifiedDemo: () => unified.logout(),
    loginMotherDemo: (id, password) => mother.login(id, password), loginDoctorDemo: (id, password) => doctor.login(id, password),
  }, unified }
}

test('portal logins preserve unified roles, nurse access, exact legacy credentials, and wrong-portal denial', async () => {
  const { auth, unified, data } = fixture()
  for (const [portal, id, target] of [['parent', '3000000001', '/mother'], ['parent', '4000000001', '/mother'], ['doctor', '1000000001', '/doctor'], ['doctor', '2000000001', '/doctor']]) {
    assert.equal((await loginNemoPortal(portal, id, 'Demo@1234', auth)).dashboard, target)
  }
  assert.ok((await loginNemoPortal('parent', '1000000001', 'Demo@1234', auth)).error)
  assert.equal(unified.getUser(), null)
  assert.ok((await loginNemoPortal('doctor', '3000000001', 'Demo@1234', auth)).error)
  assert.equal((await loginNemoPortal('parent', '1234567890', 'Demo123!', auth)).dashboard, '/mother')
  assert.equal((await loginNemoPortal('doctor', '9876543210', 'Doctor123!', auth)).dashboard, '/doctor')
  assert.ok((await loginNemoPortal('parent', '1234567890', 'wrong', auth)).error)
  assert.equal(data.get('medical-record'), 'unchanged')
})

test('five-field registration saves normalized phone and salted password, retains family isolation, and preserves old records', async () => {
  const { storage, auth, unified, data } = fixture()
  const register = values => registerParentDemo(values, storage, webcrypto)
  const values = { nationalId: '4000000062', fullName: 'Demo Parent', email: 'nemo-parent@example.test', password: 'Fictional@123', phone: '+962 (79) 123-4567' }
  assert.ok((await registerNemoParent({ ...values, phone: '' }, register)).errors.phone)
  assert.ok((await registerNemoParent({ ...values, phone: 'wrong' }, register)).errors.phone)
  assert.ok((await registerNemoParent({ ...values, email: 'bad' }, register)).errors.email)
  assert.ok((await registerNemoParent({ ...values, password: 'short' }, register)).errors.password)
  assert.equal((await registerNemoParent(values, register)).success, true)
  const [record] = readParentAccounts(storage)
  assert.equal(record.phone, '+962791234567'); assert.equal(record.role, 'father')
  assert.equal(record.password, undefined); assert.ok(record.hash); assert.ok(record.salt)
  assert.equal((await loginNemoPortal('parent', values.nationalId, values.password, auth)).dashboard, '/mother')
  assert.equal(unified.getUser().familyScope, null)
  assert.ok((await registerNemoParent(values, register)).errors.nationalId)
  assert.equal((await registerParentDemo({ ...values, nationalId: '3000000063', email: 'old@example.test', role: 'mother', confirmPassword: values.password, phone: undefined }, storage, webcrypto)).success, true)
  assert.equal(readParentAccounts(storage)[1].phone, undefined)
  assert.equal(data.get('medical-record'), 'unchanged')
})

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined
  if (predicate(node)) return node
  return [node.props?.children].flat(Infinity).map(child => find(child, predicate)).find(Boolean)
}
function all(node, predicate) {
  if (!node || typeof node !== 'object') return []
  return [...(predicate(node) ? [node] : []), ...[node.props?.children].flat(Infinity).flatMap(child => all(child, predicate))]
}

async function formHost(audience, language = 'en') {
  const slots = [], effects = [], calls = [], routes = []
  let cursor = 0
  const t = key => key.split('.').reduce((value, part) => value?.[part], language === 'ar' ? ar : en) ?? key
  const bindings = {
    _jsx: jsx.jsx, _jsxs: jsx.jsxs,
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }] },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useEffect: effect => effects.push(effect), useLanguage: () => ({ t }), useNavigate: () => value => routes.push(value),
    loginNemoPortal: async (...args) => { calls.push(['login', ...args]); return { dashboard: '/mother' } },
    registerNemoParent: async values => { calls.push(['register', { ...values }]); return { success: true } },
    ArrowDown: 'down', ArrowLeft: 'back', Eye: 'eye', EyeOff: 'hidden-eye', Users: 'parent-icon', Stethoscope: 'doctor-icon',
    window: { matchMedia: () => ({ matches: true }), setTimeout: callback => { callback(); return 1 }, clearTimeout() {} },
  }
  let { code } = await transformWithOxc(readFileSync(new URL('../src/components/common/NemoAuthScreen.jsx', import.meta.url), 'utf8'), 'NemoAuthScreen.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace('export default ', '')
  const Component = new Function(...Object.keys(bindings), `${code}; return NemoAuthScreen`)(...Object.values(bindings))
  return { calls, routes, t, render() { cursor = 0; const tree = Component({ audience }); effects.splice(0).forEach(effect => effect()); return tree } }
}

for (const language of ['en', 'ar']) {
  test(`${language}: parent modes have exactly the requested fields, localized errors, and successful signup returns to login`, async () => {
    const host = await formHost('parent', language)
    let tree = host.render()
    assert.deepEqual(all(tree, n => n.type === 'input').map(n => n.props.name), ['nationalId', 'password'])
    await find(tree, n => n.type === 'form').props.onSubmit({ preventDefault() {} })
    tree = host.render()
    assert.equal(all(tree, n => n.props?.role === 'alert').length, 2)
    find(tree, n => n.type === 'button' && n.props.children === host.t('home.nemoAuth.signup')).props.onClick()
    tree = host.render()
    assert.deepEqual(all(tree, n => n.type === 'input').map(n => n.props.name), ['nationalId', 'fullName', 'email', 'password', 'phone'])
    const values = { nationalId: '3000000071', fullName: 'Test Parent', email: 'test@example.test', password: 'Fictional@123', phone: '+962791234567' }
    all(tree, n => n.type === 'input').forEach(input => input.props.onChange({ target: { value: values[input.props.name] } }))
    tree = host.render()
    await find(tree, n => n.type === 'form').props.onSubmit({ preventDefault() {} })
    tree = host.render()
    assert.equal(host.calls[0][0], 'register')
    assert.equal(find(tree, n => n.props?.role === 'status').props.children, host.t('parentRegistration.success'))
    assert.deepEqual(all(tree, n => n.type === 'input').map(n => n.props.name), ['nationalId', 'password'])
    assert.equal(find(tree, n => n.type === 'input' && n.props.name === 'password').props.value, '')
  })
  test(`${language}: doctor is login-only, with a Doctor ID label and accessible password toggle`, async () => {
    const host = await formHost('doctor', language)
    let tree = host.render()
    assert.equal(find(tree, n => n.props?.className === 'nemo-auth__modes'), undefined)
    assert.deepEqual(all(tree, n => n.type === 'input').map(n => n.props.name), ['nationalId', 'password'])
    assert.ok(all(tree, n => n.type === 'label').some(n => n.props.children === host.t('home.nemoAuth.doctorId')))
    find(tree, n => n.props?.className === 'nemo-auth__visibility').props.onClick()
    tree = host.render()
    assert.equal(find(tree, n => n.type === 'input' && n.props.name === 'password').props.type, 'text')
    all(tree, n => n.type === 'input').forEach(input => input.props.onChange({ target: { value: input.props.name === 'password' ? 'Demo@1234' : '1000000001' } }))
    tree = host.render()
    await find(tree, n => n.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.equal(host.calls[0][0], 'login'); assert.equal(host.calls[0][1], 'doctor')
  })
}
