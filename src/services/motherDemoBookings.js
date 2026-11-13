import { bookingDoctors, getDoctorSlots } from '../pages/mother/bookingAvailabilityDemo.js'
import { demoChildren } from '../pages/mother/childDemoData.js'
import { getBookingMother, readSlotReservations, slotIsPending } from './motherBookingRequests.js'

// Replacement boundary for a future API. These are fictional providers and clinics.
export const demoBookingDoctors = bookingDoctors.map(doctor => ({ ...doctor, clinicKey: 'demoBooking.clinic' + doctor.id }))
export const demoBookingsKey = 'nomu.demo.confirmedBookings.v1'
export const demoBookingsChanged = 'nomu:demo-bookings-changed'

export function readDemoBookings(storage = window.localStorage) {
  try {
    const records = JSON.parse(storage.getItem(demoBookingsKey) || '[]')
    if (!Array.isArray(records)) throw Error()
    const ids = new Set()
    const slots = new Set()
    for (const item of records) {
      const doctor = demoBookingDoctors.find(doctor => doctor.id === item?.doctorId)
      const slot = item?.doctorId + ':' + item?.dateTime
      if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) || slots.has(slot) || item.motherId !== 'demo-mother-sara' || !Object.hasOwn(demoChildren, item.childId) || !doctor || item.clinicKey !== doctor.clinicKey || item.status !== 'demo-confirmed' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !/^\d{2}:\d{2}$/.test(item.time) || item.dateTime !== item.date + 'T' + item.time + ':00' || Number.isNaN(new Date(item.dateTime).getTime())) throw Error()
      const parsed = new Date(item.dateTime)
      if (parsed.getFullYear() !== Number(item.date.slice(0, 4)) || parsed.getMonth() + 1 !== Number(item.date.slice(5, 7)) || parsed.getDate() !== Number(item.date.slice(8, 10)) || parsed.getHours() !== Number(item.time.slice(0, 2)) || parsed.getMinutes() !== Number(item.time.slice(3))) throw Error()
      ids.add(item.id)
      slots.add(slot)
    }
    return records
  } catch { throw Error('storageError') }
}

export function demoSlotReserved(doctorId, date, time, records, legacyReservations = []) {
  return records.some(item => item.doctorId === doctorId && item.date === date && item.time === time)
    || slotIsPending(getBookingMother(), legacyReservations, doctorId, date, time)
}

export function readDemoReservations(storage = window.localStorage) {
  try { return readSlotReservations(getBookingMother(), storage) } catch { throw Error('storageError') }
}

export function confirmDemoBooking(values, storage = window.localStorage, now = new Date()) {
  const doctor = demoBookingDoctors.find(item => item.id === values.doctorId)
  if (!Object.hasOwn(demoChildren, values.childId) || !doctor || !getDoctorSlots(values.doctorId, values.date, now).some(slot => slot.time === values.time && slot.available)) throw Error('invalidSlot')
  // Read again at confirmation, rather than trusting the slots rendered earlier.
  const records = readDemoBookings(storage)
  if (demoSlotReserved(values.doctorId, values.date, values.time, records, readDemoReservations(storage))) throw Error('duplicate')
  const record = { id: crypto.randomUUID(), motherId: 'demo-mother-sara', createdBy: 'mother', childId: values.childId, doctorId: doctor.id, clinicKey: doctor.clinicKey, date: values.date, time: values.time, dateTime: values.date + 'T' + values.time + ':00', status: 'demo-confirmed', createdAt: now.toISOString() }
  try { storage.setItem(demoBookingsKey, JSON.stringify([...records, record])) } catch { throw Error('storageError') }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(demoBookingsChanged))
  return record
}

// Missing/unknown origin is intentionally read-only; no migration guesses ownership.
export function canRescheduleDemoBooking(record, now = new Date()) {
  return Boolean(record && record.createdBy === 'mother' && record.motherId === 'demo-mother-sara' && Object.hasOwn(demoChildren, record.childId) && record.status === 'demo-confirmed' && new Date(record.dateTime) > now && demoBookingDoctors.some(doctor => doctor.id === record.doctorId && doctor.clinicKey === record.clinicKey))
}

export function rescheduleDemoBooking(bookingId, values, storage = window.localStorage, now = new Date()) {
  // Re-read the authoritative collection; never trust a UI-provided appointment object.
  const records = readDemoBookings(storage)
  const original = records.find(record => record.id === bookingId)
  if (!canRescheduleDemoBooking(original, now) || !values || Object.keys(values).some(key => !['date', 'time', 'expectedDateTime'].includes(key))) throw Error('notEligible')
  if (values.expectedDateTime && values.expectedDateTime !== original.dateTime) throw Error('changed')
  const dateTime = values.date + 'T' + values.time + ':00'
  if (dateTime === original.dateTime || !getDoctorSlots(original.doctorId, values.date, now).some(slot => slot.available && slot.time === values.time)) throw Error('invalidSlot')
  if (demoSlotReserved(original.doctorId, values.date, values.time, records.filter(record => record.id !== bookingId), readDemoReservations(storage))) throw Error('duplicate')
  const updated = { ...original, date: values.date, time: values.time, dateTime, previousDateTime: original.dateTime, updatedAt: now.toISOString() }
  const next = records.map(record => record.id === bookingId ? updated : record)
  // One write replaces the record: on failure the original collection stays untouched.
  try { storage.setItem(demoBookingsKey, JSON.stringify(next)) } catch { throw Error('storageError') }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(demoBookingsChanged))
  return updated
}

export function bookingAppointments(records, now = new Date()) {
  return records.map(record => ({ ...record, childKey: record.childId, doctorKey: demoBookingDoctors.find(doctor => doctor.id === record.doctorId).nameKey, specialtyKey: demoBookingDoctors.find(doctor => doctor.id === record.doctorId).specialtyKey, period: new Date(record.dateTime) > now ? 'upcoming' : 'past', demoBooking: true }))
}
