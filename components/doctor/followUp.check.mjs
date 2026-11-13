import assert from 'node:assert/strict'
import { followUpDraft, saveFollowUp, validateFollowUp, formatFollowUpTime, appointmentGroup, cancelFollowUp } from './followUpData.js'
import { saveMedicalVisit } from './medicalVisitData.js'

const today = '2026-10-20'
const historicalVisit = { id: 'old-visit', date: '2026-10-01', nextFollowUp: '2026-10-15' }
const child = { id: 'child-a', dateOfBirth: '2024-01-01', lastVisit: '2026-10-01', nextFollowUp: '2026-10-15', medicalVisits: [historicalVisit], prescriptions: [{ id: 'rx' }] }
const other = { id: 'child-b' }
const patients = [child, other]
const draft = { date: '2026-11-01', time: '10:30', reason: ' سبب المتابعة ', instructions: 'تعليمات أصلية\nدون ترجمة' }
assert.deepEqual(followUpDraft(other), { date: '', time: '', reason: '', instructions: '' }, 'No automatic date selection')
assert.equal(validateFollowUp({ date: '' }, today).date, 'dateRequired')
assert.equal(validateFollowUp({ date: '2026-02-30' }, today).date, 'dateRequired')
assert.equal(validateFollowUp({ date: '2026-10-19' }, today).date, 'pastDate')
assert.equal(validateFollowUp({ ...draft, time: '24:00' }, today).time, 'invalidTime')
assert.deepEqual(validateFollowUp({ date: today }, today), {}, 'Today and blank optional values are valid')
const updated = saveFollowUp(patients, child.id, draft, today)
assert.deepEqual(followUpDraft(updated[0]), draft, 'Reopening restores all fields exactly')
assert.equal(updated[1], other)
assert.equal(updated[0].medicalVisits, child.medicalVisits)
assert.equal(updated[0].medicalVisits[0], historicalVisit)
assert.equal(updated[0].medicalVisits[0].nextFollowUp, '2026-10-15')
assert.equal(updated[0].prescriptions, child.prescriptions)
assert.equal(child.nextFollowUp, '2026-10-15', 'No mutation of original mock records')
assert.equal(saveFollowUp(patients, 'unknown', draft, today), patients)
assert.equal(saveFollowUp(patients, child.id, { date: '2026-10-19' }, today), patients)
const appointmentId = updated[0].followUpAppointments.find(item => item.date === draft.date).id
const originalCount = updated[0].followUpAppointments.length
const rescheduled = saveFollowUp(updated, child.id, { ...draft, id: appointmentId, date: '2026-11-03' }, today)
assert.equal(rescheduled[0].nextFollowUp, '2026-11-03')
assert.equal(rescheduled[0].medicalVisits, child.medicalVisits)
assert.equal(rescheduled[0].followUpAppointments.length, originalCount, 'Editing reuses the appointment ID')
const optionalCleared = saveFollowUp(rescheduled, child.id, { id: appointmentId, date: '2026-11-04' }, today)
assert.deepEqual(followUpDraft(optionalCleared[0]), { date: '2026-11-04', time: '', reason: '', instructions: '' })

const visit = { id: 'new-visit', date: today, type: 'followup', nextFollowUp: draft.date }
const sameDate = saveMedicalVisit(updated, child.id, visit, 'Doctor', today)
assert.deepEqual(followUpDraft(sameDate[0]), draft, 'A visit with the same follow-up date retains schedule details')
const differentDate = saveMedicalVisit(updated, child.id, { ...visit, nextFollowUp: '2026-11-10' }, 'Doctor', today)
assert.deepEqual(followUpDraft(differentDate[0]), { date: '2026-11-10', time: '', reason: '', instructions: '' })
assert.equal(differentDate[0].medicalVisits.at(-1).nextFollowUp, '2026-11-10')
const manuallyRescheduled = saveFollowUp(differentDate, child.id, draft, today)
assert.equal(manuallyRescheduled[0].medicalVisits.at(-1).nextFollowUp, '2026-11-10', 'Rescheduling never rewrites historical visits')
for (const language of ['en', 'ar']) assert.ok(formatFollowUpTime('10:30', language))
assert.equal(formatFollowUpTime('', 'en'), '')
const cancelled = cancelFollowUp(updated, child.id, appointmentId, today)
assert.equal(cancelled[0].followUpAppointments.find(item => item.id === appointmentId).status, 'cancelled')
assert.equal(cancelled[0].nextFollowUp, null)
assert.equal(cancelled[0].medicalVisits, child.medicalVisits)
assert.equal(saveFollowUp(cancelled, child.id, { ...draft, id: appointmentId }, today), cancelled, 'Cancelled appointments cannot be silently overwritten')
assert.equal(appointmentGroup({ date: '2026-10-01', status: 'scheduled' }, today), 'past', 'Passing a date does not mark a visit missed')
assert.equal(appointmentGroup({ date: '2026-10-01', status: 'missed' }, today), 'missed')
const again = saveFollowUp(updated, child.id, { ...draft, id: appointmentId }, today)
assert.equal(again[0].followUpAppointments.length, originalCount, 'Repeated saves do not create duplicates')
console.log('Follow-up validation, child isolation, rescheduling, optional fields, exact text, shared visit state and historical visit preservation passed')
