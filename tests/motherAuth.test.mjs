import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import { createMemoryRouter, matchRoutes } from 'react-router-dom'
import { createMotherDemoAuth, isMotherAuthenticated, loginMotherDemo, logoutMotherDemo, motherAuthChanged, motherAuthKey, subscribeMotherAuth } from '../src/services/motherDemoAuth.js'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'

const runtime = { _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment }
async function load(path, bindings, name) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, path)
  code = code.replace(/^import .*;?\r?\n/gm, '').replace(/export default /g, '').replace(/export /g, '')
  return new Function(...Object.keys(bindings), code + `\nreturn ${name}`)(...Object.values(bindings))
}
function storage() {
  const data = new Map()
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
}
const privatePaths = ['/mother', '/mother/', '/mother/children', '/mother/appointments', '/mother/profile', '/mother/settings', '/mother/children/adam', '/mother/children/lina/follow-up-visits', '/mother/children/adam/growth-chart', '/mother/appointments/book', '/mother/appointments/any/reschedule']

test('demo login preserves exact credentials and logout removes only the auth flag, surviving a fresh store instance', () => {
  const db = storage(), auth = createMotherDemoAuth(db)
  for (const [key, value] of [['nomu.language', 'ar'], ['nomu.demo.confirmedBookings.v1', '[bookings]'], ['nomu.demo.parentingTip.session.v1', 'sleep-1'], ['nomu.demo.parentingTip.last.v1', 'sleep-1'], ['children', '[children]']]) db.setItem(key, value)
  const original = new Map(db.data)
  assert.equal(auth.isAuthenticated(), false)
  for (const [id, password] of [['wrong', 'Demo123!'], ['1234567890', 'wrong'], ['1234567890', 'Demo123! '], ['', '']]) {
    assert.equal(auth.login(id, password), false)
    assert.equal(auth.isAuthenticated(), false)
  }
  assert.equal(auth.login('1234567890', 'Demo123!'), true)
  assert.equal(db.getItem(motherAuthKey), 'demo-mother-sara')
  assert.equal(createMotherDemoAuth(db).isAuthenticated(), true)
  auth.logout()
  assert.equal(auth.isAuthenticated(), false)
  assert.equal(createMotherDemoAuth(db).isAuthenticated(), false)
  assert.deepEqual(db.data, original)
  assert.equal(auth.login('1234567890', 'Demo123!'), true)
  assert.equal(auth.isAuthenticated(), true)
})

test('corrupt or inaccessible auth storage denies access; blocked storage supports only an in-memory demo session', () => {
  const db = storage()
  for (const value of ['true', 'false', '1', '{}']) {
    db.setItem(motherAuthKey, value)
    assert.equal(createMotherDemoAuth(db).isAuthenticated(), false)
  }
  const blocked = { getItem() { throw Error() }, setItem() { throw Error() }, removeItem() { throw Error() } }
  const auth = createMotherDemoAuth(blocked)
  assert.equal(auth.isAuthenticated(), false)
  auth.login('1234567890', 'Demo123!')
  assert.equal(auth.isAuthenticated(), true)
  assert.equal(createMotherDemoAuth(blocked).isAuthenticated(), false)
  auth.logout()
  assert.equal(auth.isAuthenticated(), false)
})

async function routeSetup(auth) {
  const Protected = await load('../src/components/mother/MotherProtectedRoute.jsx', {
    ...runtime, Navigate: 'redirect', useSyncExternalStore: (_subscribe, snapshot) => snapshot(), subscribeMotherAuth() {}, isMotherAuthenticated: () => auth.isAuthenticated(),
  }, 'MotherProtectedRoute')
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const names = [...source.matchAll(/import (\w+) from/g)].map(match => match[1])
  const App = await load('../src/App.jsx', { ...runtime, BrowserRouter: 'router', Routes: 'routes', Route: 'route', Navigate: 'redirect', ...Object.fromEntries(names.map(name => [name, name === 'MotherProtectedRoute' ? Protected : name])) }, 'App')
  const routes = children => [children].flat().map(node => ({ path: node.props.path, index: node.props.index, element: node.props.element, ...(node.props.children ? { children: routes(node.props.children) } : {}) }))
  return { Protected, routes: routes(App().props.children.props.children) }
}

