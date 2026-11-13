import assert from 'node:assert/strict'
import test from 'node:test'
import { bookingAppointments, canRescheduleDemoBooking, confirmDemoBooking, demoBookingsKey, demoSlotReserved, readDemoBookings, readDemoReservations, rescheduleDemoBooking } from './motherDemoBookings.js'
import { getDoctorAvailableDates, getDoctorSlots } from '../pages/mother/bookingAvailabilityDemo.js'
import { getScheduledFollowUps } from '../pages/mother/motherPortalData.js'

const now = new Date('2026-10-29T07:00:00')
function storage() { const data = new Map(); return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) } }
function selection(time = '09:00') { return { childId: 'adam', doctorId: 'ahmad', date: '2026-10-29', time } }

test('only explicitly mother-created future active bookings are eligible; known doctor follow-ups are read-only', () => {
  const db = storage(), mother = confirmDemoBooking(selection(), db, now)
  assert.equal(mother.createdBy, 'mother')
  assert.equal(canRescheduleDemoBooking(mother, now), true)
  for (const record of [{ ...mother, createdBy: undefined }, { ...mother, createdBy: 'doctor' }, { ...mother, createdBy: 'unknown' }, { ...mother, status: 'cancelled' }, { ...mother, motherId: 'other-mother' }, { ...mother, childId: 'unlinked' }, { ...mother, clinicKey: 'other-clinic' }]) assert.equal(canRescheduleDemoBooking(record, now), false)
  assert.equal(canRescheduleDemoBooking(mother, new Date(mother.dateTime)), false)
  assert.ok(getScheduledFollowUps(now).every(record => record.createdBy === 'doctor' && !canRescheduleDemoBooking(record, now)))
})

test('one logical update preserves ID and ownership, releases the old slot and reserves the new slot across refresh', () => {
  const db = storage(), original = confirmDemoBooking(selection(), db, now)
  const second = confirmDemoBooking({ ...selection(), childId: 'lina', time: '11:00' }, db, now)
  const updated = rescheduleDemoBooking(original.id, { date: original.date, time: '10:00', expectedDateTime: original.dateTime }, db, now)
  for (const field of ['id', 'motherId', 'createdBy', 'childId', 'doctorId', 'clinicKey', 'createdAt', 'status']) assert.equal(updated[field], original[field])
  assert.equal(updated.dateTime, '2026-10-29T10:00:00')
  assert.equal(updated.previousDateTime, original.dateTime)
  assert.equal(updated.updatedAt, now.toISOString())
  const afterRefresh = readDemoBookings({ getItem: key => db.getItem(key) })
  assert.equal(afterRefresh.length, 2)
  assert.deepEqual(afterRefresh.find(item => item.id === second.id), second)
  assert.equal(afterRefresh.find(item => item.id === original.id).dateTime, updated.dateTime)
  assert.equal(demoSlotReserved('ahmad', original.date, original.time, afterRefresh, readDemoReservations(db)), false)
  assert.equal(demoSlotReserved('ahmad', updated.date, updated.time, afterRefresh, readDemoReservations(db)), true)
  assert.equal(bookingAppointments(afterRefresh, now).find(item => item.id === original.id).dateTime, updated.dateTime)
  confirmDemoBooking(selection(), db, now)
  assert.equal(readDemoBookings(db).length, 3)
})

test('missing origin stays read-only without migrating or rewriting legacy records', () => {
  const db = storage(), original = confirmDemoBooking(selection(), db, now)
  const { createdBy: _createdBy, ...legacy } = original
  db.setItem(demoBookingsKey, JSON.stringify([legacy]))
  const before = db.getItem(demoBookingsKey)
  assert.equal(readDemoBookings(db)[0].createdBy, undefined)
  assert.throws(() => rescheduleDemoBooking(original.id, { date: original.date, time: '10:00' }, db, now), /notEligible/)
  assert.equal(db.getItem(demoBookingsKey), before)
})

test('direct unauthorized, past, cancelled, doctor-switch and current-slot requests never modify storage', () => {
  const db = storage(), original = confirmDemoBooking(selection(), db, now)
  const values = { date: original.date, time: '10:00' }
  for (const id of ['nonexistent', 'demo-appointment-1']) assert.throws(() => rescheduleDemoBooking(id, values, db, now), /notEligible/)
  const before = db.getItem(demoBookingsKey)
  assert.throws(() => rescheduleDemoBooking(original.id, { ...values, doctorId: 'rania' }, db, now), /notEligible/)
  assert.throws(() => rescheduleDemoBooking(original.id, { date: original.date, time: original.time }, db, now), /invalidSlot/)
  assert.throws(() => rescheduleDemoBooking(original.id, values, db, new Date(original.dateTime)), /notEligible/)
  for (const values of [{ date: '2026-10-28', time: '10:00' }, { date: '2026-10-30', time: '10:00' }, { date: original.date, time: '20:00' }, { date: '2026-02-31', time: '10:00' }]) assert.throws(() => rescheduleDemoBooking(original.id, values, db, now), /invalidSlot/)
  assert.equal(db.getItem(demoBookingsKey), before)
  for (const replacement of [{ ...original, createdBy: 'doctor' }, { ...original, status: 'cancelled' }]) {
    db.setItem(demoBookingsKey, JSON.stringify([replacement]))
    const snapshot = db.getItem(demoBookingsKey)
    assert.throws(() => rescheduleDemoBooking(original.id, values, db, now))
    assert.equal(db.getItem(demoBookingsKey), snapshot)
  }
})

test('confirmation rechecks conflicts, stale edits and write failures without changing the original appointment', () => {
  const db = storage(), original = confirmDemoBooking(selection(), db, now)
  confirmDemoBooking({ ...selection(), childId: 'lina', time: '10:00' }, db, now)
  let before = db.getItem(demoBookingsKey)
  assert.throws(() => rescheduleDemoBooking(original.id, { date: original.date, time: '10:00' }, db, now), /duplicate/)
  assert.throws(() => rescheduleDemoBooking(original.id, { date: '2026-11-05', time: '10:00' }, db, now), /duplicate/)
  assert.equal(db.getItem(demoBookingsKey), before)
  const changed = rescheduleDemoBooking(original.id, { date: original.date, time: '11:00' }, db, now)
  before = db.getItem(demoBookingsKey)
  assert.throws(() => rescheduleDemoBooking(original.id, { date: original.date, time: '09:00', expectedDateTime: original.dateTime }, db, now), /changed/)
  assert.equal(db.getItem(demoBookingsKey), before)
  const blocked = { getItem: key => db.getItem(key), setItem() { throw Error('quota') } }
  assert.throws(() => rescheduleDemoBooking(changed.id, { date: changed.date, time: '09:00' }, blocked, now), /storageError/)
  assert.equal(db.getItem(demoBookingsKey), before)
})

test('rescheduling continues to use each doctor’s existing independent availability source', () => {
  const db = storage()
  for (const doctorId of ['ahmad', 'rania', 'omar']) {
    const date = getDoctorAvailableDates(doctorId, now)[0]
    const slots = getDoctorSlots(doctorId, date, now).filter(slot => slot.available)
    const original = confirmDemoBooking({ childId: 'adam', doctorId, date, time: slots[0].time }, db, now)
    const updated = rescheduleDemoBooking(original.id, { date, time: slots[1].time }, db, now)
    assert.equal(updated.doctorId, doctorId)
    assert.equal(updated.time, slots[1].time)
  }
})
