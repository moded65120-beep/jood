// Fictional availability only; never represents real doctor availability.
import { doctorDirectory } from '../../services/doctorDirectory.js'
import { loadBookings } from '../../components/doctor/appointmentsStorage.js'
import { availableSlots, bookingTimeZone } from '../../components/doctor/appointmentsData.js'
export const bookingDoctors = doctorDirectory
export const localDateKey = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
export function bookingDateLimit(now = new Date()) {
  const end = new Date(now)
  end.setDate(end.getDate() + 29)
  return localDateKey(end)
}
export function getDoctorSlots(doctorId, dateKey, now = new Date()) {
  const doctor = bookingDoctors.find(item => item.id === doctorId)
  if (!doctor || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return []
  const date = new Date(dateKey + 'T00:00:00')
  if (Number.isNaN(date.getTime()) || localDateKey(date) !== dateKey || dateKey < localDateKey(now) || dateKey > bookingDateLimit(now) || (doctor.days && !doctor.days.includes(date.getDay()))) return []
  if (doctor.scheduleSource) {
    const state = loadBookings(doctor.id)
    if (state.warning) return []
    return availableSlots(state.state.availability, state.state.requests, dateKey, now).map(slot => ({ time: new Intl.DateTimeFormat('en-GB', { timeZone: bookingTimeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(slot.start)), available: true }))
  }
  return doctor.times.map(time => ({ time, available: new Date(dateKey + 'T' + time + ':00') > now }))
}

// Today plus the following 29 local calendar days; omit days without bookable times.
export function getDoctorAvailableDates(doctorId, now = new Date(), isReserved = () => false) {
  const dates = []
  for (let offset = 0; offset < 30; offset += 1) {
    const date = new Date(now)
    date.setDate(date.getDate() + offset)
    const dateKey = localDateKey(date)
    if (getDoctorSlots(doctorId, dateKey, now).some(slot => slot.available && !isReserved(dateKey, slot.time))) dates.push(dateKey)
  }
  return dates
}
