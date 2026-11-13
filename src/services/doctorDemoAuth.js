import { getUnifiedDemoUser, hasUnifiedDemoSession, logoutUnifiedDemo, subscribeUnifiedAuth } from './unifiedDemoAuth.js'
// Frontend demo navigation only. Browser storage is not real authorization.
// One tab-scoped flag; no passwords, tokens, child data or profile details are stored.
export const doctorAuthKey = 'nomu.demo.doctorAuth.v1'
export const doctorAuthChanged = 'nomu:doctor-auth-changed'

export function createDoctorDemoAuth(storage) {
  let memoryOnly = false
  let authenticated = false
  let revoked = false
  return {
    isAuthenticated() {
      if (revoked) return false
      if (memoryOnly) return authenticated
      try { return storage.getItem(doctorAuthKey) === 'demo-doctor-sarah' } catch { return false }
    },
    login(doctorId, password) {
      if (doctorId !== '9876543210' || password !== 'Doctor123!') return false
      authenticated = true
      revoked = false
      try { storage.setItem(doctorAuthKey, 'demo-doctor-sarah'); memoryOnly = false } catch { memoryOnly = true }
      return true
    },
    logout() {
      // Revoke in memory first so navigation cannot expose the old session.
      authenticated = false
      revoked = true
      memoryOnly = false
      try { storage.removeItem(doctorAuthKey) } catch {
        try { storage.setItem(doctorAuthKey, '') } catch { /* Still revoked in this document. */ }
      }
    },
  }
}

const auth = createDoctorDemoAuth({
  getItem: key => window.sessionStorage.getItem(key),
  setItem: (key, value) => window.sessionStorage.setItem(key, value),
  removeItem: key => window.sessionStorage.removeItem(key),
})
const notify = () => window.dispatchEvent(new Event(doctorAuthChanged))
export const isDoctorAuthenticated = () => hasUnifiedDemoSession() ? ['doctor', 'nurse'].includes(getUnifiedDemoUser()?.role) : auth.isAuthenticated()
export function loginDoctorDemo(doctorId, password) {
  const accepted = auth.login(doctorId, password)
  if (accepted) { logoutUnifiedDemo(false); notify() }
  return accepted
}
export function logoutDoctorDemo() { auth.logout(); logoutUnifiedDemo(); notify() }
export function subscribeDoctorAuth(listener) {
  const unsubscribeUnified = subscribeUnifiedAuth(listener)
  const storage = event => { if (!event.key || event.key === doctorAuthKey) listener() }
  window.addEventListener(doctorAuthChanged, listener)
  window.addEventListener('storage', storage)
  window.addEventListener('popstate', listener)
  window.addEventListener('pageshow', listener)
  window.addEventListener('focus', listener)
  return () => {
    unsubscribeUnified()
    window.removeEventListener(doctorAuthChanged, listener)
    window.removeEventListener('storage', storage)
    window.removeEventListener('popstate', listener)
    window.removeEventListener('pageshow', listener)
    window.removeEventListener('focus', listener)
  }
}
