import { getUnifiedLoginError, loginUnifiedDemo, logoutUnifiedDemo } from './unifiedDemoAuth.js'
import { loginMotherDemo } from './motherDemoAuth.js'
import { loginDoctorDemo } from './doctorDemoAuth.js'
import { registerParentDemo } from './parentDemoAccounts.js'

const existing = { getUnifiedLoginError, loginUnifiedDemo, logoutUnifiedDemo, loginMotherDemo, loginDoctorDemo }

// Portal choice restricts the login category; verified account data controls access.
export async function loginNemoPortal(audience, id, password, auth = existing) {
  if (!['parent', 'doctor'].includes(audience)) return { error: 'home.nemoAuth.wrongPortal' }
  const user = await auth.loginUnifiedDemo(id.trim(), password, audience)
  if (user) {
    const allowed = audience === 'parent' ? ['mother', 'father'] : ['doctor', 'nurse']
    if (!allowed.includes(user.role)) {
      auth.logoutUnifiedDemo()
      return { error: 'home.nemoAuth.wrongPortal' }
    }
    return { dashboard: user.dashboard }
  }
  if (auth.getUnifiedLoginError?.() === 'home.nemoAuth.wrongPortal') return { error: 'home.nemoAuth.wrongPortal' }
  // Retain the exact legacy credentials alongside unified and registered accounts.
  if (audience === 'parent' && auth.loginMotherDemo(id.trim(), password)) return { dashboard: '/mother' }
  if (audience === 'doctor' && auth.loginDoctorDemo(id.trim(), password)) return { dashboard: '/doctor' }
  return { error: 'unifiedLogin.invalid' }
}

export async function registerNemoParent(values, register = registerParentDemo) {
  if (!values.phone?.trim()) return { errors: { phone: 'home.nemoAuth.phoneRequired' } }
  const phone = values.phone.replace(/[\s()-]/g, '')
  if (!/^\+?\d{7,15}$/.test(phone)) return { errors: { phone: 'parentRegistration.phoneInvalid' } }
  // The existing demo provisions 300… Mother and 400… Father IDs. This does not
  // grant a family relationship or authenticate a role; the service validates it.
  return register({ ...values, phone, role: values.nationalId.trim().startsWith('400') ? 'father' : 'mother', confirmPassword: values.password })
}