test('every private route has the shared guard; logged-out checks return only a replacement redirect', async () => {
  const db = storage(), auth = createMotherDemoAuth(db)
  const { Protected, routes } = await routeSetup(auth)
  for (const path of privatePaths) {
    const matches = matchRoutes(routes, path)
    const protectedRoute = matches.find(match => match.route.element?.type === Protected)
    assert.ok(protectedRoute, path)
    const result = Protected(protectedRoute.route.element.props)
    assert.equal(result.type, 'redirect', path)
    assert.equal(result.props.to, '/mother/login')
    assert.equal(result.props.replace, true)
    assert.equal(result.props.children, undefined)
  }
  for (const path of ['/', '/doctor', '/doctor/login', '/mother/login', '/mother/register', '/mother/forgot-password', '/mother/verify-code', '/mother/new-password', '/mother/password-reset-success']) assert.ok(!matchRoutes(routes, path).some(match => match.route.element?.type === Protected), path)
  auth.login('1234567890', 'Demo123!')
  for (const path of privatePaths) {
    const guarded = matchRoutes(routes, path).find(match => match.route.element?.type === Protected)
    assert.equal(Protected(guarded.route.element.props), guarded.route.element.props.children)
  }
})

test('real router Back/Forward history, direct child URLs and refresh cannot bypass logout; login again restores access', async () => {
  const db = storage(), auth = createMotherDemoAuth(db)
  const { Protected, routes } = await routeSetup(auth)
  const router = createMemoryRouter(routes, { initialEntries: ['/mother/login'] })
  const evaluate = () => {
    const guarded = router.state.matches.find(match => match.route.element?.type === Protected)
    return guarded ? Protected(guarded.route.element.props) : null
  }
  try {
    auth.login('1234567890', 'Demo123!')
    await router.navigate('/mother', { replace: true })
    assert.notEqual(evaluate()?.type, 'redirect')
    await router.navigate('/mother/children/adam')
    await router.navigate('/mother/appointments')
    const handleLogout = await load('../src/hooks/useMotherLogout.js', { useNavigate: () => (to, options) => router.navigate(to, options), logoutMotherDemo: () => auth.logout() }, 'useMotherLogout')
    handleLogout()({ preventDefault() {} })
    assert.equal(router.state.location.pathname, '/mother/login')
    assert.equal(router.state.historyAction, 'PUSH')
    await router.navigate(-1)
    assert.equal(router.state.location.pathname, '/')
    assert.equal(evaluate(), null)
    await router.navigate(-1)
    assert.equal(evaluate().type, 'redirect')
    await router.navigate(1)
    assert.equal(router.state.location.pathname, '/')
    assert.equal(evaluate(), null)
    for (const path of ['/mother', '/mother/children/lina/follow-up-visits']) {
      await router.navigate(path)
      const result = evaluate()
      assert.equal(result.type, 'redirect')
      await router.navigate(result.props.to, { replace: result.props.replace })
      assert.equal(router.state.location.pathname, '/mother/login')
    }
    assert.equal(createMotherDemoAuth(db).isAuthenticated(), false)
    auth.login('1234567890', 'Demo123!')
    for (const path of privatePaths) {
      await router.navigate(path)
      assert.notEqual(evaluate()?.type, 'redirect')
    }
  } finally { router.dispose() }
})

test('shared Logout action replaces the private entry with Landing, revokes auth, and pushes Login exactly once', async () => {
  const calls = []
  const useLogout = await load('../src/hooks/useMotherLogout.js', { useNavigate: () => (...args) => calls.push(['navigate', ...args]), logoutMotherDemo: () => calls.push(['logout']) }, 'useMotherLogout')
  useLogout()({ preventDefault() { calls.push(['preventDefault']) } })
  assert.deepEqual(calls, [['preventDefault'], ['navigate', '/', { replace: true }], ['logout'], ['navigate', '/mother/login']])
})

