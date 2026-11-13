import { doctorDirectory } from './doctorDirectory.js'
import { initialPatients, registeredPatients } from '../components/doctor/patientData.js'
import { basicDemoFamily } from './parentBasicDemoFamily.js'

// Explicit fictional relationships, never inferred from a child's name. Not authorization.
export const demoDoctorId = 'demo-doctor-sarah-ahmad'
export const demoMotherId = 'demo-mother-sara'
export const motherRouteAliases = Object.freeze({ adam: 'demo-child-3', lina: 'demo-child-lina' })
// Development-only, explicit parent identities. Prefixes never establish kinship.
export const demoFamilies = Object.freeze([
  Object.freeze({ id: demoMotherId, parents: Object.freeze([
    Object.freeze({ nationalId: '3000000001', role: 'mother' }),
    Object.freeze({ nationalId: '4000000001', role: 'father' }),
    Object.freeze({ nationalId: '1234567890', role: 'mother' }),
  ]), childIds: Object.freeze(['demo-child-3', 'demo-child-lina']) }),
  basicDemoFamily,
])
export const motherChildIds = Object.freeze(Object.fromEntries(demoFamilies.map(family => [family.id, family.childIds])))
export function demoParentFamily(nationalId, role) {
  return demoFamilies.find(family => family.parents.some(parent => parent.nationalId === nationalId && parent.role === role))?.id || null
}
// Null user is the existing protected legacy Mother session, not anonymous access.
export function parentFamilyScope(user) {
  return user ? demoParentFamily(user.id, user.role) : demoMotherId
}
export function parentCanViewChild(user, idOrAlias) {
  const familyId = parentFamilyScope(user)
  const id = canonicalChildId(idOrAlias)
  return Boolean(id && familyId && motherChildIds[familyId]?.includes(id))
}
// A separate empty canonical profile, not a replacement for an existing patient.
// Mother branch supplies no DOB, file number or national ID: do not invent those values.
const lina = { id: 'demo-child-lina', name: 'Lina', gender: 'Female', dateOfBirth: null, months: null, file: '', nationalId: '', medicalVisits: [], prescriptions: [], medicalNotes: [], standaloneNotes: [], clinicalAssessments: [], growthMeasurements: [], followUpAppointments: [], visits: [], lastVisit: null, nextFollowUp: null }
export const canonicalDemoChildren = [...registeredPatients, lina]
// Identity view only: medical data stays in the existing canonical repository.
export function demoChildIdentity(idOrAlias) {
  const id = canonicalChildId(idOrAlias)
  const child = canonicalDemoChildren.find(record => record.id === id)
  if (!child) return null
  return Object.freeze({ id, name: child.name, dateOfBirth: child.dateOfBirth ?? null,
    placeOfBirth: child.placeOfBirth ?? null, gender: child.gender ?? null, medicalRecordId: id,
    linkedParentNationalIds: Object.freeze(demoFamilies.filter(family => family.childIds.includes(id)).flatMap(family => family.parents.map(parent => parent.nationalId))),
  })
}
export const initialDoctorChildIds = Object.freeze(Object.fromEntries(doctorDirectory.map(doctor => [doctor.id, Object.freeze(doctor.id === demoDoctorId ? initialPatients.map(child => child.id) : [])])))
export const doctorChildIds = Object.freeze(Object.fromEntries(doctorDirectory.map(doctor => [doctor.id, Object.freeze(doctor.id === demoDoctorId ? canonicalDemoChildren.map(child => child.id) : [])])))
export function canonicalChildId(idOrAlias) {
  if (typeof idOrAlias !== 'string') return null
  const id = Object.hasOwn(motherRouteAliases, idOrAlias) ? motherRouteAliases[idOrAlias] : idOrAlias
  return canonicalDemoChildren.some(child => child.id === id) ? id : null
}
