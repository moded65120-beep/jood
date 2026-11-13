import { registeredPatients } from './patientData.js'
import { clinicalNoteTypes } from './clinicalNotesData.js'
import { parseRecordDate } from './medicalRecordData.js'

export const CLINICAL_NOTES_STORAGE_KEY = 'nomu.doctor.demoStandaloneNotes.v1'
const knownIds = new Set(registeredPatients.map(patient => patient.id))
const text = (value, max) => typeof value === 'string' && value.length <= max
function validNote(note) {
  return note && text(note.id, 250) && note.id.length > 0 && knownIds.has(note.patientId)
    && clinicalNoteTypes.includes(note.type) && parseRecordDate(note.date)
    && text(note.doctor, 300) && text(note.createdAt, 40) && Number.isFinite(Date.parse(note.createdAt))
    && ['diagnosis', 'observations', 'plan'].every(field => text(note[field], 4000))
    && (note.type !== 'diagnosis' || note.diagnosis.trim()) && (note.type !== 'observation' || note.observations.trim())
    && (note.visitId === null || text(note.visitId, 250))
}
const clean = note => Object.fromEntries(['id', 'patientId', 'type', 'date', 'doctor', 'createdAt', 'diagnosis', 'observations', 'plan', 'visitId'].map(key => [key, note[key]]))

// Fictional standalone notes only. No visits, prescriptions or unrelated storage keys are changed.
export function loadStandaloneNotes(patients, storage) {
  try {
    const raw = (storage || window.localStorage).getItem(CLINICAL_NOTES_STORAGE_KEY)
    if (raw === null) return { patients, warning: null }
    const saved = JSON.parse(raw)
    if (saved?.version !== 1 || !Array.isArray(saved.notes)) throw new Error('Invalid note data')
    const notes = []
    const seen = new Set()
    let invalid = false
    for (const note of saved.notes) {
      if (!validNote(note) || seen.has(note.id)) { invalid = true; continue }
      seen.add(note.id)
      notes.push(clean(note))
    }
    const restored = [...patients, ...registeredPatients.filter(patient => notes.some(note => note.patientId === patient.id) && !patients.some(item => item.id === patient.id))]
    return { patients: restored.map(patient => ({ ...patient, standaloneNotes: notes.filter(note => note.patientId === patient.id) })), warning: invalid ? 'invalidStorage' : null }
  } catch (error) {
    return { patients, warning: error instanceof SyntaxError || error.message === 'Invalid note data' ? 'invalidStorage' : 'storageUnavailable' }
  }
}
export function persistStandaloneNotes(patients, storage) {
  try {
    const notes = patients.flatMap(patient => patient.standaloneNotes || [])
    if (!notes.every(validNote)) return false
    ;(storage || window.localStorage).setItem(CLINICAL_NOTES_STORAGE_KEY, JSON.stringify({ version: 1, notes: notes.map(clean) }))
    return true
  } catch { return false }
}
