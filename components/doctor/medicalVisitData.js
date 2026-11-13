import { parseRecordDate } from './medicalRecordData.js'
import { addVisitAppointment, appointmentsFor } from './followUpData.js'

export const visitTypes = ['routine', 'followup', 'sick', 'other']
export const clinicalVisitFields = ['chiefComplaint', 'diagnosis', 'observations', 'treatment']

export function localVisitDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function validateMedicalVisit(draft, patient, today = localVisitDate()) {
  const errors = {}
  if (!parseRecordDate(draft.date)) errors.date = 'dateRequired'
  else if (draft.date > today) errors.date = 'futureVisit'
  else if (patient.dateOfBirth && draft.date < patient.dateOfBirth) errors.date = 'beforeBirth'
  if (!visitTypes.includes(draft.type)) errors.type = 'typeRequired'
  if (draft.nextFollowUp && (!parseRecordDate(draft.nextFollowUp) || draft.nextFollowUp < draft.date)) {
    errors.nextFollowUp = 'followupBeforeVisit'
  }
  return errors
}

// The dashboard owns saved mock visits so navigating between children never loses them.
// Real authorization must be enforced by the backend, not this frontend helper.
export function saveMedicalVisit(patients, patientId, draft, doctorName, today = localVisitDate()) {
  const patient = patients.find(item => item.id === patientId)
  if (!patient || !draft.id || Object.keys(validateMedicalVisit(draft, patient, today)).length) return patients
  if ((patient.medicalVisits || []).some(visit => visit.id === draft.id)) return patients
  const visit = {
    id: draft.id, patientId, date: draft.date, type: draft.type,
    doctor: doctorName, nextFollowUp: draft.nextFollowUp || null,
    ...Object.fromEntries(clinicalVisitFields.map(field => [field, (draft[field] || '').trim()])),
  }
  const isLatest = !patient.lastVisit || visit.date >= patient.lastVisit
  const updated = {
    ...patient,
    medicalVisits: [...(patient.medicalVisits || []), visit],
    visits: [...new Set([...(patient.visits || []), visit.date])],
    ...(isLatest ? { lastVisit: visit.date, lastVisitDoctor: doctorName } : {}),
    // Backdated entries must not overwrite the latest visit's follow-up plan.
  }
  // Historical dates stay on the visit. The current display derives from appointment records.
  const result = visit.nextFollowUp ? addVisitAppointment({ ...updated, followUpAppointments: appointmentsFor(patient) }, visit.nextFollowUp, visit.id, today, isLatest) : updated
  return patients.map(item => item.id === patientId ? result : item)
}
