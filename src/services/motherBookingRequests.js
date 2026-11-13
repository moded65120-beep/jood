import { canReschedule, getOwnedAppointment, readRescheduleRequests, rescheduleReservations, rescheduleSlotAllowed, saveRescheduleRequest, scheduledSlotExists, doctorIdForAppointment } from './motherRescheduleRequests.js'
import { demoChildren } from '../pages/mother/childDemoData.js'
import { bookingDoctors, getDoctorSlots } from '../pages/mother/bookingAvailabilityDemo.js'
import { motherAppointmentDemoData } from '../pages/mother/motherAppointmentDemoData.js'

// No authenticated profile exists in the current app. This is the explicit frontend fallback.
const demoMother = { id: 'demo-mother-sara', children: Object.values(demoChildren).map(child => ({ id: child.id, nameKey: child.id })) }
// Future integration: pass the authenticated mother's server-returned children, not a global child list.
// An empty authenticated children array must stay empty; never fall back to somebody else's children.
export function getBookingMother(authenticatedMother) {
  if (!authenticatedMother) return demoMother
  return { id: authenticatedMother.id, children: (authenticatedMother.children || []).filter(child => child.motherId === authenticatedMother.id).map(child => ({ id: child.id, name: child.name })) }
}
const storageKey = motherId => 'nomu.demo.bookingRequests.v1:' + encodeURIComponent(motherId)
// Local storage is editable by the browser user. This scope is NOT secure server-side authorization.
export function readBookingRequests(mother, storage = window.localStorage) {
  const raw = storage.getItem(storageKey(mother.id))
  const records = raw ? JSON.parse(raw) : []
  if (!Array.isArray(records)) throw new Error('storageError')
  return records.filter(record => record && record.motherId === mother.id && record.status === 'pending' && mother.children.some(child => child.id === record.childId) && bookingDoctors.some(doctor => doctor.id === record.doctorId) && typeof record.id === 'string' && typeof record.reason === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(record.dateTime) && !Number.isNaN(new Date(record.dateTime).getTime()))
}
export function slotIsPending(mother, records, doctorId, date, time) {
  const doctor = bookingDoctors.find(item => item.id === doctorId)
  const dateTime = date + 'T' + time + ':00'
  return records.some(record => ['pending', 'reschedulePending'].includes(record.status) && record.doctorId === doctorId && record.dateTime === dateTime) || (mother.id === demoMother.id && motherAppointmentDemoData.some(record => ['pending', 'confirmed'].includes(record.status) && record.doctorKey === doctor?.nameKey && record.dateTime === dateTime))
}
export function submitBookingRequest(mother, values, storage = window.localStorage, now = new Date()) {
  if (!mother.id || !mother.children.some(child => child.id === values.childId) || !values.reason?.trim() || values.reason.trim().length > 1000 || !getDoctorSlots(values.doctorId, values.date, now).some(slot => slot.time === values.time && slot.available)) throw new Error('invalidBooking')
  const records = readBookingRequests(mother, storage)
  const reservations = [...records, ...rescheduleReservations(mother, storage)]
  if (slotIsPending(mother, reservations, values.doctorId, values.date, values.time)) throw new Error('duplicateRequest')
  const request = { id: crypto.randomUUID(), createdAt: now.toISOString(), motherId: mother.id, childId: values.childId, doctorId: values.doctorId, dateTime: values.date + 'T' + values.time + ':00', reason: values.reason.trim(), status: 'pending', group: 'pending' }
  try { storage.setItem(storageKey(mother.id), JSON.stringify([...records, request])) } catch { throw new Error('storageError') }
  return request
}

export function readSlotReservations(mother, storage = window.localStorage) {
  return [...readBookingRequests(mother, storage), ...rescheduleReservations(mother, storage)]
}
export function submitRescheduleRequest(mother, appointmentId, values, storage = window.localStorage, now = new Date()) {
  const original = getOwnedAppointment(mother, appointmentId)
  if (!canReschedule(mother, original, now)) throw new Error('ineligible')
  const requests = readRescheduleRequests(mother, storage)
  if (requests.some(request => request.appointmentId === appointmentId)) throw new Error('alreadyPending')
  if (!rescheduleSlotAllowed(original, values.date, values.time, now) || !scheduledSlotExists(original, values.date, values.time, now)) throw new Error('invalidSlot')
  if (slotIsPending(mother, readSlotReservations(mother, storage), doctorIdForAppointment(original), values.date, values.time)) throw new Error('duplicateRequest')
  return saveRescheduleRequest(mother, original, values.date + 'T' + values.time + ':00', requests, storage, now)
}
