import { localVisitDate } from './medicalVisitData.js'

export const prescriptionFields = ['medication', 'strength', 'dosage', 'frequency', 'duration', 'route', 'instructions']
export const prescriptionRequiredFields = ['medication', 'dosage', 'frequency', 'duration', 'route']
export const prescriptionRoutes = ['oral', 'topical', 'inhaled', 'eye', 'ear', 'nasal', 'rectal', 'injection', 'other']

export function validatePrescription(draft) {
  const errors = {}
  for (const field of prescriptionRequiredFields) {
    if (typeof draft[field] !== 'string' || !draft[field].trim()) errors[field] = 'required'
  }
  if (draft.route && !prescriptionRoutes.includes(draft.route)) errors.route = 'routeRequired'
  return errors
}

// Frontend demonstration only: backend authorization must enforce doctor permissions.
export function savePrescription(patients, patientId, draft, doctor, now = new Date()) {
  const patient = patients.find(item => item.id === patientId)
  if (!patient || !draft.id || Object.keys(validatePrescription(draft)).length) return patients
  if ((patient.prescriptions || []).some(item => item.id === draft.id)) return patients
  const prescription = {
    id: draft.id, patientId, visitId: null, doctor,
    datePrescribed: localVisitDate(now), createdAt: now.toISOString(),
    // Validation checks blank fields, but stored clinical text remains exactly as entered.
    ...Object.fromEntries(prescriptionFields.map(field => [field, draft[field] || ''])),
  }
  return patients.map(item => item.id === patientId ? {
    ...item, prescriptions: [...(item.prescriptions || []), prescription],
  } : item)
}
