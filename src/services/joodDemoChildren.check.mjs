import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { registerParentDemo } from './parentDemoAccounts.js'
import { createUnifiedDemoAuth } from './unifiedDemoAuth.js'
import { parentFamilyScope, canonicalDemoChildren, doctorChildIds, demoDoctorId, parentCanViewChild } from './demoChildAccess.js'
import { selectMotherChildren, selectMotherMedicalRecord } from './medicalRecordSelectors.js'
import { ageFromBirthDate } from '../components/doctor/medicalRecordData.js'

const medicalBefore = JSON.stringify(canonicalDemoChildren)
const doctorBefore = JSON.stringify(doctorChildIds)
const state = { patients: canonicalDemoChildren }
const values = new Map([['existing-medical-data', 'untouched']])
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
const registration = await registerParentDemo({ role: 'mother', fullName: 'Jood Alajouri', nationalId: '3000000002', email: 'jood@example.test', password: 'Test@1234', confirmPassword: 'Test@1234' }, storage, webcrypto)
assert.equal(registration.success, true)
const user = await createUnifiedDemoAuth(storage, webcrypto).login('3000000002', 'Test@1234')
assert.equal(user.homePresentation, 'parent')
// Same resolver and selector called by ParentHome -> useMotherMedicalRecords.
const children = selectMotherChildren(state, parentFamilyScope(user))
assert.equal(children.length, 2)
assert.deepEqual(children.map(child => [child.id, child.name, child.dateOfBirth, child.placeOfBirth, child.gender]), [
  ['demo-basic-jood-omar', 'Omar Alajouri', '2023-06-15', 'Amman, Jordan', 'Male'],
  ['demo-basic-jood-layan', 'Layan Alajouri', '2024-09-20', 'Irbid, Jordan', 'Female'],
])
for (const child of children) {
  assert.equal(selectMotherMedicalRecord(state, parentFamilyScope(user), child.id), null)
  assert.equal(parentCanViewChild(user, child.id), false, 'Unsupported clinical detail routes remain blocked')
  assert.ok(!canonicalDemoChildren.some(record => record.id === child.id))
  assert.ok(!doctorChildIds[demoDoctorId].includes(child.id))
  for (const key of ['medicalVisits', 'prescriptions', 'growthMeasurements', 'vaccinations', 'milestones', 'clinicalAssessments', 'followUpAppointments', 'medicalNotes']) assert.equal(Object.hasOwn(child, key), false)
}
assert.deepEqual(ageFromBirthDate(children[0].dateOfBirth, new Date(2026, 10, 4)), { years: 3, months: 4 })
assert.deepEqual(ageFromBirthDate(children[1].dateOfBirth, new Date(2026, 10, 4)), { years: 2, months: 1 })
const refreshed = createUnifiedDemoAuth(storage, webcrypto).getUser()
assert.deepEqual(selectMotherChildren(state, parentFamilyScope(refreshed)), children)
for (const other of [{ id: '3000000001', role: 'mother' }, { id: '4000000001', role: 'father' }, { id: '3000000042', role: 'mother' }, { id: '3000000002', role: 'father' }]) {
  assert.ok(!selectMotherChildren(state, parentFamilyScope(other)).some(child => child.id.startsWith('demo-basic-jood')))
}
assert.deepEqual(selectMotherChildren(state, parentFamilyScope({ id: '3000000001', role: 'mother' })).map(child => child.id), ['demo-child-3', 'demo-child-lina'])
assert.equal(JSON.stringify(canonicalDemoChildren), medicalBefore)
assert.equal(JSON.stringify(doctorChildIds), doctorBefore)
assert.equal(values.get('existing-medical-data'), 'untouched')
console.log('3000000002 -> exactly Omar and Layan: real registration/login + ParentHome selector, profile fields, dynamic ages, refresh, isolation, no clinical records/doctor assignments passed')
