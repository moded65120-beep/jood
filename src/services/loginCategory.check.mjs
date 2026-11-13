import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { createUnifiedDemoAuth, unifiedAuthKey, loginUnifiedDemo, getUnifiedDemoUser, getUnifiedLoginError, logoutUnifiedDemo } from './unifiedDemoAuth.js'
import { registerParentDemo } from './parentDemoAccounts.js'
import { isDoctorAuthenticated } from './doctorDemoAuth.js'
import { isMotherAuthenticated } from './motherDemoAuth.js'
import en from '../locales/en/translations.js'
import ar from '../locales/ar/translations.js'

const data = new Map([['medical-records', 'unchanged']])
const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
const auth = createUnifiedDemoAuth(storage, webcrypto)
for (const [id, role, correct, route] of [
  ['1000000001', 'doctor', 'doctor', '/doctor'], ['2000000001', 'nurse', 'doctor', '/doctor'],
  ['3000000001', 'mother', 'parent', '/mother'], ['4000000001', 'father', 'parent', '/mother'],
]) {
  const user = await auth.login(id, 'Demo@1234', correct)
  assert.equal(user.role, role); assert.equal(user.dashboard, route)
  assert.equal(createUnifiedDemoAuth(storage, webcrypto).getUser().id, id, 'Allowed session survives refresh')
  const wrong = correct === 'doctor' ? 'parent' : 'doctor'
  assert.equal(await auth.login(id, 'Demo@1234', wrong), null)
  assert.equal(auth.getLoginError(), 'home.nemoAuth.wrongPortal')
  assert.equal(auth.getUser(), null); assert.equal(data.get(unifiedAuthKey), undefined)
  assert.equal(createUnifiedDemoAuth(storage, webcrypto).getUser(), null, 'Mismatch cannot survive reload or reuse the preceding session')
  assert.equal(await auth.login(id, 'incorrect', wrong), null)
  assert.equal(auth.getLoginError(), 'unifiedLogin.invalid', 'Do not disclose the category for incorrect credentials')
}
assert.equal(await auth.login('1009999999', 'Demo@1234', 'doctor'), null)
assert.equal(await auth.login('1000000001', 'Demo@1234', 'unknown'), null)
assert.ok((await registerParentDemo({ nationalId: '3000000077', role: 'mother', fullName: 'Test Parent', email: 'category@example.test', password: 'Fictional123!', confirmPassword: 'Fictional123!' }, storage, webcrypto)).success)
assert.equal((await auth.login('3000000077', 'Fictional123!', 'parent')).role, 'mother')
assert.equal(await auth.login('3000000077', 'Fictional123!', 'doctor'), null)
const previousWindow = globalThis.window
globalThis.window = { sessionStorage: storage, localStorage: storage, dispatchEvent() {} }
try {
  assert.ok(await loginUnifiedDemo('3000000001', 'Demo@1234', 'parent'))
  assert.equal(await loginUnifiedDemo('3000000001', 'Demo@1234', 'doctor'), null)
  assert.equal(getUnifiedLoginError(), 'home.nemoAuth.wrongPortal')
  assert.equal(getUnifiedDemoUser(), null)
  assert.equal(isMotherAuthenticated(), false); assert.equal(isDoctorAuthenticated(), false)
  assert.equal(await loginUnifiedDemo('1000000001', 'Demo@1234'), null, 'Public authentication requires a category')
  logoutUnifiedDemo()
} finally { globalThis.window = previousWindow }
for (const dictionary of [en, ar]) assert.ok(dictionary.home.nemoAuth.wrongPortal.length > 20)
assert.notEqual(en.home.nemoAuth.wrongPortal, ar.home.nemoAuth.wrongPortal)
assert.equal(data.get('medical-records'), 'unchanged')
console.log('Login category: all 4 allowed roles, all 4 cross-category rejections, credentials, registered parents, refresh, stale sessions, missing/invalid category, guarded routes and localized errors passed')
