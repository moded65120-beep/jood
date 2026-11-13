import assert from 'node:assert/strict'
import { clinicalNotesFor, saveClinicalNote, updateClinicalNote, validateClinicalNote } from './clinicalNotesData.js'
import { CLINICAL_NOTES_STORAGE_KEY, loadStandaloneNotes, persistStandaloneNotes } from './clinicalNotesStorage.js'
import { registeredPatients } from './patientData.js'

const now = new Date(2026, 9, 20, 12)
const visit = { id: 'visit-test', patientId: registeredPatients[0].id, date: '2026-10-18', type: 'routine', diagnosis: 'Entered diagnosis', observations: 'Entered observations', treatment: 'Entered recommendation', doctor: 'Original doctor' }
const child = { ...registeredPatients[0], medicalVisits: [visit], medicalNotes: [{ id: visit.id, date: visit.date, text: visit.observations, doctor: visit.doctor }] }
const other = registeredPatients[1]
const patients = [child, other]
const draft = { id: `${child.id}:note-test`, type: 'observation', date: '2026-10-20', diagnosis: '', observations: '  ملاحظات عربية أصلية\nدون ترجمة  ', plan: 'Original plan', visitId: visit.id }
assert.equal(clinicalNotesFor(child).length, 1, 'Mirrored visit notes are not duplicated')
assert.equal(clinicalNotesFor(child)[0].observations, visit.observations)
assert.equal(clinicalNotesFor(child, 'diagnosis').length, 1)
assert.equal(clinicalNotesFor(child, 'observation').length, 0, 'Diagnosis records with observations are not observation records')
assert.equal(validateClinicalNote({ ...draft, type: '' }, child, '2026-10-20').type, 'typeRequired')
assert.equal(validateClinicalNote({ ...draft, type: 'diagnosis' }, child, '2026-10-20').diagnosis, 'diagnosisRequired')
assert.equal(validateClinicalNote({ ...draft, observations: ' ' }, child, '2026-10-20').observations, 'observationsRequired')
assert.equal(validateClinicalNote({ ...draft, date: '' }, child, '2026-10-20').date, 'dateRequired')
assert.equal(validateClinicalNote({ ...draft, visitId: 'another-child-visit' }, child, '2026-10-20').visitId, 'invalidVisit')
const updated = saveClinicalNote(patients, child.id, draft, 'Original doctor', now)
assert.equal(updated[0].medicalVisits, child.medicalVisits)
assert.equal(updated[0].medicalNotes, child.medicalNotes)
assert.equal(updated[1], other)
assert.equal(updated[0].standaloneNotes[0].patientId, child.id)
assert.equal(updated[0].standaloneNotes[0].observations, draft.observations)
assert.equal(updated[0].standaloneNotes[0].visitId, visit.id)
assert.equal(saveClinicalNote(updated, child.id, draft, 'Doctor', now), updated)
assert.equal(saveClinicalNote(patients, other.id, draft, 'Doctor', now), patients, 'Cross-child links are rejected')
assert.equal(clinicalNotesFor(updated[0]).length, 2)
assert.equal(clinicalNotesFor(updated[0])[0].date, draft.date, 'Newest note first')
const withFollowup = saveClinicalNote(updated, child.id, { ...draft, id: 'followup-note', type: 'followup' }, 'Doctor', now)
assert.equal(clinicalNotesFor(withFollowup[0], 'followup').length, 1)
const beforeFiltering = JSON.stringify(withFollowup[0])
for (const type of ['diagnosis', 'observation', 'followup']) {
  const visible = clinicalNotesFor(withFollowup[0], type)
  assert.equal(visible.length, 1)
  assert.ok(visible.every(note => note.type === type), 'Categories use stored types, not populated text fields')
  const selected = visible[0]
  assert.deepEqual(clinicalNotesFor(withFollowup[0]).find(note => note.id === selected.id), selected, 'Filtered cards retain their full detail record and stable ID')
}
assert.equal(clinicalNotesFor(withFollowup[0], 'all').length, 3)
assert.equal(clinicalNotesFor(child, 'followup').length, 0, 'Empty categories return no records')
assert.equal(JSON.stringify(withFollowup[0]), beforeFiltering, 'Switching filters never changes saved records')
const values = new Map([['nomu.language', 'ar'], ['nomu.doctor.demoFollowUpAppointments.v1', 'unchanged']])
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
assert.ok(persistStandaloneNotes(updated, storage))
assert.equal(values.get('nomu.language'), 'ar')
assert.equal(values.get('nomu.doctor.demoFollowUpAppointments.v1'), 'unchanged')
const reloaded = loadStandaloneNotes([registeredPatients[1]], storage)
const restored = reloaded.patients.find(patient => patient.id === child.id)
assert.equal(restored.standaloneNotes[0].observations, draft.observations)
assert.equal(restored.standaloneNotes[0].visitId, visit.id, 'Visit link survives even if its session-only visit is unavailable')
assert.equal(reloaded.patients.find(patient => patient.id === other.id).standaloneNotes.length, 0)
const payload = JSON.parse(values.get(CLINICAL_NOTES_STORAGE_KEY))
storage.setItem(CLINICAL_NOTES_STORAGE_KEY, JSON.stringify({ ...payload, notes: [...payload.notes, { invalid: true }] }))
assert.equal(loadStandaloneNotes(patients, storage).warning, 'invalidStorage')
assert.equal(loadStandaloneNotes(patients, storage).patients[0].standaloneNotes.length, 1)
storage.setItem(CLINICAL_NOTES_STORAGE_KEY, '{invalid-json')
assert.equal(loadStandaloneNotes(patients, storage).warning, 'invalidStorage')
const blocked = { getItem() { throw new Error('Blocked') }, setItem() { throw new Error('Quota') } }
assert.equal(loadStandaloneNotes(patients, blocked).warning, 'storageUnavailable')
assert.equal(persistStandaloneNotes(updated, blocked), false)
console.log('Clinical note validation, visit-source deduplication, filtering, child isolation, exact text, unchanged visits and storage roundtrip passed')

