import { getDoctorProfile } from './doctorDirectory.js'
import { getUnifiedDemoUser, hasUnifiedDemoSession } from './unifiedDemoAuth.js'
import { isDoctorAuthenticated } from './doctorDemoAuth.js'
export function currentDoctorProfile() {
  if (hasUnifiedDemoSession()) {
    const user = getUnifiedDemoUser()
    return user?.role === 'doctor' ? getDoctorProfile(user.doctorId) : null
  }
  return isDoctorAuthenticated() ? getDoctorProfile('demo-doctor-sarah-ahmad') : null
}