test('exact public-to-portal flow returns directly to Landing with one Back after Logout', async () => {
  for (const returnWithBack of [true, false]) {
    const db = storage(), auth = createMotherDemoAuth(db)
    db.setItem('nomu.language', 'ar')
    db.setItem('nomu.demo.confirmedBookings.v1', '[existing bookings]')
    db.setItem('nomu.demo.parentingTip.session.v1', 'sleep-1')
    const preserved = new Map(db.data)
    const { Protected, routes } = await routeSetup(auth)
    const router = createMemoryRouter(routes, { initialEntries: ['/'] })
    let redirects = 0
    const applyGuard = async () => {
      const match = router.state.matches.find(match => match.route.element?.type === Protected)
      if (!match) return
      const result = Protected(match.route.element.props)
      if (result.type === 'redirect') {
        assert.equal(result.props.to, '/mother/login')
        assert.equal(result.props.replace, true)
        assert.equal(result.props.children, undefined)
        redirects++
        await router.navigate(result.props.to, { replace: result.props.replace })
        assert.equal(router.state.historyAction, 'REPLACE')
        assert.ok(!router.state.matches.some(match => match.route.element?.type === Protected))
      }
    }
    try {
      await router.navigate('/mother/login')
      assert.equal(auth.login('1234567890', 'Demo123!'), true)
      await router.navigate('/mother', { replace: true })
      await router.navigate('/mother/children')
      await router.navigate('/mother/appointments')
      if (returnWithBack) await router.navigate(-1)
      else await router.navigate('/mother/children')
      assert.equal(router.state.location.pathname, '/mother/children')
      const useLogout = await load('../src/hooks/useMotherLogout.js', { useNavigate: () => (to, options) => router.navigate(to, options), logoutMotherDemo: () => auth.logout() }, 'useMotherLogout')
      useLogout()({ preventDefault() {} })
      assert.equal(router.state.location.pathname, '/mother/login')
      assert.equal(router.state.historyAction, 'PUSH')
      assert.deepEqual(db.data, preserved)
      await router.navigate(-1)
      await applyGuard()
      assert.equal(router.state.location.pathname, '/')
      assert.equal(redirects, 0)
      await router.navigate(1)
      await applyGuard()
      assert.equal(router.state.location.pathname, '/mother/login')
      assert.equal(auth.isAuthenticated(), false)
      assert.ok(!router.state.matches.some(match => match.route.element?.type === Protected))
      // Older private entries may remain deeper in history, but cannot render after logout.
      await router.navigate(-2)
      await applyGuard()
      assert.equal(router.state.location.pathname, '/mother/login')
      assert.equal(redirects, 1)
      await router.navigate('/')
      assert.equal(router.state.location.pathname, '/')
      await router.navigate('/mother/login')
      auth.login('1234567890', 'Demo123!')
      await router.navigate('/mother', { replace: true })
      await router.navigate('/mother/children')
      await router.navigate('/mother/appointments')
      await router.navigate(-1)
      assert.equal(router.state.location.pathname, '/mother/children')
      await router.navigate(1)
      assert.equal(router.state.location.pathname, '/mother/appointments')
      assert.equal(auth.isAuthenticated(), true)
    } finally { router.dispose() }
  }
})

test('Login already exposes a public Home link and direct logged-out private loads replace to Login', async () => {
  const Login = await load('../src/pages/auth/MotherLogin.jsx', {
    ...runtime, useState: initial => [initial, () => {}], useLanguage: () => ({ t: key => key }), useNavigate: () => () => {}, loginMotherDemo() {}, Link: 'a', LanguageSwitcher: 'switcher', LogoSymbol: 'logo', toddlerIllustration: '/toddler.png',
  }, 'MotherLogin')
  const nodes = (node, result = []) => { if (Array.isArray(node)) { node.forEach(child => nodes(child, result)); return result } if (!node || typeof node !== 'object') return result; result.push(node); nodes(node.props?.children, result); return result }
  assert.equal(nodes(Login()).find(node => node.props?.className === 'mother-login__brand').props.to, '/')
  const db = storage()
  for (const path of privatePaths) {
    const auth = createMotherDemoAuth(db)
    const { Protected, routes } = await routeSetup(auth)
    const router = createMemoryRouter(routes, { initialEntries: [path] })
    try {
      const match = router.state.matches.find(match => match.route.element?.type === Protected)
      const result = Protected(match.route.element.props)
      assert.equal(result.type, 'redirect')
      await router.navigate(result.props.to, { replace: result.props.replace })
      assert.equal(router.state.location.pathname, '/mother/login')
      assert.equal(router.state.historyAction, 'REPLACE')
    } finally { router.dispose() }
  }
})

