import assert from 'node:assert/strict'
import { localVisitDate, saveMedicalVisit, validateMedicalVisit } from './medicalVisitData.js'

const today = '2026-10-20'
const child = {
  id: 'child-a', dateOfBirth: '2024-10-18', lastVisit: '2026-10-12',
  nextFollowUp: '2026-11-03', medicalVisits: [], medicalNotes: [], visits: [],
}
const otherChild = { ...child, id: 'child-b' }
const patients = [child, otherChild]
const draft = {
  id: 'visit-1', date: today, type: 'routine', chiefComplaint: '', diagnosis: '',
  observations: ' Original clinical text. ', treatment: '', nextFollowUp: '2026-11-10',
}
assert.equal(localVisitDate(new Date(2026, 0, 2, 0, 1)), '2026-01-02')
assert.deepEqual(validateMedicalVisit({ date: '', type: '' }, child, today), { date: 'dateRequired', type: 'typeRequired' })
assert.equal(validateMedicalVisit({ ...draft, date: '2026-02-30' }, child, today).date, 'dateRequired')
assert.equal(validateMedicalVisit({ ...draft, date: '2026-10-21' }, child, today).date, 'futureVisit')
assert.equal(validateMedicalVisit({ ...draft, date: '2024-10-17' }, child, today).date, 'beforeBirth')
assert.equal(validateMedicalVisit({ ...draft, type: 'invalid' }, child, today).type, 'typeRequired')
assert.equal(validateMedicalVisit({ ...draft, nextFollowUp: '2026-10-19' }, child, today).nextFollowUp, 'followupBeforeVisit')
assert.deepEqual(validateMedicalVisit(draft, child, today), {})

const updated = saveMedicalVisit(patients, child.id, draft, 'Doctor Original Name', today)
assert.equal(updated[0].medicalVisits.length, 1)
assert.equal(updated[0].medicalVisits[0].patientId, child.id)
assert.equal(updated[0].medicalVisits[0].diagnosis, '')
assert.equal(updated[0].medicalVisits[0].observations, 'Original clinical text.')
assert.equal(updated[0].medicalNotes, child.medicalNotes, 'Visit notes are not copied into a second collection')
assert.equal(updated[0].lastVisit, today)
assert.equal(updated[0].lastVisitDoctor, 'Doctor Original Name')
assert.equal(updated[0].nextFollowUp, '2026-11-10')
assert.equal(updated[1], otherChild, 'Only the selected child changes')
assert.equal(child.medicalVisits.length, 0, 'Original mock records are not mutated')
assert.equal(saveMedicalVisit(updated, child.id, draft, 'Doctor', today), updated, 'Repeated submission IDs are ignored')
assert.equal(saveMedicalVisit(patients, 'unknown', draft, 'Doctor', today), patients)
assert.equal(saveMedicalVisit(patients, child.id, { ...draft, date: '' }, 'Doctor', today), patients)

const backdated = saveMedicalVisit(updated, child.id, { ...draft, id: 'visit-2', date: '2026-10-10', nextFollowUp: '2026-10-30' }, 'Different Doctor', today)
assert.equal(backdated[0].medicalVisits.length, 2)
assert.equal(backdated[0].lastVisit, today)
assert.equal(backdated[0].lastVisitDoctor, 'Doctor Original Name')
assert.equal(backdated[0].nextFollowUp, '2026-10-30', 'The next display uses the earliest scheduled future appointment')
const noFollowup = saveMedicalVisit(updated, child.id, { ...draft, id: 'visit-3', nextFollowUp: '' }, 'Doctor', today)
assert.equal(noFollowup[0].nextFollowUp, '2026-11-10')
const revisitOtherChild = saveMedicalVisit(updated, otherChild.id, { ...draft, id: 'visit-4' }, 'Doctor', today)
assert.equal(revisitOtherChild[0], updated[0], 'Saved visits survive changing the selected child')
assert.equal(revisitOtherChild[1].medicalVisits[0].patientId, otherChild.id)
console.log('Medical visit validation, child isolation, duplicate prevention, summary updates, backdated visits and in-app state retention passed')
