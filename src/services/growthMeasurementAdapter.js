import { canonicalChildId } from './demoChildAccess.js'
import { dateOrdinal, isSupportedMeasurementDate, localDateString } from '../utils/growthDates.js'

export function growthSex(patient) {
  const value = patient.sex ?? patient.gender
  return typeof value === 'string' && ['male', 'female'].includes(value.toLowerCase()) ? value.toLowerCase() : null
}

// Legacy entries belong to their containing canonical child. Preserve raw fields
// and never infer an absent measurement method or turn profile summaries into data.
export function whoMeasurements(childId, records = []) {
  const id = canonicalChildId(childId)
  if (!id) return []
  return records.filter(record => record && typeof record === 'object' && !Array.isArray(record) && (!record.childId || canonicalChildId(record.childId) === id)).map(record => ({
    ...record, childId: id,
    measurementDate: Object.hasOwn(record, 'measurementDate') ? record.measurementDate : record.date,
    weightKg: Object.hasOwn(record, 'weightKg') ? record.weightKg : record.weight,
    heightCm: Object.hasOwn(record, 'heightCm') ? record.heightCm : record.height,
    headCircumferenceCm: Object.hasOwn(record, 'headCircumferenceCm') ? record.headCircumferenceCm : record.headCircumference,
  }))
}

export function appendGrowthMeasurement(patients, childId, draft, doctor, now = new Date()) {
  const patient = patients.find(child => child.id === childId)
  if (!patient || !draft || draft.childId !== childId || !growthSex(patient) || !isSupportedMeasurementDate(patient.dateOfBirth, draft.measurementDate) || draft.measurementDate > localDateString(now) || !['recumbent_length', 'standing_height'].includes(draft.measurementMethod) || ['weightKg', 'heightCm', 'headCircumferenceCm'].some(key => typeof draft[key] !== 'number' || !Number.isFinite(draft[key]) || draft[key] <= 0)) throw Error('invalidGrowthMeasurement')
  const fields = ['measurementDate', 'weightKg', 'heightCm', 'headCircumferenceCm', 'measurementMethod']
  if (draft.doctorNote !== undefined && typeof draft.doctorNote !== 'string') throw Error('invalidGrowthMeasurement')
  if (whoMeasurements(childId, patient.growthMeasurements).some(record => fields.every(key => record[key] === draft[key]))) return patients
  const record = { id: crypto.randomUUID(), childId, createdAt: now.toISOString(), doctor, ...Object.fromEntries(fields.map(key => [key, draft[key]])), ...(draft.doctorNote?.trim() ? { doctorNote: draft.doctorNote } : {}) }
  return patients.map(child => child.id === childId ? { ...child, growthMeasurements: [...child.growthMeasurements, record] } : child)
}

export function updateGrowthNote(patients, childId, draft) {
  const patient = patients.find(child => child.id === childId)
  if (!patient || !draft || typeof draft.doctorNote !== 'string' || !draft.doctorNote.trim() || typeof draft.expectedRecord !== 'string') throw Error('invalidGrowthNote')
  if (Object.keys(draft).some(key => !['measurementId', 'measurementIndex', 'expectedRecord', 'doctorNote'].includes(key)) || (draft.measurementId !== undefined && typeof draft.measurementId !== 'string')) throw Error('invalidGrowthNote')
  const records = patient.growthMeasurements
  let index
  if (typeof draft.measurementId === 'string' && draft.measurementId) {
    const matches = records.map((record, index) => record?.id === draft.measurementId ? index : -1).filter(index => index >= 0)
    if (matches.length !== 1) throw Error('recordConflict')
    index = matches[0]
  } else {
    index = draft.measurementIndex
    if (!Number.isInteger(index) || index < 0 || index >= records.length || records[index]?.id) throw Error('recordConflict')
  }
  const record = records[index]
  if (!record || typeof record !== 'object' || Array.isArray(record) || (record.childId && canonicalChildId(record.childId) !== childId) || JSON.stringify(record) !== draft.expectedRecord) throw Error('recordConflict')
  if (dateOrdinal(record.measurementDate ?? record.date) === null) throw Error('invalidGrowthNote')
  if (record.doctorNote === draft.doctorNote) return patients
  return patients.map(child => child.id === childId ? { ...child, growthMeasurements: records.map((value, position) => position === index ? { ...value, doctorNote: draft.doctorNote } : value) } : child)
}
