import { bookingDoctors, getDoctorSlots, localDateKey } from '../pages/mother/bookingAvailabilityDemo.js'
import { motherAppointmentDemoData } from '../pages/mother/motherAppointmentDemoData.js'

export const RESCHEDULE_NOTICE_MS = 24 * 60 * 60 * 1000
export function validLocalAppointmentTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(value)) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && localDateKey(date) + 'T' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0') + ':00' === value
}
export function getOwnedAppointment(mother, id) {
  return motherAppointmentDemoData.find(item => item.id === id && item.motherId === mother.id && mother.children.some(child => child.id === item.childKey) && bookingDoctors.some(doctor => doctor.nameKey === item.doctorKey) && validLocalAppointmentTime(item.dateTime) && typeof item.reasonKey === 'string')
}
export function canReschedule(mother, appointment, now = new Date()) {
  const owned = appointment && getOwnedAppointment(mother, appointment.id)
  return Boolean(owned && owned.status === 'confirmed' && owned.group === 'upcoming' && new Date(owned.dateTime).getTime() - now.getTime() >= RESCHEDULE_NOTICE_MS)
}
const key = mother => 'nomu.demo.rescheduleRequests.v1:' + encodeURIComponent(mother.id)
// Browser-only demo storage: not secure authorization and not synchronized between users/devices.
// Keep the original confirmed records and existing booking storage entirely untouched.
export function readRescheduleRequests(mother, storage = window.localStorage) {
  try {
    const records = JSON.parse(storage.getItem(key(mother)) || '[]')
    if (!Array.isArray(records)) throw new Error('storageError')
    const ids = new Set()
    for (const record of records) {
      const original = record && getOwnedAppointment(mother, record.appointmentId)
      if (!original || record.motherId !== mother.id || record.status !== 'reschedulePending' || typeof record.id !== 'string' || ids.has(record.appointmentId) || record.originalDateTime !== original.dateTime || !validLocalAppointmentTime(record.dateTime) || record.dateTime === original.dateTime) throw new Error('storageError')
      ids.add(record.appointmentId)
    }
    return records
  } catch { throw new Error('storageError') }
}
export function rescheduleReservations(mother, storage = window.localStorage) {
  return readRescheduleRequests(mother, storage).map(record => ({ ...record, doctorId: bookingDoctors.find(doctor => doctor.nameKey === getOwnedAppointment(mother, record.appointmentId).doctorKey).id }))
}
export function rescheduleSlotAllowed(appointment, date, time, now = new Date()) {
  const value = date + 'T' + time + ':00'
  return validLocalAppointmentTime(value) && value !== appointment.dateTime && new Date(value).getTime() - now.getTime() >= RESCHEDULE_NOTICE_MS
}
// Slot existence is also checked through getDoctorSlots by the submission service.
export function doctorIdForAppointment(appointment) {
  return bookingDoctors.find(doctor => doctor.nameKey === appointment?.doctorKey)?.id
}
export function saveRescheduleRequest(mother, original, dateTime, records, storage = window.localStorage, now = new Date()) {
  const request = { id: crypto.randomUUID(), createdAt: now.toISOString(), motherId: mother.id, appointmentId: original.id, originalDateTime: original.dateTime, dateTime, status: 'reschedulePending', group: 'pending' }
  try { storage.setItem(key(mother), JSON.stringify([...records, request])) } catch { throw new Error('storageError') }
  return request
}
export function scheduledSlotExists(appointment, date, time, now) {
  return getDoctorSlots(doctorIdForAppointment(appointment), date, now).some(slot => slot.time === time && slot.available)
}
