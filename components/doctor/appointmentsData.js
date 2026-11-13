import { getDoctorProfile } from '../../services/doctorDirectory.js'
// Fictional browser demo only. No React/UI dependencies: reusable by a future booking client.
export const DEFAULT_DOCTOR_ID = 'demo-doctor-sarah-ahmad'
export const bookingTimeZone = 'Asia/Amman'
export const appointmentDurations = [15, 20, 30, 45, 60]
const reserved = request => ['pending', 'approved'].includes(request.status)
const minute = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '') ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : NaN
const clock = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
export function bookingDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: bookingTimeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-')
}
const validDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date || '') && Number.isFinite(Date.parse(date)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date
// Convert an Amman wall-clock time to an absolute ISO timestamp using the zone's actual offset.
function instant(date, time) {
  const target = Date.parse(`${date}T${time}:00Z`)
  let result = target
  for (let index = 0; index < 3; index++) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: bookingTimeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(result))
    const part = type => parts.find(item => item.type === type).value
    const wall = Date.parse(`${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}Z`)
    result += target - wall
  }
  return new Date(result).toISOString()
}
export function initialAvailability(doctorId = DEFAULT_DOCTOR_ID) {
  const profile = getDoctorProfile(doctorId)
  if (profile?.scheduleSource === 'new-doctor-calendar') {
    const end = start => { const [hour, minute] = start.split(':').map(Number); const total = hour * 60 + minute + 30; return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0') }
    return { doctorId, workplace: 'clinic', location: '', duration: 30, days: Array.from({ length: 7 }, (_, day) => ({ day, enabled: profile.days.includes(day), intervals: profile.days.includes(day) ? profile.times.map(start => ({ start, end: end(start) })) : [] })), exceptions: [] }
  }
  return { doctorId, workplace: 'clinic', location: '', duration: 30, days: Array.from({ length: 7 }, (_, day) => ({ day, enabled: day < 5, intervals: [{ start: '09:00', end: '14:00' }] })), exceptions: [] }
}
export function validateAvailability(availability) {
  if (!availability || !availability.doctorId || !['clinic', 'hospital'].includes(availability.workplace) || typeof availability.location !== 'string' || !appointmentDurations.includes(availability.duration) || !Array.isArray(availability.days) || availability.days.length !== 7 || !Array.isArray(availability.exceptions)) return 'invalidSchedule'
  const dayIds = new Set()
  for (const day of availability.days) {
    if (!day || !Number.isInteger(day.day) || day.day < 0 || day.day > 6 || dayIds.has(day.day) || typeof day.enabled !== 'boolean' || !Array.isArray(day.intervals)) return 'invalidSchedule'
    dayIds.add(day.day)
    if (!day.enabled) continue
    if (!day.intervals.length) return 'intervalRequired'
    if (day.intervals.some(interval => !interval || !Number.isFinite(minute(interval.start)) || !Number.isFinite(minute(interval.end)))) return 'invalidRange'
    const intervals = day.intervals.slice().sort((a, b) => minute(a.start) - minute(b.start))
    for (let index = 0; index < intervals.length; index++) {
      const { start, end } = intervals[index]
      if (!Number.isFinite(minute(start)) || !Number.isFinite(minute(end)) || minute(start) >= minute(end)) return 'invalidRange'
      if (index && minute(start) < minute(intervals[index - 1].end)) return 'overlap'
    }
  }
  const dates = new Set()
  for (const exception of availability.exceptions) {
    if (!exception || !validDate(exception.date) || typeof exception.reason !== 'string' || dates.has(exception.date)) return 'invalidException'
    dates.add(exception.date)
  }
  return null
}
export function overlaps(left, right) { return Date.parse(left.start) < Date.parse(right.end) && Date.parse(right.start) < Date.parse(left.end) }
export function bookingFits(availability, booking) {
  if (booking.doctorId !== availability.doctorId) return false
  const date = bookingDate(new Date(booking.start))
  if (availability.exceptions.some(item => item.date === date)) return false
  const day = availability.days.find(item => item.day === new Date(`${date}T12:00:00Z`).getUTCDay())
  return Boolean(day?.enabled && day.intervals.some(interval => booking.start >= instant(date, interval.start) && booking.end <= instant(date, interval.end)))
}
export function availabilityConflicts(availability, requests, now = new Date()) {
  return requests.filter(request => request.doctorId === availability.doctorId && reserved(request) && Date.parse(request.end) > now.getTime() && !bookingFits(availability, request))
}
export function availableSlots(availability, requests, date, now = new Date()) {
  if (validateAvailability(availability) || !validDate(date) || availability.exceptions.some(item => item.date === date)) return []
  const day = availability.days.find(item => item.day === new Date(`${date}T12:00:00Z`).getUTCDay())
  if (!day?.enabled) return []
  const slots = []
  for (const interval of day.intervals.slice().sort((a, b) => minute(a.start) - minute(b.start))) {
    for (let start = minute(interval.start); start + availability.duration <= minute(interval.end); start += availability.duration) {
      const slot = { doctorId: availability.doctorId, start: instant(date, clock(start)), end: instant(date, clock(start + availability.duration)), workplace: availability.workplace, location: availability.location }
      if (Date.parse(slot.start) <= now.getTime() || requests.some(request => request.doctorId === slot.doctorId && reserved(request) && overlaps(slot, request))) continue
      slots.push({ ...slot, id: `${slot.doctorId}:${slot.start}:${slot.end}` })
    }
  }
  return slots
}
// Caller supplies an authorized linked child; backend must enforce that relationship later.
export function submitBooking(state, draft, now = new Date()) {
  if (typeof draft.id !== 'string' || !draft.id || typeof draft.childId !== 'string' || !draft.childId || draft.doctorId !== state.availability.doctorId || typeof draft.reason !== 'string' || !draft.reason.trim()) return { error: 'requestRequired' }
  if (state.requests.some(request => request.id === draft.id)) return { error: 'duplicateRequest' }
  if (!Number.isFinite(Date.parse(draft.start))) return { error: 'slotUnavailable' }
  const slot = availableSlots(state.availability, state.requests, bookingDate(new Date(draft.start)), now).find(item => item.start === draft.start && item.end === draft.end)
  if (!slot) return { error: 'slotUnavailable' }
  const request = { ...slot, id: draft.id, childId: draft.childId, reason: draft.reason, status: 'pending', createdAt: now.toISOString(), decisionAt: null, rejectionReason: '' }
  return { state: { ...state, requests: [...state.requests, request] }, request }
}
export function decideBooking(state, id, decision, reason = '', now = new Date()) {
  const request = state.requests.find(item => item.id === id && item.doctorId === state.availability.doctorId)
  if (!request || request.status !== 'pending' || !['approved', 'rejected'].includes(decision)) return { error: 'alreadyDecided' }
  if (decision === 'rejected' && !reason.trim()) return { error: 'rejectionRequired' }
  if (decision === 'approved' && (Date.parse(request.start) <= now.getTime() || !bookingFits(state.availability, request) || state.requests.some(item => item.id !== id && item.doctorId === request.doctorId && reserved(item) && overlaps(item, request)))) return { error: 'bookingConflict' }
  return { state: { ...state, requests: state.requests.map(item => item.id === id ? { ...item, status: decision, decisionAt: now.toISOString(), rejectionReason: decision === 'rejected' ? reason : '' } : item) } }
}
export function saveAvailability(state, availability, now = new Date()) {
  const error = validateAvailability(availability)
  if (error || availability.doctorId !== state.availability.doctorId) return { error: error || 'invalidSchedule' }
  const conflicts = availabilityConflicts(availability, state.requests, now)
  if (conflicts.length) return { error: 'availabilityConflict', conflicts }
  return { state: { ...state, availability } }
}
export function formatBookingTime(timestamp, language) { return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: bookingTimeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp)) }
