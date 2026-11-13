import assert from 'node:assert/strict'
import { prescriptionRequiredFields, savePrescription, validatePrescription } from './prescriptionData.js'

const now = new Date(2026, 9, 20, 12)
const child = { id: 'child-a', medicalVisits: [{ id: 'existing-visit' }], medicalNotes: [], lastVisit: '2026-10-10', nextFollowUp: '2026-11-01' }
const otherChild = { id: 'child-b' }
const patients = [child, otherChild]
const draft = { id: 'rx-test', medication: ' Test medication ', strength: 'Entered concentration', dosage: 'Entered amount and unit', frequency: 'Entered frequency', duration: 'Entered duration', route: 'oral', instructions: 'تعليمات أصلية دون ترجمة.' }

assert.deepEqual(Object.keys(validatePrescription({})), prescriptionRequiredFields)
assert.equal(validatePrescription({ ...draft, medication: '  ' }).medication, 'required')
assert.equal(validatePrescription({ ...draft, route: 'unknown' }).route, 'routeRequired')
assert.deepEqual(validatePrescription(draft), {})
const saved = savePrescription(patients, child.id, draft, 'Original doctor name', now)
assert.equal(saved[0].prescriptions.length, 1)
assert.equal(saved[0].prescriptions[0].patientId, child.id)
assert.equal(saved[0].prescriptions[0].visitId, null)
assert.equal(saved[0].prescriptions[0].datePrescribed, '2026-10-20')
assert.equal(saved[0].prescriptions[0].medication, draft.medication)
assert.equal(saved[0].prescriptions[0].instructions, draft.instructions)
assert.equal(saved[0].prescriptions[0].doctor, 'Original doctor name')
assert.equal(saved[1], otherChild)
assert.equal(child.prescriptions, undefined, 'Original mock data is unchanged')
assert.equal(saved[0].medicalVisits, child.medicalVisits, 'Prescriptions are not duplicated into visits')
assert.equal(saved[0].medicalNotes, child.medicalNotes)
assert.equal(saved[0].lastVisit, child.lastVisit)
assert.equal(saved[0].nextFollowUp, child.nextFollowUp)
assert.equal(savePrescription(saved, child.id, draft, 'Doctor', now), saved, 'Duplicate IDs are ignored')
assert.equal(savePrescription(patients, 'unknown-child', draft, 'Doctor', now), patients)
assert.equal(savePrescription(patients, child.id, { ...draft, dosage: '' }, 'Doctor', now), patients)
const otherSaved = savePrescription(saved, otherChild.id, { ...draft, id: 'rx-other', strength: '', instructions: '' }, 'Doctor', now)
assert.equal(otherSaved[0], saved[0], 'Existing child prescriptions survive navigation to another child')
assert.equal(otherSaved[1].prescriptions[0].patientId, otherChild.id)
assert.equal(otherSaved[1].prescriptions[0].strength, '')
assert.equal(otherSaved[1].prescriptions[0].instructions, '')
const rawDraft = { ...draft, id: 'rx-raw', medication: ' اسم كما كتبه الطبيب ', dosage: ' مقدار ووحدة يحددهما الطبيب ', frequency: ' تكرار يحدده الطبيب ', duration: ' مدة يحددها الطبيب ', instructions: '  سطر أول\nسطر ثان  ' }
const snapshot = structuredClone(rawDraft)
validatePrescription({ ...rawDraft, frequency: '  ' })
assert.deepEqual(rawDraft, snapshot, 'Validation does not change entered values')
const rawSaved = savePrescription(saved, child.id, rawDraft, 'Doctor', now)
for (const field of ['medication', 'dosage', 'frequency', 'duration', 'instructions']) assert.equal(rawSaved[0].prescriptions.at(-1)[field], rawDraft[field])
console.log('Prescription validation, child isolation, duplicate prevention, optional fields, visit independence and state retention passed')
