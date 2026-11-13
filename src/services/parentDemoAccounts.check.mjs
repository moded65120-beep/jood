import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { readParentAccounts, registerParentDemo, parentAccountsKey } from './parentDemoAccounts.js'
import { createUnifiedDemoAuth } from './unifiedDemoAuth.js'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import en from '../locales/en/translations.js'
import ar from '../locales/ar/translations.js'

const data = new Map([['medical-data', 'preserved']])
const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
const values = { role: 'mother', fullName: 'والدة تجريبية', email: 'parent@example.test', nationalId: '3000000042', password: 'Fictional@123', confirmPassword: 'Fictional@123' }
assert.ok((await registerParentDemo({ ...values, role: 'doctor', nationalId: '1000000042' }, storage, webcrypto)).errors.role)
assert.ok((await registerParentDemo({ ...values, role: 'nurse', nationalId: '2000000042' }, storage, webcrypto)).errors.role)
assert.ok((await registerParentDemo({ ...values, nationalId: '4000000042' }, storage, webcrypto)).errors.nationalId)
assert.ok((await registerParentDemo({ ...values, email: 'invalid', password: 'short', confirmPassword: 'different' }, storage, webcrypto)).errors.email)
assert.ok((await registerParentDemo({ ...values, confirmPassword: 'different' }, storage, webcrypto)).errors.confirmPassword)
assert.ok((await registerParentDemo({ ...values, nationalId: '3000000001' }, storage, webcrypto)).errors.nationalId)
assert.equal((await registerParentDemo(values, storage, webcrypto)).success, true)
assert.ok((await registerParentDemo(values, storage, webcrypto)).errors.nationalId)
assert.ok((await registerParentDemo({ ...values, nationalId: '3000000043', email: 'PARENT@EXAMPLE.TEST' }, storage, webcrypto)).errors.email)
assert.equal((await registerParentDemo({ ...values, role: 'father', email: 'father@example.test', nationalId: '4000000042' }, storage, webcrypto)).success, true)
assert.equal(readParentAccounts(storage).length, 2)
assert.ok(!data.get(parentAccountsKey).includes(values.password))
const auth = createUnifiedDemoAuth(storage, webcrypto)
for (const [id, role] of [['3000000042', 'mother'], ['4000000042', 'father']]) {
  const user = await auth.login(id, values.password)
  assert.equal(user.role, role); assert.equal(user.dashboard, '/mother'); assert.equal(user.familyScope, null)
  assert.equal(user.accountSource, 'registration'); assert.equal(user.homePresentation, 'parent')
  assert.equal(createUnifiedDemoAuth(storage, webcrypto).getUser().id, id)
  assert.equal(await auth.login(id, 'Demo@1234'), null, 'Built-in password does not authenticate registered accounts')
  assert.equal(await auth.login(id, 'wrong'), null)
}
assert.equal(data.get('medical-data'), 'preserved')
const previous = data.get(parentAccountsKey)
data.set(parentAccountsKey, '{invalid')
assert.ok((await registerParentDemo(values, storage, webcrypto)).errors.form)
assert.equal(data.get(parentAccountsKey), '{invalid', 'Invalid storage is never silently overwritten')
data.set(parentAccountsKey, previous)
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
const originalWindow = globalThis.window
try {
  const { LanguageProvider } = await server.ssrLoadModule('/src/contexts/LanguageContext.jsx')
  const { default: Register } = await server.ssrLoadModule('/src/pages/auth/MotherRegister.jsx')
  const { default: Login } = await server.ssrLoadModule('/src/components/common/UnifiedLoginForm.jsx')
  for (const [language, dictionary] of Object.entries({ en, ar })) {
    globalThis.window = { localStorage: { getItem: () => language } }
    const render = component => renderToStaticMarkup(createElement(LanguageProvider, null, createElement(MemoryRouter, { initialEntries: [{ pathname: '/login', state: { parentRegistered: true } }] }, createElement(component))))
    const html = render(Register)
    assert.ok(html.includes('value="mother"')); assert.ok(html.includes('value="father"'))
    assert.ok(!html.includes('value="doctor"')); assert.ok(!html.includes('value="nurse"'))
    assert.ok(html.includes('href="/login"'))
    assert.ok(html.includes(`dir="${language === 'ar' ? 'rtl' : 'ltr'}"`))
    assert.ok(html.includes(dictionary.parentRegistration.notice))
    assert.ok(render(Login).includes(dictionary.parentRegistration.success))
  }
  assert.deepEqual(Object.keys(en.parentRegistration), Object.keys(ar.parentRegistration))
  const layout = readFileSync(new URL('../layouts/MotherLayout.jsx', import.meta.url), 'utf8')
  assert.ok(layout.includes('const hasDemoFamily = parentFamilyScope(authenticatedUser) === demoMotherId'))
  assert.ok(layout.includes('{hasDemoFamily && <MotherNotifications/>}'))
  assert.ok(layout.includes("{deniedChild || (!hasDemoFamily && pathname.replace(/\\/$/, '') !== '/mother') ? <section"))
  assert.ok(layout.includes("t('mother.booking.noChildren')"))
} finally { globalThis.window = originalWindow; await server.close() }
console.log('Parent registration: role/prefix validation, duplicates, password mismatch, salted hashes, exact credentials, refresh, no family access and storage preservation passed')
