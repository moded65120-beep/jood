import { initialAvailability, validateAvailability } from './appointmentsData.js'
export const appointmentsStorageKey = doctorId => `nomu.doctor.demoBookings.v1.${encodeURIComponent(doctorId)}`
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value
export function validBookingState(state, doctorId) {
  if (!state || state.version !== 1 || !Number.isInteger(state.revision) || state.revision < 0 || state.availability?.doctorId !== doctorId || validateAvailability(state.availability) || !Array.isArray(state.requests)) return false
  const ids = new Set()
  return state.requests.every(request => {
    if (!request || typeof request.id !== 'string' || !request.id || ids.has(request.id)) return false
    ids.add(request.id)
    return request.doctorId === doctorId && typeof request.childId === 'string' && request.childId && timestamp(request.start) && timestamp(request.end) && request.start < request.end && timestamp(request.createdAt)
      && ['clinic', 'hospital'].includes(request.workplace) && typeof request.location === 'string' && typeof request.reason === 'string' && request.reason.trim()
      && ['pending', 'approved', 'rejected', 'cancelled'].includes(request.status) && typeof request.rejectionReason === 'string'
      && (request.status === 'pending' ? request.decisionAt === null : timestamp(request.decisionAt)) && (request.status !== 'rejected' || request.rejectionReason.trim())
  })
}
export function loadBookings(doctorId, storage) {
  const fallback = { version: 1, revision: 0, availability: initialAvailability(doctorId), requests: [] }
  try {
    const raw = (storage || window.localStorage).getItem(appointmentsStorageKey(doctorId))
    if (raw === null) return { state: fallback, warning: null }
    const state = JSON.parse(raw)
    if (!validBookingState(state, doctorId)) throw new SyntaxError()
    return { state, warning: null }
  } catch (error) { return { state: fallback, warning: error instanceof SyntaxError ? 'invalidStorage' : 'storageUnavailable' } }
}
export function persistBookings(state, expectedRevision, storage) {
  try {
    if (!validBookingState(state, state.availability.doctorId)) return 'invalidStorage'
    const target = storage || window.localStorage
    const raw = target.getItem(appointmentsStorageKey(state.availability.doctorId))
    if (raw !== null) {
      const previous = JSON.parse(raw)
      if (!validBookingState(previous, state.availability.doctorId)) return 'invalidStorage'
      if (previous.revision !== expectedRevision) return 'staleStorage'
    } else if (expectedRevision !== 0) return 'staleStorage'
    target.setItem(appointmentsStorageKey(state.availability.doctorId), JSON.stringify(state))
    return null
  } catch { return 'storageUnavailable' }
}