test('the public logout boundary also works for direct entry, refresh, and repeated login/logout cycles', async () => {
  const db = storage(), auth = createMotherDemoAuth(db)
  const { Protected, routes } = await routeSetup(auth)
  const router = createMemoryRouter(routes, { initialEntries: ['/mother/login'] })
  const useLogout = await load('../src/hooks/useMotherLogout.js', { useNavigate: () => (to, options) => router.navigate(to, options), logoutMotherDemo: () => auth.logout() }, 'useMotherLogout')
  try {
    for (let cycle = 0; cycle < 3; cycle++) {
      auth.login('1234567890', 'Demo123!')
      await router.navigate('/mother', { replace: true })
      await router.navigate('/mother/children')
      await router.navigate('/mother/appointments')
      assert.equal(createMotherDemoAuth(db).isAuthenticated(), true)
      useLogout()({ preventDefault() {} })
      assert.equal(router.state.location.pathname, '/mother/login')
      assert.equal(createMotherDemoAuth(db).isAuthenticated(), false)
      await router.navigate(-1)
      assert.equal(router.state.location.pathname, '/')
      assert.ok(!router.state.matches.some(match => match.route.element?.type === Protected))
      await router.navigate(1)
      assert.equal(router.state.location.pathname, '/mother/login')
    }
  } finally { router.dispose() }
})

test('the real Login handler authenticates the same store used by the guard, without changing English/Arabic errors', async () => {
  for (const dictionary of [en, ar]) {
    const auth = createMotherDemoAuth(storage()), state = [], navigation = []
    let cursor = 0
    const t = key => key.split('.').reduce((value, part) => value[part], dictionary)
    const Login = await load('../src/pages/auth/MotherLogin.jsx', {
      ...runtime, useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next }] },
      useLanguage: () => ({ t }), useNavigate: () => (...args) => navigation.push(args), loginMotherDemo: (id, password) => auth.login(id, password), Link: 'a', LanguageSwitcher: 'switcher', LogoSymbol: 'logo', toddlerIllustration: '/toddler.png',
    }, 'MotherLogin')
    const nodes = (node, result = []) => { if (Array.isArray(node)) { node.forEach(child => nodes(child, result)); return result } if (!node || typeof node !== 'object') return result; result.push(node); nodes(node.props?.children, result); return result }
    const render = () => { cursor = 0; return nodes(Login()) }
    const change = (name, value) => render().find(node => node.type === 'input' && node.props.name === name).props.onChange({ target: { name, value } })
    const submit = () => render().find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    change('nationalId', '1234567890'); change('password', 'incorrect'); submit()
    assert.equal(auth.isAuthenticated(), false)
    assert.equal(navigation.length, 0)
    assert.equal(render().find(node => node.props.role === 'status').props.children.props.children, dictionary.auth.demoInvalidCredentials)
    change('password', 'Demo123!'); submit()
    assert.equal(auth.isAuthenticated(), true)
    assert.deepEqual(navigation, [['/mother', { replace: true }]])
    const { Protected } = await routeSetup(auth)
    assert.equal(Protected({ children: 'private-content' }), 'private-content')
    auth.logout()
    assert.equal(Protected({ children: 'private-content' }).type, 'redirect')
  }
})

test('shared subscriptions recheck auth on history changes, page restoration, storage changes and focus', () => {
  const originalWindow = globalThis.window, listeners = new Map(), db = storage()
  globalThis.window = {
    sessionStorage: db,
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: name => listeners.delete(name),
    dispatchEvent: event => listeners.get(event.type)?.(event),
  }
  try {
    logoutMotherDemo()
    const snapshots = []
    const unsubscribe = subscribeMotherAuth(() => snapshots.push(isMotherAuthenticated()))
    loginMotherDemo('1234567890', 'Demo123!')
    assert.equal(snapshots.at(-1), true)
    db.removeItem(motherAuthKey)
    for (const event of ['popstate', 'pageshow', 'focus']) {
      listeners.get(event)()
      assert.equal(snapshots.at(-1), false)
    }
    const count = snapshots.length
    listeners.get('storage')({ key: 'nomu.language' })
    assert.equal(snapshots.length, count)
    listeners.get('storage')({ key: motherAuthKey })
    assert.equal(snapshots.length, count + 1)
    loginMotherDemo('1234567890', 'Demo123!')
    logoutMotherDemo()
    assert.equal(snapshots.at(-1), false)
    assert.ok(listeners.has(motherAuthChanged))
    unsubscribe()
    assert.equal(listeners.size, 0)
  } finally { globalThis.window = originalWindow }
})
