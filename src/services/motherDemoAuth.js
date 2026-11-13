import { getUnifiedDemoUser, hasUnifiedDemoSession, logoutUnifiedDemo, subscribeUnifiedAuth } from './unifiedDemoAuth.js'
// Frontend demo navigation only. Browser storage is not real authorization.
// One tab-scoped flag; no passwords, tokens, child data or profile details are stored.
export const motherAuthKey = 'nomu.demo.motherAuth.v1'
export const motherAuthChanged = 'nomu:mother-auth-changed'

export function createMotherDemoAuth(storage) {
  let memoryOnly = false
  let authenticated = false
  let revoked = false
  return {
    isAuthenticated() {
      if (revoked) return false
      if (memoryOnly) return authenticated
      try { return storage.getItem(motherAuthKey) === 'demo-mother-sara' } catch { return false }
    },
    login(nationalId, password) {
      if (nationalId !== '1234567890' || password !== 'Demo123!') return false
      authenticated = true
      revoked = false
      try { storage.setItem(motherAuthKey, 'demo-mother-sara'); memoryOnly = false } catch { memoryOnly = true }
      return true
    },
    logout() {
      // Revoke in memory first so navigation cannot expose the old session.
      authenticated = false
      revoked = true
      memoryOnly = false
      try { storage.removeItem(motherAuthKey) } catch {
        try { storage.setItem(motherAuthKey, '') } catch { /* Still revoked in this document. */ }
      }
    },
  }
}

const auth = createMotherDemoAuth({
  getItem: key => window.sessionStorage.getItem(key),
  setItem: (key, value) => window.sessionStorage.setItem(key, value),
  removeItem: key => window.sessionStorage.removeItem(key),
})
const notify = () => window.dispatchEvent(new Event(motherAuthChanged))
export const isMotherAuthenticated = () => hasUnifiedDemoSession() ? ['mother', 'father'].includes(getUnifiedDemoUser()?.role) : auth.isAuthenticated()
export function loginMotherDemo(nationalId, password) {
  const accepted = auth.login(nationalId, password)
  if (accepted) { logoutUnifiedDemo(false); notify() }
  return accepted
}
export function logoutMotherDemo() { auth.logout(); logoutUnifiedDemo(); notify() }
export function subscribeMotherAuth(listener) {
  const unsubscribeUnified = subscribeUnifiedAuth(listener)
  const storage = event => { if (!event.key || event.key === motherAuthKey) listener() }
  window.addEventListener(motherAuthChanged, listener)
  window.addEventListener('storage', storage)
  window.addEventListener('popstate', listener)
  window.addEventListener('pageshow', listener)
  window.addEventListener('focus', listener)
  return () => {
    unsubscribeUnified()
    window.removeEventListener(motherAuthChanged, listener)
    window.removeEventListener('storage', storage)
    window.removeEventListener('popstate', listener)
    window.removeEventListener('pageshow', listener)
    window.removeEventListener('focus', listener)
  }
}
