import { getDoctorProfile } from './doctorDirectory.js'
import { currentDoctorProfile } from './currentDoctorProfile.js'

export const doctorProfileDetailsChanged = 'nomu:doctor-profile-details-changed'
const prefix = 'nomu.demo.doctorProfile.v1.'
const fields = ['phone', 'email', 'bio']
const digits = value => value.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, digit => String(digit.charCodeAt(0) - (digit.charCodeAt(0) >= 0x06f0 ? 0x06f0 : 0x0660)))

export function doctorContactErrors({ phone = '', email = '' }) {
  const number = digits(phone.trim())
  const count = number.replace(/\D/g, '').length
  return {
    phone: number && (!/^\+?[\d\s().-]+$/.test(number) || count < 7 || count > 15 || number.length > 40) ? 'invalidPhone' : '',
    email: email.trim() && (email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) ? 'invalidEmail' : '',
  }
}

export function createDoctorProfileRepository(options = {}) {
  const storage = () => options.storage || window.localStorage
  const events = () => options.events || (typeof window === 'undefined' ? null : window)
  const current = options.currentDoctor || currentDoctorProfile
  function read(id) {
    const doctor = getDoctorProfile(id)
    if (!doctor) throw Error('notAllowed')
    const defaults = Object.fromEntries(fields.map(field => [field, typeof doctor[field] === 'string' ? doctor[field] : '']))
    const raw = storage().getItem(prefix + encodeURIComponent(id))
    if (raw === null) return defaults
    let record
    try { record = JSON.parse(raw) } catch { throw Error('loadFailed') }
    if (!record || record.version !== 1 || record.doctorId !== id || !fields.every(field => typeof record[field] === 'string')) throw Error('loadFailed')
    return Object.fromEntries(fields.map(field => [field, record[field]]))
  }
  function save(id, patch) {
    if (!getDoctorProfile(id) || current()?.id !== id) throw Error('notAllowed')
    if (!patch || Array.isArray(patch) || !Object.keys(patch).length || Object.entries(patch).some(([field, value]) => !fields.includes(field) || typeof value !== 'string')) throw Error('saveFailed')
    const value = { ...read(id), ...Object.fromEntries(Object.entries(patch).map(([field, value]) => [field, value.trim()])) }
    const invalid = Object.values(doctorContactErrors(value)).find(Boolean)
    if (invalid) throw Error(invalid)
    if (value.bio.length > 2000) throw Error('bioTooLong')
    if (current()?.id !== id) throw Error('notAllowed')
    storage().setItem(prefix + encodeURIComponent(id), JSON.stringify({ version: 1, doctorId: id, ...value }))
    events()?.dispatchEvent(new Event(doctorProfileDetailsChanged))
    return { ...value }
  }
  function subscribe(listener) {
    const host = events()
    const changed = event => { if (!event.key || event.key.startsWith(prefix)) listener() }
    host?.addEventListener(doctorProfileDetailsChanged, listener)
    host?.addEventListener('storage', changed)
    host?.addEventListener('focus', listener)
    return () => {
      host?.removeEventListener(doctorProfileDetailsChanged, listener)
      host?.removeEventListener('storage', changed)
      host?.removeEventListener('focus', listener)
    }
  }
  return { read, save, subscribe }
}

export const doctorProfileRepository = createDoctorProfileRepository()
