import { initialAvailability } from '../components/doctor/appointmentsData.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { bookingDoctors, getDoctorSlots, getDoctorAvailableDates, localDateKey, bookingDateLimit } from '../pages/mother/bookingAvailabilityDemo.js'
import { getBookingMother, readBookingRequests, submitBookingRequest } from './motherBookingRequests.js'

const memory = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } }
const now = new Date('2026-11-01T10:30:00')
const values = { childId: 'adam', doctorId: 'ahmad', date: '2026-11-01', time: '11:00', reason: 'Routine check-up' }

test('three distinct schedules exclude past times, invalid dates, days off and out-of-range dates', () => {
  assert.equal(bookingDoctors.length, 6)
  assert.deepEqual(getDoctorSlots('ahmad', '2026-11-01', now).map(slot => slot.available), [false, false, true])
  assert.deepEqual(getDoctorSlots('rania', '2026-11-01', now), [])
  assert.deepEqual(getDoctorSlots('ahmad', '2026-10-31', now), [])
  assert.deepEqual(getDoctorSlots('ahmad', '2027-02-31', now), [])
  assert.deepEqual(getDoctorSlots('ahmad', '2027-11-01', now), [])
  assert.notDeepEqual(bookingDoctors[0].times, bookingDoctors[1].times)
  assert.notDeepEqual(bookingDoctors[1].times, bookingDoctors[2].times)
})

test('persists pending requests and rejects a duplicate even for another child', () => {
  const storage = memory(), mother = getBookingMother()
  const request = submitBookingRequest(mother, values, storage, now)
  assert.equal(request.status, 'pending')
  assert.equal(readBookingRequests(mother, storage)[0].reason, values.reason)
  assert.throws(() => submitBookingRequest(mother, { ...values, childId: 'lina' }, storage, now), /duplicateRequest/)
})

test('rejects unlinked children, blank reasons, past times and unavailable doctor days', () => {
  for (const patch of [{ childId: 'other-child' }, { reason: '   ' }, { reason: 'x'.repeat(1001) }, { time: '09:00' }, { doctorId: 'rania' }, { doctorId: 'unknown' }]) {
    assert.throws(() => submitBookingRequest(getBookingMother(), { ...values, ...patch }, memory(), now), /invalidBooking/)
  }
})

test('scopes data per mother and never gives an authenticated mother fallback children', () => {
  const mother = getBookingMother({ id: 'mother-a', children: [{ id: 'adam', name: 'Adam', motherId: 'mother-a' }, { id: 'other-child', name: 'Other', motherId: 'mother-b' }] })
  assert.deepEqual(mother.children.map(child => child.id), ['adam'])
  assert.deepEqual(getBookingMother({ id: 'mother-b', children: [] }).children, [])
  const storage = memory()
  submitBookingRequest(mother, values, storage, now)
  assert.equal(readBookingRequests(getBookingMother({ id: 'mother-b', children: [{ id: 'adam', motherId: 'mother-b' }] }), storage).length, 0)
})

test('blocked or corrupt storage never reports a successful save', () => {
  assert.throws(() => submitBookingRequest(getBookingMother(), values, { getItem: () => null, setItem: () => { throw new Error('blocked') } }, now), /storageError/)
  assert.throws(() => submitBookingRequest(getBookingMother(), values, { getItem: () => '{broken' }, now))
})


test('date cards cover only the rolling 30 local days and omit past or fully reserved days', () => {
  const previousWindow = globalThis.window
  globalThis.window = { localStorage: { getItem: () => null } }
  try {
  for (const reference of [now, new Date('2026-12-25T08:00:00'), new Date('2028-02-20T08:00:00')]) {
    for (const doctor of bookingDoctors) {
      const dates = getDoctorAvailableDates(doctor.id, reference)
      assert.ok(dates.length > 0)
      assert.equal(new Set(dates).size, dates.length)
      for (const date of dates) {
        assert.ok(date >= localDateKey(reference) && date <= bookingDateLimit(reference))
        assert.ok((doctor.days || initialAvailability(doctor.id).days.filter(day => day.enabled).map(day => day.day)).includes(new Date(date + 'T00:00:00').getDay()))
        assert.ok(getDoctorSlots(doctor.id, date, reference).some(slot => slot.available))
      }
      const reservedDate = dates[0]
      assert.ok(!getDoctorAvailableDates(doctor.id, reference, date => date === reservedDate).includes(reservedDate))
      assert.deepEqual(getDoctorAvailableDates(doctor.id, reference, () => true), [])
    }
  }
  } finally { globalThis.window = previousWindow }
  assert.equal(bookingDateLimit(now), '2026-11-30')
  assert.ok(!getDoctorAvailableDates('ahmad', new Date('2026-11-01T12:00:00')).includes('2026-11-01'))
  assert.throws(() => submitBookingRequest(getBookingMother(), { ...values, date: '2026-12-01', time: '11:00' }, memory(), now), /invalidBooking/)
})
