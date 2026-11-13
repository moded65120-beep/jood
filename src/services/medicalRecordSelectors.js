import { canonicalChildId, motherChildIds } from './demoChildAccess.js'
import { basicDemoChildren } from './parentBasicDemoFamily.js'
import { clinicalNotesFor } from '../components/doctor/clinicalNotesData.js'
import { assessmentsFor } from '../components/doctor/clinicalAssessmentData.js'
import { appointmentsFor, appointmentGroup } from '../components/doctor/followUpData.js'

export function immutableCopy(value) {
  const copy = structuredClone(value)
  function freeze(item) {
    if (item && typeof item === 'object') { Object.values(item).forEach(freeze); Object.freeze(item) }
    return item
  }
  return freeze(copy)
}
export function selectDoctorPatients(state, doctorId) {
  const ids = Object.hasOwn(state.doctorPatientIds, doctorId) ? state.doctorPatientIds[doctorId] : []
  return immutableCopy(state.patients.filter(child => ids.includes(child.id)))
}
export function selectMotherChildren(state, motherId) {
  const ids = Object.hasOwn(motherChildIds, motherId) ? motherChildIds[motherId] : []
  const medicalProfiles = state.patients.filter(child => ids.includes(child.id)).map(({ id, name, nameAr, dateOfBirth, gender, file, nationalId }) => ({ id, name, nameAr, dateOfBirth, gender, file, nationalId }))
  // Personal-only demo fixtures do not create a medical record or a doctor assignment.
  return immutableCopy([...medicalProfiles, ...basicDemoChildren.filter(child => ids.includes(child.id) && !medicalProfiles.some(profile => profile.id === child.id))])
}
export function selectMotherMedicalRecord(state, motherId, idOrAlias) {
  const id = canonicalChildId(idOrAlias)
  if (!id || !Object.hasOwn(motherChildIds, motherId) || !motherChildIds[motherId].includes(id)) return null
  const child = state.patients.find(item => item.id === id)
  if (!child) return null
  const followUps = appointmentsFor(child)
  return immutableCopy({
    profile: { id: child.id, name: child.name, nameAr: child.nameAr, dateOfBirth: child.dateOfBirth, gender: child.gender, file: child.file, nationalId: child.nationalId },
    medicalVisits: (child.medicalVisits || []).slice().sort((a,b) => b.date.localeCompare(a.date)),
    notes: clinicalNotesFor(child), prescriptions: (child.prescriptions || []).slice().sort((a,b) => b.datePrescribed.localeCompare(a.datePrescribed)),
    clinicalAssessments: assessmentsFor(child), growthMeasurements: child.growthMeasurements || [],
    followUps: Object.fromEntries(['upcoming', 'past', 'missed', 'cancelled'].map(group => [group, followUps.filter(item => appointmentGroup(item) === group)])),
    lastVisit: child.lastVisit, lastVisitDoctor: child.lastVisitDoctor || null, nextFollowUp: child.nextFollowUp,
  })
}
