import { canonicalDemoChildren, demoDoctorId, doctorChildIds, initialDoctorChildIds } from './demoChildAccess.js'
import { immutableCopy } from './medicalRecordSelectors.js'
import { parseRecordDate } from '../components/doctor/medicalRecordData.js'
import { appendGrowthMeasurement, updateGrowthNote } from './growthMeasurementAdapter.js'
import { saveMedicalVisit, validateMedicalVisit } from '../components/doctor/medicalVisitData.js'
import { savePrescription, validatePrescription } from '../components/doctor/prescriptionData.js'
import { saveClinicalNote, updateClinicalNote, validateClinicalNote } from '../components/doctor/clinicalNotesData.js'
import { saveAssessment, voidAssessment, validateAssessment, assessmentStatus } from '../components/doctor/clinicalAssessmentData.js'
import { saveFollowUp, cancelFollowUp, syncFollowUp } from '../components/doctor/followUpData.js'
import { loadFollowUpPatients, FOLLOW_UP_STORAGE_KEY } from '../components/doctor/followUpStorage.js'
import { loadStandaloneNotes, CLINICAL_NOTES_STORAGE_KEY } from '../components/doctor/clinicalNotesStorage.js'
import { loadAssessments, ASSESSMENT_STORAGE_KEY } from '../components/doctor/clinicalAssessmentData.js'

