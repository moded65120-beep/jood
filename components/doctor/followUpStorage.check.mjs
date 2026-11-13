import assert from 'node:assert/strict'
import { FOLLOW_UP_STORAGE_KEY, loadFollowUpPatients, persistFollowUps } from './followUpStorage.js'
import { registeredPatients } from './patientData.js'
import { appointmentsFor, saveFollowUp, syncFollowUp } from './followUpData.js'

const values = new Map([['nomu.language', 'ar'], ['another-team-data', 'keep me']])
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
const base = registeredPatients.slice(0, 2).map(patient => syncFollowUp({ ...patient, followUpAppointments: [] }))
const saved = saveFollowUp(base, base[0].id, { id: `${base[0].id}:test-appointment`, date: '2099-11-01', time: '10:30', reason: 'Fictional demo reason', instructions: 'تعليمات افتراضية فقط' })
assert.ok(persistFollowUps(saved, storage))
assert.equal(values.get('nomu.language'), 'ar')
assert.equal(values.get('another-team-data'), 'keep me')
const payload = JSON.parse(values.get(FOLLOW_UP_STORAGE_KEY))
assert.equal(payload.version, 1)
assert.ok(!values.get(FOLLOW_UP_STORAGE_KEY).includes(base[0].name))
assert.ok(!values.get(FOLLOW_UP_STORAGE_KEY).includes('medicalVisits'))
const reloaded = loadFollowUpPatients(base, storage)
assert.equal(reloaded.warning, null)
assert.equal(reloaded.patients[0].nextFollowUp, '2099-11-01')
assert.equal(reloaded.patients[0].nextFollowUpTime, '10:30')
assert.equal(reloaded.patients[0].followUpAppointments[0].reason, 'Fictional demo reason')
assert.equal(reloaded.patients[1].followUpAppointments.length, 0)
const restoredAssignment = loadFollowUpPatients([base[1]], storage)
assert.ok(restoredAssignment.patients.some(patient => patient.id === base[0].id), 'A demo child with persisted appointments remains accessible after refresh')
storage.setItem(FOLLOW_UP_STORAGE_KEY, JSON.stringify({ ...payload, appointments: [...payload.appointments, { bad: 'data' }, { ...payload.appointments[0], id: 'unknown', patientId: 'real-person' }] }))
const partlyInvalid = loadFollowUpPatients(base, storage)
assert.equal(partlyInvalid.warning, 'invalidStorage')
assert.equal(partlyInvalid.patients[0].followUpAppointments.length, 1)
storage.setItem(FOLLOW_UP_STORAGE_KEY, '{broken-json')
assert.equal(loadFollowUpPatients(base, storage).warning, 'invalidStorage')
storage.setItem(FOLLOW_UP_STORAGE_KEY, 'null')
assert.equal(loadFollowUpPatients(base, storage).warning, 'invalidStorage')
const unavailable = { getItem() { throw new Error('Blocked') }, setItem() { throw new Error('Quota') } }
assert.equal(loadFollowUpPatients(base, unavailable).warning, 'storageUnavailable')
assert.equal(persistFollowUps(saved, unavailable), false)
const cancelled = { ...payload.appointments[0], status: 'cancelled' }
storage.setItem(FOLLOW_UP_STORAGE_KEY, JSON.stringify({ ...payload, appointments: [cancelled] }))
const afterCancelRefresh = loadFollowUpPatients(base, storage)
assert.equal(afterCancelRefresh.patients[0].nextFollowUp, null)
assert.equal(appointmentsFor(afterCancelRefresh.patients[0])[0].status, 'cancelled')
assert.equal(values.get('another-team-data'), 'keep me')
console.log('LocalStorage refresh roundtrip, child isolation, restored assignments, cancellation, invalid data, unavailable storage and unrelated-key preservation passed')
