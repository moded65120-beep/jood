import assert from 'node:assert/strict'
import { createMedicalRecordRepository, MEDICAL_RECORD_STORAGE_KEY } from './medicalRecordRepository.js'
import { demoDoctorId, demoMotherId, canonicalDemoChildren, motherRouteAliases } from './demoChildAccess.js'
import { selectDoctorPatients, selectMotherChildren, selectMotherMedicalRecord } from './medicalRecordSelectors.js'
import { FOLLOW_UP_STORAGE_KEY } from '../components/doctor/followUpStorage.js'
import { CLINICAL_NOTES_STORAGE_KEY } from '../components/doctor/clinicalNotesStorage.js'
import { ASSESSMENT_STORAGE_KEY } from '../components/doctor/clinicalAssessmentData.js'
import { localVisitDate } from '../components/doctor/medicalVisitData.js'
import { followUpToday } from '../components/doctor/followUpData.js'

const values = new Map([['nomu.doctor.demoBookings.v1.demo-doctor-sarah-ahmad', 'untouched-bookings']])
const storage = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value) }
const doctor = { id: demoDoctorId, name: 'Original Demo Doctor' }
const childId = 'demo-child-3', otherId = 'demo-child-1'
const date = localVisitDate(), followDate = followUpToday(new Date(Date.now() + 10 * 86400000))
const note = { id: 'legacy-note', patientId: childId, date, type: 'diagnosis', diagnosis: '  Original diagnosis  ', observations: '  Original observations  ', plan: 'Original plan', doctor: 'Legacy Doctor', createdAt: new Date().toISOString(), visitId: null }
const assessment = { id: 'legacy-assessment', patientId: childId, date, type: '', findings: 'Original findings', diagnosis: 'Original impression', plan: '', doctor: 'Legacy Doctor', createdAt: new Date().toISOString(), status: 'voided', voidReason: 'Original void reason', voidedAt: new Date().toISOString(), voidedBy: 'Original acting doctor' }
const appointment = { id: 'legacy-followup', patientId: childId, date: followDate, time: '10:00', reason: 'Follow-up reason', instructions: 'Instructions', status: 'scheduled', visitId: null }
values.set(CLINICAL_NOTES_STORAGE_KEY, JSON.stringify({ version: 1, notes: [note] }))
values.set(ASSESSMENT_STORAGE_KEY, JSON.stringify({ version: 1, assessments: [assessment] }))
values.set(FOLLOW_UP_STORAGE_KEY, JSON.stringify({ version: 1, childIds: ['demo-child-9'], appointments: [appointment] }))
const legacyBytes = new Map(values)
const repository = createMedicalRecordRepository(storage)
assert.equal(repository.getWarning(), null)
assert.equal(selectDoctorPatients(repository.getSnapshot(), demoDoctorId).length, 9, 'Initial eight plus restored legacy assignment')
assert.equal(repository.getSnapshot().patients.length, canonicalDemoChildren.length)
assert.equal(new Set(repository.getSnapshot().patients.map(child => child.id)).size, canonicalDemoChildren.length)
assert.equal(motherRouteAliases.adam, childId)
assert.equal(motherRouteAliases.lina, 'demo-child-lina')
assert.equal(selectMotherMedicalRecord(repository.getSnapshot(), demoMotherId, 'lina').profile.dateOfBirth, null)
assert.equal(selectMotherChildren(repository.getSnapshot(), demoMotherId).length, 2)
assert.equal(selectMotherMedicalRecord(repository.getSnapshot(), demoMotherId, otherId), null)
assert.equal(selectMotherMedicalRecord(repository.getSnapshot(), 'unknown-mother', 'adam'), null)
assert.equal(selectMotherMedicalRecord(repository.getSnapshot(), demoMotherId, 'unknown-child'), null)
assert.equal(selectDoctorPatients(repository.getSnapshot(), '__proto__').length, 0)
const beforeOther = JSON.stringify(repository.getSnapshot().patients.find(child => child.id === otherId))
assert.ok(repository.act(doctor, childId, 'visit', [{ id: 'visit-1', date, type: 'routine', chiefComplaint: '', diagnosis: 'Recorded diagnosis', observations: 'Recorded clinical text', treatment: 'Recorded treatment', nextFollowUp: followDate }]))
assert.ok(repository.act(doctor, childId, 'prescription', [{ id: 'rx-1', medication: 'Manually entered medicine', strength: 'Original strength', dosage: 'Original amount and unit', frequency: 'Original frequency', duration: 'Original duration', route: 'oral', instructions: 'Original instructions' }]))
let restored = createMedicalRecordRepository(storage)
assert.equal(restored.getWarning(), null)
let medical = selectMotherMedicalRecord(restored.getSnapshot(), demoMotherId, 'adam')
assert.equal(medical.medicalVisits.length, 1)
assert.equal(medical.prescriptions.length, 1)
assert.equal(medical.prescriptions[0].dosage, 'Original amount and unit')
assert.equal(medical.notes.filter(item => item.source === 'visit').length, 1, 'Visit-derived notes are projected, not copied')
assert.equal(medical.notes.find(item => item.id === note.id).diagnosis, note.diagnosis)
assert.equal(medical.clinicalAssessments[0].voidReason, assessment.voidReason)
assert.equal(medical.clinicalAssessments[0].voidedBy, assessment.voidedBy)
assert.ok(medical.followUps.upcoming.some(item => item.date === followDate))
assert.equal(JSON.stringify(restored.getSnapshot().patients.find(child => child.id === otherId)), beforeOther)
assert.throws(() => { medical.profile.name = 'Tampered' }, TypeError)
assert.throws(() => medical.prescriptions.push({}), TypeError)
assert.throws(() => { medical.notes[0].diagnosis = 'Tampered' }, TypeError)
assert.equal(typeof medical.act, 'undefined')
assert.equal(typeof medical.assignChild, 'undefined')
assert.equal(restored.act({ id: 'mother', name: 'Mother' }, childId, 'visit', [{ id: 'forbidden', date, type: 'routine' }]), false)
assert.equal(restored.act(doctor, childId, 'prescription', [medical.prescriptions[0]]), false, 'Duplicate IDs do not create records')
assert.ok(restored.act(doctor, childId, 'editNote', [note.id, { ...note, plan: 'Updated standalone plan' }]))
assert.ok(restored.act(doctor, childId, 'assessment', [{ id: 'assessment-new', date, type: 'general', findings: 'Manual findings', diagnosis: 'Manual impression', plan: '' }, false]))
assert.ok(restored.act(doctor, childId, 'assessment', [{ id: 'assessment-new', date, type: 'general', findings: 'Updated manual findings', diagnosis: 'Manual impression', plan: '' }, true]))
assert.ok(restored.act(doctor, childId, 'voidAssessment', ['assessment-new', 'Required original reason']))
assert.equal(restored.act(doctor, childId, 'assessment', [{ id: 'assessment-new', date, findings: 'Edit voided', diagnosis: 'Impression' }, true]), false)
assert.ok(restored.act(doctor, childId, 'followUp', [{ id: 'followup-new', date: followDate, time: '12:00', reason: 'Entered reason', instructions: 'Entered instructions' }]))
assert.ok(restored.act(doctor, childId, 'cancelFollowUp', ['followup-new']))
restored = createMedicalRecordRepository(storage)
medical = selectMotherMedicalRecord(restored.getSnapshot(), demoMotherId, 'adam')
assert.equal(medical.notes.find(item => item.id === note.id).plan, 'Updated standalone plan')
assert.equal(medical.clinicalAssessments.find(item => item.id === 'assessment-new').voidReason, 'Required original reason')
assert.ok(medical.followUps.cancelled.some(item => item.id === 'followup-new'))
for (const [key,value] of legacyBytes) assert.equal(values.get(key), value, 'Legacy and Calendar storage remain byte-identical')
const stale = repository.act(doctor, childId, 'visit', [{ id: 'stale', date, type: 'routine' }])
assert.equal(stale, false, 'Stale repository cannot overwrite a newer snapshot')
assert.equal(createMedicalRecordRepository(storage).getSnapshot().patients.find(item => item.id === childId).medicalVisits.length, 1)
const corruptValues = new Map([[CLINICAL_NOTES_STORAGE_KEY, '{invalid']])
const corruptStorage = { getItem: key => corruptValues.get(key) ?? null, setItem: (key,value) => corruptValues.set(key,value) }
const corrupt = createMedicalRecordRepository(corruptStorage)
assert.equal(corrupt.getWarning(), 'invalidStorage')
assert.equal(corrupt.act(doctor, childId, 'visit', [{ id: 'blocked', date, type: 'routine' }]), false)
assert.equal(corruptValues.get(CLINICAL_NOTES_STORAGE_KEY), '{invalid')
assert.equal(corruptValues.has(MEDICAL_RECORD_STORAGE_KEY), false)
const blocked = createMedicalRecordRepository({ getItem() { throw Error('Blocked') } })
assert.equal(blocked.getWarning(), 'storageUnavailable')
const frozenSnapshot = restored.getSnapshot()
assert.throws(() => { frozenSnapshot.patients[0].name = 'Mutate' }, TypeError)
console.log('Shared medical repository: legacy preservation, visit/prescription refresh, note edits, assessment edits/void audit, follow-ups, exact text, stable IDs, child isolation, frozen Mother selectors, stale/invalid storage safety and untouched Calendar data passed')
