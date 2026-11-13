import { parseRecordDate } from './medicalRecordData.js'
import { localVisitDate } from './medicalVisitData.js'
import { registeredPatients } from './patientData.js'
export const assessmentTypes = ['routine', 'followup', 'general', 'other']
export const ASSESSMENT_STORAGE_KEY = 'nomu.doctor.demoClinicalAssessments.v1'
export const assessmentStatus = record => record.status || 'active'
export function validateAssessment(draft, patient, today = localVisitDate()) {
  const errors = {}
  if (!parseRecordDate(draft.date)) errors.date = 'dateRequired'
  else if (draft.date > today || (patient.dateOfBirth && draft.date < patient.dateOfBirth)) errors.date = 'dateRange'
  if (draft.type && !assessmentTypes.includes(draft.type)) errors.type = 'invalidType'
  for (const field of ['findings', 'diagnosis']) if (typeof draft[field] !== 'string' || !draft[field].trim()) errors[field] = field + 'Required'
  return errors
}
export function saveAssessment(patients, patientId, draft, doctor, editing = false) {
  const patient = patients.find(item => item.id === patientId)
  if (!patient || !draft.id || Object.keys(validateAssessment(draft, patient)).length) return patients
  const records = patient.clinicalAssessments || []
  const existing = records.find(item => item.id === draft.id && item.patientId === patientId)
  if (editing !== Boolean(existing) || (existing && assessmentStatus(existing) !== 'active')) return patients
  const record = { ...(existing || { id: draft.id, patientId, doctor, createdAt: new Date().toISOString() }), status: 'active', date: draft.date, type: draft.type || '', findings: draft.findings, diagnosis: draft.diagnosis, plan: draft.plan || '' }
  return patients.map(item => item.id === patientId ? { ...item, clinicalAssessments: editing ? records.map(value => value.id === record.id ? record : value) : [...records, record] } : item)
}
export function assessmentsFor(patient) {
  return (patient.clinicalAssessments || []).filter(item => item.patientId === patient.id).slice().sort((a,b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
}
const fields = ['id','patientId','doctor','createdAt','date','type','findings','diagnosis','plan']
const clean = record => ({ ...Object.fromEntries(fields.map(key => [key, record[key]])), status: assessmentStatus(record), ...(assessmentStatus(record) === 'voided' ? { voidReason: record.voidReason, voidedAt: record.voidedAt, voidedBy: record.voidedBy } : {}) })
function valid(record) {
  const patient = registeredPatients.find(item => item.id === record?.patientId)
  return patient && fields.every(key => typeof record[key] === 'string') && record.id && Number.isFinite(Date.parse(record.createdAt)) && !Object.keys(validateAssessment(record, patient)).length
    && ['active', 'voided'].includes(assessmentStatus(record))
    && (assessmentStatus(record) !== 'voided' || (typeof record.voidReason === 'string' && record.voidReason.trim() && typeof record.voidedBy === 'string' && record.voidedBy.trim() && typeof record.voidedAt === 'string' && Number.isFinite(Date.parse(record.voidedAt))))
}
// Demo audit metadata only; backend authorization and an immutable audit log are required later.
export function voidAssessment(patients, patientId, assessmentId, reason, doctor, now = new Date()) {
  const record = patients.find(patient => patient.id === patientId)?.clinicalAssessments?.find(item => item.id === assessmentId && item.patientId === patientId)
  if (!record || assessmentStatus(record) !== 'active' || typeof reason !== 'string' || !reason.trim() || typeof doctor !== 'string' || !doctor.trim()) return patients
  return patients.map(patient => patient.id === patientId ? { ...patient, clinicalAssessments: patient.clinicalAssessments.map(item => item.id === assessmentId ? { ...item, status: 'voided', voidReason: reason, voidedAt: now.toISOString(), voidedBy: doctor } : item) } : patient)
}
export function loadAssessments(patients, storage) {
  try {
    const raw = (storage || window.localStorage).getItem(ASSESSMENT_STORAGE_KEY)
    if (raw === null) return { patients, warning: null }
    const data = JSON.parse(raw)
    if (data?.version !== 1 || !Array.isArray(data.assessments)) throw new SyntaxError()
    const seen = new Set(), records = []
    let invalid = false
    for (const record of data.assessments) {
      if (!valid(record) || seen.has(record.id)) { invalid = true; continue }
      seen.add(record.id); records.push(clean(record))
    }
    const restored = [...patients, ...registeredPatients.filter(patient => records.some(record => record.patientId === patient.id) && !patients.some(item => item.id === patient.id))]
    return { patients: restored.map(patient => ({ ...patient, clinicalAssessments: records.filter(record => record.patientId === patient.id) })), warning: invalid ? 'invalidStorage' : null }
  } catch (error) { return { patients, warning: error instanceof SyntaxError ? 'invalidStorage' : 'storageUnavailable' } }
}
export function persistAssessments(patients, storage) {
  try {
    const assessments = patients.flatMap(patient => patient.clinicalAssessments || [])
    if (!assessments.every(valid)) return false
    ;(storage || window.localStorage).setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify({ version: 1, assessments: assessments.map(clean) }))
    return true
  } catch { return false }
}
