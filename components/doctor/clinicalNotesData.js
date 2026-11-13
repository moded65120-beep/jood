import { parseRecordDate } from './medicalRecordData.js'
import { localVisitDate } from './medicalVisitData.js'

export const clinicalNoteTypes = ['diagnosis', 'observation', 'followup']
export const clinicalNoteFields = ['diagnosis', 'observations', 'plan']

export function validateClinicalNote(draft, patient, today = localVisitDate()) {
  const errors = {}
  if (!clinicalNoteTypes.includes(draft.type)) errors.type = 'typeRequired'
  if (!parseRecordDate(draft.date)) errors.date = 'dateRequired'
  else if (draft.date > today || (patient.dateOfBirth && draft.date < patient.dateOfBirth)) errors.date = 'dateRange'
  if (draft.type === 'diagnosis' && !draft.diagnosis?.trim()) errors.diagnosis = 'diagnosisRequired'
  if (draft.type === 'observation' && !draft.observations?.trim()) errors.observations = 'observationsRequired'
  const existing = (patient.standaloneNotes || []).find(note => note.id === draft.id && note.patientId === patient.id)
  if (draft.visitId && !(patient.medicalVisits || []).some(visit => visit.id === draft.visitId) && existing?.visitId !== draft.visitId) errors.visitId = 'invalidVisit'
  return errors
}

export function saveClinicalNote(patients, patientId, draft, doctor, now = new Date()) {
  const patient = patients.find(item => item.id === patientId)
  if (!patient || !draft.id || Object.keys(validateClinicalNote(draft, patient, localVisitDate(now))).length) return patients
  if ((patient.standaloneNotes || []).some(note => note.id === draft.id)) return patients
  const note = {
    id: draft.id, patientId, type: draft.type, date: draft.date, doctor,
    visitId: draft.visitId || null, createdAt: now.toISOString(),
    ...Object.fromEntries(clinicalNoteFields.map(field => [field, draft[field] || ''])),
  }
  return patients.map(item => item.id === patientId ? { ...item, standaloneNotes: [...(item.standaloneNotes || []), note] } : item)
}

export function clinicalNotesFor(patient, filter = 'all') {
  const visits = (patient.medicalVisits || []).filter(visit => !visit.patientId || visit.patientId === patient.id)
  const visitIds = new Set(visits.map(visit => visit.id))
  const visitNotes = visits.filter(visit => visit.diagnosis?.trim() || visit.observations?.trim() || visit.treatment?.trim()).map(visit => ({
    id: `visit:${visit.id}`, patientId: patient.id, visitId: visit.id, date: visit.date,
    type: visit.diagnosis?.trim() ? 'diagnosis' : visit.type === 'followup' ? 'followup' : 'observation',
    doctor: visit.doctor, diagnosis: visit.diagnosis || '', observations: visit.observations || '',
    plan: visit.treatment || '', source: 'visit', createdAt: visit.createdAt || '',
  }))
  const legacyNotes = (patient.medicalNotes || []).filter(note => (!note.patientId || note.patientId === patient.id) && !visitIds.has(note.id) && !visitIds.has(note.visitId) && note.text).map((note, index) => ({
    id: `legacy:${note.id || index}`, patientId: patient.id, visitId: note.visitId || null,
    date: note.date, type: 'observation', doctor: note.doctor || '',
    diagnosis: '', observations: note.text, plan: '', source: 'legacy', createdAt: '',
  }))
  const standalone = (patient.standaloneNotes || []).filter(note => note.patientId === patient.id).map(note => ({ ...note, source: 'standalone' }))
  const unique = new Map()
  for (const note of [...legacyNotes, ...visitNotes, ...standalone]) if (parseRecordDate(note.date)) unique.set(`${note.source}:${note.id}`, note)
  return [...unique.values()].reverse().filter(note => filter === 'all' || note.type === filter)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export function updateClinicalNote(patients, patientId, noteId, draft, now = new Date()) {
  const patient = patients.find(item => item.id === patientId)
  const existing = patient?.standaloneNotes?.find(note => note.id === noteId && note.patientId === patientId)
  if (!existing || draft.id !== noteId) return patients
  // Editing clinical content never changes the author, child, original date or visit link.
  const candidate = { ...draft, date: existing.date, visitId: existing.visitId }
  if (Object.keys(validateClinicalNote(candidate, patient, localVisitDate(now))).length) return patients
  const updated = {
    ...existing, type: candidate.type,
    ...Object.fromEntries(clinicalNoteFields.map(field => [field, candidate[field] || ''])),
  }
  return patients.map(item => item.id === patientId ? {
    ...item, standaloneNotes: item.standaloneNotes.map(note => note.id === noteId ? updated : note),
  } : item)
}
