import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import { createMotherDemoAuth } from '../src/services/motherDemoAuth.js'
import { createDoctorDemoAuth } from '../src/services/doctorDemoAuth.js'

function store() {
  const values = new Map([['medical-record', 'preserved']])
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}

test('parent logout revokes the session and returns to the new parent entry without changing medical data', () => {
  const storage = store(), auth = createMotherDemoAuth(storage), calls = []
  auth.login('1234567890', 'Demo123!')
  const source = readFileSync(new URL('../src/hooks/useMotherLogout.js', import.meta.url), 'utf8')
    .replace(/^import .*\r?\n/gm, '').replace('export default ', '')
  const hook = new Function('useNavigate', 'logoutMotherDemo', `${source}; return useMotherLogout`)(
    () => (path, options) => calls.push({ path, options }), () => auth.logout())
  let prevented = false
  hook()({ preventDefault() { prevented = true } })
  assert.equal(prevented, true)
  assert.equal(auth.isAuthenticated(), false)
  assert.deepEqual(calls, [{ path: '/', options: { replace: true } }, { path: '/mother/login', options: undefined }])
  assert.equal(storage.getItem('medical-record'), 'preserved')
})

test('doctor logout revokes the session and returns to the new doctor entry', () => {
  const storage = store(), auth = createDoctorDemoAuth(storage), calls = []
  auth.login('9876543210', 'Doctor123!')
  const source = readFileSync(new URL('../src/pages/doctor/DoctorDashboard.jsx', import.meta.url), 'utf8')
  const handler = source.match(/function logout\(\) \{([\s\S]*?)\n  \}/)[1]
  new Function('logoutDoctorDemo', 'navigate', handler)(() => auth.logout(), (path, options) => calls.push({ path, options }))
  assert.equal(auth.isAuthenticated(), false)
  assert.deepEqual(calls, [{ path: '/doctor/login', options: { replace: true } }])
  assert.equal(storage.getItem('medical-record'), 'preserved')
})

test('all public login routes render Nemo instead of an older login interface', async () => {
  const source = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const names = [...source.matchAll(/^import (\w+) from/gm)].map(match => match[1])
  const bindings = { _jsx: jsx.jsx, _jsxs: jsx.jsxs, BrowserRouter: 'router', Navigate: 'redirect', Route: 'route', Routes: 'routes', ...Object.fromEntries(names.map(name => [name, name])) }
  let { code } = await transformWithOxc(source, 'App.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace('export default ', '')
  const App = new Function(...Object.keys(bindings), `${code}; return App`)(...Object.values(bindings))
  const routes = App().props.children.props.children
  const lookup = path => routes.find(route => route.props.path === path).props.element
  for (const path of ['/login', '/mother/login', '/doctor/login']) assert.equal(lookup(path).type, 'Home')
  assert.equal(lookup('/login').props.initialPortalOpen, true)
  assert.equal(lookup('/mother/login').props.initialAudience, 'parent')
  assert.equal(lookup('/doctor/login').props.initialAudience, 'doctor')
  assert.ok(!source.includes('Home loginMode'))
})