export const MEDICAL_RECORD_STORAGE_KEY = 'nomu.demo.sharedMedicalRecords.v1'
const legacyKeys = [FOLLOW_UP_STORAGE_KEY, CLINICAL_NOTES_STORAGE_KEY, ASSESSMENT_STORAGE_KEY]
const knownIds = new Set(canonicalDemoChildren.map(child => child.id))
const stamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
const text = value => typeof value === 'string'
const arrays = ['medicalVisits', 'prescriptions', 'standaloneNotes', 'clinicalAssessments', 'followUpAppointments', 'medicalNotes', 'growthMeasurements', 'visits']
function validState(state) {
  if (state?.version !== 1 || !Number.isInteger(state.revision) || state.revision < 0 || !Array.isArray(state.patients) || state.patients.length !== knownIds.size || !state.doctorPatientIds || typeof state.doctorPatientIds !== 'object') return false
  const seenChildren = new Set(), recordIds = new Map()
  for (const patient of state.patients) {
    if (!patient || !knownIds.has(patient.id) || seenChildren.has(patient.id) || !text(patient.name) || !(patient.dateOfBirth === null || parseRecordDate(patient.dateOfBirth)) || !text(patient.gender) || !text(patient.file) || !text(patient.nationalId) || arrays.some(field => !Array.isArray(patient[field])) || !(patient.lastVisit === null || parseRecordDate(patient.lastVisit)) || !(patient.nextFollowUp === null || parseRecordDate(patient.nextFollowUp))) return false
    seenChildren.add(patient.id)
    for (const field of ['medicalVisits', 'prescriptions', 'standaloneNotes', 'clinicalAssessments', 'followUpAppointments']) {
      if (!recordIds.has(field)) recordIds.set(field, new Set())
      for (const record of patient[field]) {
        if (!record || !text(record.id) || !record.id || record.patientId !== patient.id || recordIds.get(field).has(record.id)) return false
        recordIds.get(field).add(record.id)
        if (field === 'medicalVisits' && (!text(record.doctor) || ['chiefComplaint', 'diagnosis', 'observations', 'treatment'].some(key => !text(record[key])) || Object.keys(validateMedicalVisit(record, patient, '9999-12-31')).length)) return false
        if (field === 'prescriptions' && (!text(record.doctor) || !parseRecordDate(record.datePrescribed) || !stamp(record.createdAt) || !['medication', 'strength', 'dosage', 'frequency', 'duration', 'route', 'instructions'].every(key => text(record[key])) || Object.keys(validatePrescription(record)).length || !(record.visitId === null || text(record.visitId)))) return false
        if (field === 'standaloneNotes' && (!text(record.doctor) || !stamp(record.createdAt) || !['diagnosis', 'observations', 'plan'].every(key => text(record[key])) || Object.keys(validateClinicalNote(record, patient, '9999-12-31')).length)) return false
        if (field === 'clinicalAssessments' && (!text(record.doctor) || !stamp(record.createdAt) || !['findings', 'diagnosis', 'plan'].every(key => text(record[key])) || Object.keys(validateAssessment(record, patient, '9999-12-31')).length || !['active', 'voided'].includes(assessmentStatus(record)) || (assessmentStatus(record) === 'voided' && (!text(record.voidReason) || !record.voidReason.trim() || !text(record.voidedBy) || !record.voidedBy.trim() || !stamp(record.voidedAt))))) return false
        if (field === 'followUpAppointments' && (!parseRecordDate(record.date) || !['scheduled', 'cancelled', 'completed', 'missed'].includes(record.status) || !text(record.reason) || !text(record.instructions) || !text(record.time) || (record.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(record.time)) || !(record.visitId === null || text(record.visitId)))) return false
      }
    }
  }
  return Object.entries(state.doctorPatientIds).every(([id, children]) => Object.hasOwn(doctorChildIds, id) && Array.isArray(children) && new Set(children).size === children.length && children.every(childId => doctorChildIds[id].includes(childId)))
}
function basePatients() {
  return structuredClone(canonicalDemoChildren).map(child => {
    const synced = syncFollowUp(child)
    return { ...synced, ...Object.fromEntries(arrays.map(field => [field, synced[field] || []])) }
  })
}
// Existing keys are read-only migration inputs. One atomic snapshot write prevents split-domain saves.
// Invalid/partial legacy payloads are left byte-for-byte intact and block writes for review.
export function createMedicalRecordRepository(storage, events = typeof window !== 'undefined' ? window : null) {
  let target, raw = null, blocked = false, revision = 0, warning = null
  let patients = basePatients(), doctorPatientIds = structuredClone(initialDoctorChildIds)
  const legacyRaw = new Map()
  try {
    target = storage || window.localStorage
    raw = target.getItem(MEDICAL_RECORD_STORAGE_KEY)
    if (raw !== null) {
      const saved = JSON.parse(raw)
      if (!validState(saved)) throw new SyntaxError('Invalid medical snapshot')
      patients = saved.patients.map(patient => syncFollowUp(patient)); doctorPatientIds = saved.doctorPatientIds; revision = saved.revision
    } else {
      legacyKeys.forEach(key => legacyRaw.set(key, target.getItem(key)))
      const followUps = loadFollowUpPatients(patients, target)
      const notes = loadStandaloneNotes(followUps.patients, target)
      const assessments = loadAssessments(notes.patients, target)
      patients = assessments.patients
      const warnings = [followUps.warning, notes.warning, assessments.warning].filter(Boolean)
      if (warnings.length) { blocked = true; warning = warnings.includes('storageUnavailable') ? 'storageUnavailable' : 'invalidStorage' }
      const assigned = new Set(doctorPatientIds[demoDoctorId])
      const followUpPayload = legacyRaw.get(FOLLOW_UP_STORAGE_KEY)
      if (followUpPayload) for (const id of JSON.parse(followUpPayload).childIds || []) if (knownIds.has(id)) assigned.add(id)
      for (const patient of patients) if (patient.standaloneNotes.length || patient.clinicalAssessments.length) assigned.add(patient.id)
      doctorPatientIds[demoDoctorId] = [...assigned]
    }
  } catch (error) { blocked = true; warning = error instanceof SyntaxError ? 'invalidStorage' : 'storageUnavailable' }
  let state = immutableCopy({ version: 1, revision, patients, doctorPatientIds })
  const listeners = new Set()
  function refresh() {
    try {
      const latest = target.getItem(MEDICAL_RECORD_STORAGE_KEY)
      if (latest === raw && !blocked) return
      const saved = JSON.parse(latest)
      if (!validState(saved)) throw Error('invalidStorage')
      raw = latest
      state = immutableCopy({ ...saved, patients: saved.patients.map(patient => syncFollowUp(patient)) })
      blocked = false; warning = null
    } catch { blocked = true; warning = 'invalidStorage' }
    listeners.forEach(listener => listener())
  }
  function externalChange(event) { if (!event.key || event.key === MEDICAL_RECORD_STORAGE_KEY) refresh() }
  function commit(next) {
    if (blocked) return false
    try {
      if (target.getItem(MEDICAL_RECORD_STORAGE_KEY) !== raw) { refresh(); warning = 'storageUnavailable'; return false }
      if (raw === null && legacyKeys.some(key => target.getItem(key) !== legacyRaw.get(key))) { warning = 'invalidStorage'; return false }
      const candidate = { ...next, revision: state.revision + 1 }
      if (!validState(candidate)) { warning = 'invalidStorage'; return false }
      const serialized = JSON.stringify(candidate)
      target.setItem(MEDICAL_RECORD_STORAGE_KEY, serialized)
      raw = serialized; state = immutableCopy(candidate); warning = null
      listeners.forEach(listener => listener())
      events?.dispatchEvent?.(new Event('nomu:medical-records-changed'))
      return true
    } catch { warning = 'storageUnavailable'; return false }
  }
  function act(doctor, childId, operation, args = []) {
    const doctorId = doctor?.id
    if (!Object.hasOwn(doctorChildIds, doctorId) || !state.doctorPatientIds[doctorId]?.includes(childId) || !text(doctor.name) || !doctor.name.trim()) return false
    const operations = {
      visit: () => saveMedicalVisit(state.patients, childId, args[0], doctor.name),
      prescription: () => savePrescription(state.patients, childId, args[0], doctor.name),
      note: () => saveClinicalNote(state.patients, childId, args[0], doctor.name),
      editNote: () => updateClinicalNote(state.patients, childId, args[0], args[1]),
      assessment: () => saveAssessment(state.patients, childId, args[0], doctor.name, args[1]),
      voidAssessment: () => voidAssessment(state.patients, childId, args[0], args[1], doctor.name),
      followUp: () => saveFollowUp(state.patients, childId, args[0]),
      cancelFollowUp: () => cancelFollowUp(state.patients, childId, args[0]),
      addGrowthMeasurement: () => appendGrowthMeasurement(state.patients, childId, args[0], doctor.name),
      updateGrowthNote: () => updateGrowthNote(state.patients, childId, args[0]),
    }
    if (!Object.hasOwn(operations, operation)) return false
    try {
      const updated = operations[operation]()
      return updated !== state.patients && commit({ ...state, patients: updated })
    } catch { return false }
  }
  return {
    getSnapshot: () => state,
    getWarning: () => warning,
    subscribe: listener => {
      if (!listeners.size) {
        events?.addEventListener?.('storage', externalChange)
        events?.addEventListener?.('nomu:medical-records-changed', refresh)
        events?.addEventListener?.('focus', refresh)
      }
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (!listeners.size) {
          events?.removeEventListener?.('storage', externalChange)
          events?.removeEventListener?.('nomu:medical-records-changed', refresh)
          events?.removeEventListener?.('focus', refresh)
        }
      }
    },
    act,
    assignChild(doctorId, childId) {
      if (!Object.hasOwn(doctorChildIds, doctorId) || !doctorChildIds[doctorId].includes(childId) || state.doctorPatientIds[doctorId]?.includes(childId)) return false
      return commit({ ...state, doctorPatientIds: { ...state.doctorPatientIds, [doctorId]: [...(state.doctorPatientIds[doctorId] || []), childId] } })
    },
  }
}