const editDraft = { ...updated[0].standaloneNotes[0], type: 'diagnosis', diagnosis: '  تشخيص محدث كما أدخله الطبيب  ', observations: 'Updated English observations\nملاحظات عربية محدثة', plan: '  خطة محدثة  ' }
const edited = updateClinicalNote(updated, child.id, editDraft.id, editDraft, now)
assert.equal(edited[0].standaloneNotes.length, updated[0].standaloneNotes.length)
assert.equal(edited[0].standaloneNotes[0].id, draft.id)
assert.equal(edited[0].standaloneNotes[0].patientId, child.id)
assert.equal(edited[0].standaloneNotes[0].createdAt, updated[0].standaloneNotes[0].createdAt)
assert.equal(edited[0].standaloneNotes[0].doctor, updated[0].standaloneNotes[0].doctor)
assert.equal(edited[0].standaloneNotes[0].diagnosis, editDraft.diagnosis)
assert.equal(edited[0].standaloneNotes[0].observations, editDraft.observations)
assert.equal(edited[0].standaloneNotes[0].plan, editDraft.plan)
assert.equal(edited[0].medicalVisits, child.medicalVisits)
assert.equal(clinicalNotesFor(edited[0], 'observation').length, 0, 'Changing note type removes it from the former category')
assert.ok(clinicalNotesFor(edited[0], 'diagnosis').some(note => note.id === draft.id), 'Updated notes appear in their stored category')
assert.equal(edited[1], other)
assert.equal(updateClinicalNote(updated, other.id, draft.id, editDraft, now), updated)
assert.equal(updateClinicalNote(updated, child.id, `visit:${visit.id}`, editDraft, now), updated, 'Visit-derived notes cannot be updated independently')
assert.equal(updateClinicalNote(updated, child.id, draft.id, { ...editDraft, diagnosis: ' ' }, now), updated)
assert.ok(persistStandaloneNotes(edited, storage))
const editedAfterRefresh = loadStandaloneNotes([registeredPatients[0], registeredPatients[1]], storage)
const persistedNote = editedAfterRefresh.patients[0].standaloneNotes[0]
assert.equal(persistedNote.diagnosis, editDraft.diagnosis)
assert.equal(persistedNote.observations, editDraft.observations)
assert.equal(editedAfterRefresh.patients[0].standaloneNotes.length, 1)
const linkedAfterRefresh = updateClinicalNote(editedAfterRefresh.patients, child.id, draft.id, { ...persistedNote, plan: 'Updated after refresh' }, now)
assert.equal(linkedAfterRefresh[0].standaloneNotes[0].visitId, visit.id)
assert.equal(linkedAfterRefresh[0].standaloneNotes[0].plan, 'Updated after refresh')
assert.equal((linkedAfterRefresh[0].medicalVisits || []).length, 0, 'Editing retained links never fabricates missing visits')
console.log('Standalone note updates preserve identity, child, original metadata and visit history; updated Arabic/English text survives storage reload without duplicates')
