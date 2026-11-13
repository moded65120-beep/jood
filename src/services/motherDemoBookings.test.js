import assert from 'node:assert/strict'
import test from 'node:test'
import { bookingAppointments, confirmDemoBooking, demoBookingDoctors, demoBookingsKey, demoSlotReserved, readDemoBookings, readDemoReservations } from './motherDemoBookings.js'
import { getDoctorAvailableDates, getDoctorSlots } from '../pages/mother/bookingAvailabilityDemo.js'

const now = new Date('2026-10-29T07:00:00')
function storage() {
  const data = new Map()
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
}
function selection(doctorId = 'ahmad', childId = 'adam') {
  const date = getDoctorAvailableDates(doctorId, now)[0]
  return { childId, doctorId, date, time: getDoctorSlots(doctorId, date, now).find(slot => slot.available).time }
}

test('confirmed demo bookings persist with unique IDs, provider/clinic metadata, and unchanged legacy data', () => {
  const db = storage()
  db.setItem('unrelated', 'keep')
  const a = confirmDemoBooking(selection(), db, now)
  const b = confirmDemoBooking(selection('rania', 'lina'), db, now)
  assert.notEqual(a.id, b.id)
  assert.equal(a.status, 'demo-confirmed')
  assert.equal(a.clinicKey, demoBookingDoctors[0].clinicKey)
  assert.equal(a.dateTime, a.date + 'T' + a.time + ':00')
  assert.deepEqual(readDemoBookings(db), [a, b])
  assert.equal(db.getItem('unrelated'), 'keep')
  assert.equal(bookingAppointments(readDemoBookings(db), now).filter(item => item.period === 'upcoming').length, 2)
  assert.equal(bookingAppointments(readDemoBookings(db), new Date('2027-01-01')).filter(item => item.period === 'past').length, 2)
})

test('confirmation rechecks duplicates across children and reserves existing follow-ups and pending requests', () => {
  const db = storage()
  const values = selection()
  confirmDemoBooking(values, db, now)
  assert.throws(() => confirmDemoBooking({ ...values, childId: 'lina' }, db, now), /duplicate/)
  assert.equal(readDemoBookings(db).length, 1)
  assert.throws(() => confirmDemoBooking({ childId: 'adam', doctorId: 'ahmad', date: '2026-11-05', time: '10:00' }, db, now), /duplicate/)
  const pending = { id: 'old-request', motherId: 'demo-mother-sara', childId: 'adam', doctorId: 'rania', dateTime: '2026-11-02T11:30:00', reason: 'Existing request', status: 'pending', group: 'pending' }
  db.setItem('nomu.demo.bookingRequests.v1:demo-mother-sara', JSON.stringify([pending]))
  assert.throws(() => confirmDemoBooking({ childId: 'lina', doctorId: 'rania', date: '2026-11-02', time: '11:30' }, db, now), /duplicate/)
  assert.equal(JSON.parse(db.getItem('nomu.demo.bookingRequests.v1:demo-mother-sara'))[0].id, 'old-request')
})

test('invalid child, doctor, wrong schedule, stale slot, past dates, and impossible dates never save', () => {
  const db = storage()
  for (const values of [
    { ...selection(), childId: 'not-linked' },
    { ...selection(), childId: '__proto__' },
    { ...selection(), doctorId: 'not-a-doctor' },
    { ...selection(), time: '22:00' },
    { ...selection(), date: '2026-10-28' },
    { ...selection(), date: '2026-02-31' },
  ]) assert.throws(() => confirmDemoBooking(values, db, now), /invalidSlot/)
  const values = selection()
  assert.throws(() => confirmDemoBooking(values, db, new Date(values.date + 'T' + values.time + ':00')), /invalidSlot/)
  assert.deepEqual(readDemoBookings(db), [])
})

test('blocked, corrupt, and malformed storage fails safely without overwriting it', () => {
  const db = storage()
  for (const raw of ['not json', '{}', '[null]']) {
    db.setItem(demoBookingsKey, raw)
    assert.throws(() => confirmDemoBooking(selection(), db, now), /storageError/)
    assert.equal(db.getItem(demoBookingsKey), raw)
  }
  assert.throws(() => readDemoBookings({ getItem() { throw Error('blocked') } }), /storageError/)
  assert.throws(() => confirmDemoBooking(selection(), { getItem: () => null, setItem() { throw Error('quota') } }, now), /storageError/)
  db.data.clear()
  const valid = confirmDemoBooking(selection(), db, now)
  for (const invalid of [{ ...valid, date: '2026-02-31', dateTime: '2026-02-31T09:00:00' }, { ...valid, childId: 'other' }, { ...valid, clinicKey: 'real-clinic' }]) {
    db.setItem(demoBookingsKey, JSON.stringify([invalid]))
    assert.throws(() => readDemoBookings(db), /storageError/)
  }
  db.setItem(demoBookingsKey, JSON.stringify([valid, valid]))
  assert.throws(() => readDemoBookings(db), /storageError/)
})

test('each fictional provider keeps a distinct availability schedule and local reservation filter', () => {
  const db = storage()
  const schedules = demoBookingDoctors.map(doctor => JSON.stringify([doctor.days, doctor.times]))
  assert.equal(new Set(schedules).size, 6)
  const values = selection()
  confirmDemoBooking(values, db, now)
  assert.ok(demoSlotReserved(values.doctorId, values.date, values.time, readDemoBookings(db), readDemoReservations(db)))
  assert.equal(demoSlotReserved('rania', values.date, values.time, readDemoBookings(db), []), false)
})
