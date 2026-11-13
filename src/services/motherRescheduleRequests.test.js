import test from 'node:test'
import assert from 'node:assert/strict'
import { getBookingMother, submitBookingRequest, submitRescheduleRequest, readBookingRequests } from './motherBookingRequests.js'
import { canReschedule, getOwnedAppointment, readRescheduleRequests, rescheduleSlotAllowed } from './motherRescheduleRequests.js'
import { motherAppointmentDemoData } from '../pages/mother/motherAppointmentDemoData.js'
const mother = getBookingMother()
const now = new Date('2026-10-28T10:00:00')
const proposed = { date: '2026-11-03', time: '09:00' }
const memory = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) } }

test('eligibility uses the exact original timestamp and enforces the 24-hour boundary', () => {
  const original = getOwnedAppointment(mother, 'demo-appointment-1')
  const boundary = new Date(new Date(original.dateTime).getTime() - 86400000)
  assert.equal(canReschedule(mother, original, boundary), true)
  assert.equal(canReschedule(mother, original, new Date(boundary.getTime() + 1)), false)
  assert.throws(() => submitRescheduleRequest(mother, original.id, proposed, memory(), new Date(boundary.getTime() + 1)), /ineligible/)
  for (const id of ['demo-appointment-3', 'demo-appointment-4', 'missing']) assert.equal(canReschedule(mother, getOwnedAppointment(mother, id), now), false)
  assert.equal(getOwnedAppointment({ id: 'other-mother', children: mother.children }, original.id), undefined)
  assert.throws(() => submitRescheduleRequest({ id: 'other-mother', children: mother.children }, original.id, proposed, memory(), now), /ineligible/)
})

test('proposal preserves confirmed originals, booking storage and reason, and blocks duplicate active requests', () => {
  const storage = memory(), before = JSON.stringify(motherAppointmentDemoData)
  submitBookingRequest(mother, {childId:'lina',doctorId:'rania',date:'2026-11-02',time:'13:00',reason:'Check-up'}, storage, now)
  const request = submitRescheduleRequest(mother, 'demo-appointment-1', proposed, storage, now)
  assert.equal(request.status, 'reschedulePending')
  assert.equal(request.appointmentId, 'demo-appointment-1')
  assert.equal(request.originalDateTime, '2026-11-05T10:00:00')
  assert.equal(JSON.stringify(motherAppointmentDemoData), before)
  assert.equal(readBookingRequests(mother, storage).length,1)
  assert.equal(readRescheduleRequests(mother, storage).length,1)
  assert.throws(() => submitRescheduleRequest(mother, request.appointmentId, {date:'2026-11-03',time:'10:00'}, storage, now), /alreadyPending/)
  assert.throws(() => submitBookingRequest(mother, {childId:'adam',doctorId:'ahmad',...proposed,reason:'Visit'}, storage, now), /duplicateRequest/)
})

test('new slots exclude original, wrong schedule, past, and less than 24 hours', () => {
  const original = getOwnedAppointment(mother, 'demo-appointment-1')
  assert.equal(rescheduleSlotAllowed(original, '2026-10-29', '10:00', now),true)
  assert.equal(rescheduleSlotAllowed(original, '2026-10-29', '09:00', now),false)
  for(const proposed of [{date:'2026-11-05',time:'10:00'},{date:'2026-11-02',time:'09:00'},{date:'2026-10-29',time:'09:00'},{date:'2026-02-31',time:'10:00'},{date:'2026-10-27',time:'10:00'}]) assert.throws(()=>submitRescheduleRequest(mother,original.id,proposed,memory(),now),/invalidSlot/)
})

test('booking conflicts, corrupted storage, and blocked writes fail safely', () => {
 const storage=memory()
 submitBookingRequest(mother,{childId:'adam',doctorId:'ahmad',...proposed,reason:'Existing request'},storage,now)
 assert.throws(()=>submitRescheduleRequest(mother,'demo-appointment-1',proposed,storage,now),/duplicateRequest/)
 assert.throws(()=>submitRescheduleRequest(mother,'demo-appointment-1',proposed,{getItem:()=>'{bad'},now),/storageError/)
 assert.throws(()=>submitRescheduleRequest(mother,'demo-appointment-1',proposed,{getItem:()=>null,setItem:()=>{throw Error('blocked')}},now),/storageError/)
})
