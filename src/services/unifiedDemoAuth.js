import { doctorDirectory, getDoctorProfile } from './doctorDirectory.js'
// Fictional frontend accounts only. Hashes avoid persisting passwords; this is NOT backend security.
import { readParentAccounts, parentPasswordHash } from './parentDemoAccounts.js'
import { demoParentFamily } from './demoChildAccess.js'
export const unifiedAuthKey = 'nomu.demo.unifiedAuth.v1'
export const unifiedAuthChanged = 'nomu:unified-auth-changed'
const audienceRoles = Object.freeze({ doctor: ['doctor', 'nurse'], parent: ['mother', 'father'] })
const prefixes = Object.freeze({ doctor: '100', nurse: '200', mother: '300', father: '400' })
// Development-only password for the four explicitly allowlisted fictional accounts.
const sharedDemoPasswordHash = '2ac4757802ddfa9540f285b04d7ba282b55f206b9a4700c11010ebc410cdb4ab'
const accounts = Object.freeze([
  Object.freeze({ id: '1000000001', role: 'doctor', doctorId: 'demo-doctor-sarah-ahmad', name: getDoctorProfile('demo-doctor-sarah-ahmad').name, dashboard: '/doctor', clinicalEditing: true, hash: 'eda37060b40951d2d0278543cbef405aebc502c437b21dbd3565e11e2765038b' }),
  ...doctorDirectory.filter(doctor => doctor.id !== 'demo-doctor-sarah-ahmad').map((doctor, index) => Object.freeze({ id: '100000000' + (index + 2), role: 'doctor', doctorId: doctor.id, name: doctor.name, dashboard: '/doctor', clinicalEditing: true, hash: sharedDemoPasswordHash })),
  Object.freeze({ id: '2000000001', role: 'nurse', name: 'Demo Nurse', dashboard: '/doctor', clinicalEditing: false, hash: '615d58e7a0023870000a3cbc349580d0b14d657c080a3dc9ad33bef18f34bb85' }),
  Object.freeze({ id: '3000000001', role: 'mother', name: 'Sara Ahmad', dashboard: '/mother', hash: '2914c1d1a3a570d4ec2f8361193bd0f94b93d1b8b0298f33e4c33fbe4652013e' }),
  // Explicit fictional co-parent of the existing demo family, not an inferred relationship.
  Object.freeze({ id: '4000000001', role: 'father', name: 'Ahmad', dashboard: '/mother', hash: '232f1264bb4f31eff6fb456c59a35de917bd27f7536b3016771a59d272b3d24a' }),
])
const publicAccounts = new Map(accounts.map(({ hash: _hash, ...account }) => [account.id, Object.freeze({ ...account, accountSource: 'provisioned-demo', ...(['mother', 'father'].includes(account.role) ? { familyScope: demoParentFamily(account.id, account.role), homePresentation: account.role === 'mother' ? 'legacy-mother' : 'parent' } : {}) })]))
const legacyKeys = ['nomu.demo.doctorAuth.v1', 'nomu.demo.motherAuth.v1']
export function createUnifiedDemoAuth(storage, cryptoApi = globalThis.crypto, accountStorage = storage) {
  let memoryId = null, memoryOnly = false, revoked = false, attempt = 0, exclusive = false
  let loginError = 'unifiedLogin.invalid'
  const parentCache = new Map()
  function findParent(id) {
    try { return readParentAccounts(accountStorage).find(account => account.id === id) } catch { return null }
  }
  function publicParent(account) {
    const signature = JSON.stringify(account)
    if (parentCache.get(account.id)?.signature !== signature) parentCache.set(account.id, { signature, user: Object.freeze({ id: account.id, name: account.name, role: account.role, dashboard: '/mother', familyScope: demoParentFamily(account.id, account.role), accountSource: 'registration', homePresentation: 'parent' }) })
    return parentCache.get(account.id).user
  }
  function getUser() {
    if (revoked) return null
    try {
      const id = memoryOnly ? memoryId : storage.getItem(unifiedAuthKey)
      const parent = publicAccounts.has(id) ? null : findParent(id)
      const user = publicAccounts.get(id) || (parent ? publicParent(parent) : null)
      return user && id.startsWith(prefixes[user.role]) ? user : null
    } catch { return null }
  }
  function logout(clearLegacy = true) {
    attempt++; revoked = true; memoryId = null; memoryOnly = false; exclusive = false
    for (const key of [unifiedAuthKey, ...(clearLegacy ? legacyKeys : [])]) {
      try { storage.removeItem(key) } catch { try { storage.setItem(key, '') } catch { /* Local revocation still applies. */ } }
    }
  }
  return {
    getUser,
    getLoginError: () => loginError,
    // A failed unified attempt must not fall back to a previous memory-only legacy login.
    hasSession() { if (exclusive) return true; if (revoked) return false; if (memoryOnly) return true; try { return storage.getItem(unifiedAuthKey) !== null } catch { return false } },
    logout,
    async login(id, password, audience) {
      logout()
      loginError = 'unifiedLogin.invalid'
      exclusive = true
      const currentAttempt = attempt
      if (typeof id !== 'string' || typeof password !== 'string') return null
      const builtIn = accounts.find(item => item.id === id)
      const account = builtIn || findParent(id)
      if (!account || !cryptoApi?.subtle) return null
      try {
        let hash
        if (builtIn) {
          const digest = await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(password))
          hash = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('')
        } else hash = await parentPasswordHash(password, account.salt, cryptoApi)
        if (currentAttempt !== attempt || (hash !== account.hash && !(builtIn && hash === sharedDemoPasswordHash)) || !id.startsWith(prefixes[account.role])) return null
        // Compare the credential-verified role before creating any usable session.
        if (audience !== undefined && (!Object.hasOwn(audienceRoles, audience) || !audienceRoles[audience].includes(account.role))) {
          loginError = 'home.nemoAuth.wrongPortal'
          return null
        }
        revoked = false; memoryId = id
        try { storage.setItem(unifiedAuthKey, id); memoryOnly = false } catch { memoryOnly = true }
        return builtIn ? publicAccounts.get(id) : publicParent(account)
      } catch { return null }
    },
  }
}
const auth = createUnifiedDemoAuth({ getItem: key => window.sessionStorage.getItem(key), setItem: (key,value) => window.sessionStorage.setItem(key,value), removeItem: key => window.sessionStorage.removeItem(key) }, globalThis.crypto, { getItem: key => window.localStorage.getItem(key) })
const notify = () => window.dispatchEvent(new Event(unifiedAuthChanged))
export const getUnifiedDemoUser = () => auth.getUser()
export const hasUnifiedDemoSession = () => auth.hasSession()
export async function loginUnifiedDemo(id, password, audience) { const result = await auth.login(id, password, audience ?? 'missing'); notify(); return result }
export const getUnifiedLoginError = () => auth.getLoginError()
export function logoutUnifiedDemo(clearLegacy = true) { auth.logout(clearLegacy); notify() }
export function subscribeUnifiedAuth(listener) {
  window.addEventListener(unifiedAuthChanged, listener)
  const refresh = event => { if (!event.key || event.key === unifiedAuthKey) listener() }
  window.addEventListener('storage', refresh)
  window.addEventListener('focus', listener)
  window.addEventListener('pageshow', listener)
  return () => { window.removeEventListener(unifiedAuthChanged, listener); window.removeEventListener('storage', refresh); window.removeEventListener('focus', listener); window.removeEventListener('pageshow', listener) }
}
