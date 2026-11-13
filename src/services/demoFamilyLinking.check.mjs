import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { demoParentFamily, parentFamilyScope, parentCanViewChild, demoChildIdentity, canonicalDemoChildren, demoDoctorId, demoMotherId, initialDoctorChildIds } from './demoChildAccess.js'
import { createUnifiedDemoAuth } from './unifiedDemoAuth.js'
import { selectMotherChildren, selectMotherMedicalRecord, selectDoctorPatients } from './medicalRecordSelectors.js'

const before = JSON.stringify(canonicalDemoChildren)
const storageData = new Map([['medical-data', 'untouched']])
const storage = { getItem: key => storageData.get(key) ?? null, setItem: (key, value) => storageData.set(key, value), removeItem: key => storageData.delete(key) }
const auth = createUnifiedDemoAuth(storage, webcrypto)
const state = { patients: canonicalDemoChildren, doctorPatientIds: initialDoctorChildIds }
for (const [id, role] of [['3000000001', 'mother'], ['4000000001', 'father']]) {
  const user = await auth.login(id, 'Demo@1234')
  assert.equal(user.familyScope, demoMotherId)
  if (role === 'father') assert.equal(user.name, 'Ahmad')
  assert.equal(user.homePresentation, role === 'mother' ? 'legacy-mother' : 'parent')
  assert.equal(demoParentFamily(id, role), demoMotherId)
  assert.deepEqual(selectMotherChildren(state, parentFamilyScope(user)).map(child => child.id), ['demo-child-3', 'demo-child-lina'])
  assert.ok(parentCanViewChild(user, 'adam')); assert.ok(parentCanViewChild(user, 'demo-child-3'))
  assert.ok(parentCanViewChild(user, 'lina')); assert.ok(!parentCanViewChild(user, 'demo-child-1'))
  assert.equal(selectMotherMedicalRecord(state, parentFamilyScope(user), 'adam').profile.id, 'demo-child-3')
  assert.equal(selectDoctorPatients(state, demoDoctorId).find(child => child.id === 'demo-child-3').id, 'demo-child-3')
}
assert.equal(demoParentFamily('1234567890', 'mother'), demoMotherId)
assert.equal(demoParentFamily('3000000001', 'father'), null)
for (const [id, role] of [['3000000042', 'mother'], ['4000000042', 'father']]) {
  const user = { id, role, familyScope: demoMotherId }
  assert.equal(parentFamilyScope(user), null, 'A claimed family scope cannot override the explicit ID mapping')
  assert.equal(selectMotherChildren(state, parentFamilyScope(user)).length, 0)
  assert.ok(!parentCanViewChild(user, 'adam'))
}
const adam = demoChildIdentity('adam')
assert.equal(adam.id, 'demo-child-3'); assert.equal(adam.medicalRecordId, adam.id)
assert.deepEqual(adam.linkedParentNationalIds, ['3000000001', '4000000001', '1234567890'])
assert.equal(demoChildIdentity('lina').dateOfBirth, null)
assert.equal(adam.placeOfBirth, null)
assert.equal(new Set(canonicalDemoChildren.map(child => child.id)).size, canonicalDemoChildren.length)
assert.equal(JSON.stringify(canonicalDemoChildren), before)
assert.equal(storageData.get('medical-data'), 'untouched')
console.log('Exact parent/family linking, authenticated co-parents, unlinked/forged scope denial, canonical IDs, legacy compatibility, no duplicate children and unchanged data passed')
