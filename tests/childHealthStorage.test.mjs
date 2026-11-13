import assert from 'node:assert/strict'
import test from 'node:test'
import { createVaccinationRepository } from '../src/services/vaccinationRepository.js'
import { createMilestonesRepository } from '../src/services/milestonesRepository.js'
import { demoMotherId } from '../src/services/demoChildAccess.js'

function storage() {
  const data = new Map()
  return { data, get length() { return data.size }, key: index => [...data.keys()][index] ?? null, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
}
const childId = 'demo-child-3'
const pending = (notes = '') => ({ childId, kind: 'vaccination-visit', visitId: 'month2', stageId: 'month2', doseIds: ['combo1', 'rota1'], status: 'pending', notes, appointmentHistory: [] })
const administration = () => ({ ...pending('Administered without complications'), status: 'completed', administeredAt: '2026-01-02', vaccinationDate: '2026-01-02', administrations: ['combo1', 'rota1'].map(doseId => ({ childId, doseId, administeredAt: '2026-01-02', status: 'completed' })) })

test('vaccination administration persists across instances; aliases resolve, children stay separate, completed records cannot be replaced', () => {
  const db = storage(), repo = createVaccinationRepository({ storage: db })
  const saved = repo.saveVisit('adam', administration(), { expectedRecords: [] })
  assert.deepEqual(createVaccinationRepository({ storage: db }).read(childId), [saved])
  assert.deepEqual(repo.read('lina'), [])
  assert.throws(() => repo.saveVisit(childId, pending(), { expectedRecords: [saved] }), /historicalConflict/)
  assert.deepEqual(repo.read(childId), [saved])
  assert.throws(() => repo.read('invented-child'), /missingChildId/)
})

test('vaccination appointments preserve reschedules and fulfillment; notes-only changes persist separately from general follow-ups', () => {
  const db = storage(), repo = createVaccinationRepository({ storage: db })
  db.setItem('nomu.demo.sharedMedicalRecords.v1', 'untouched')
  let saved = repo.saveVisit(childId, { ...pending('initial'), appointmentDate: '2099-01-02', appointmentTime: '10:30' }, { expectedRecords: [] })
  saved = repo.saveVisit(childId, { ...saved, appointmentDate: '2099-01-03', appointmentTime: '12:00', appointmentHistory: [] }, { expectedRecords: [saved] })
  assert.deepEqual(saved.appointmentHistory.map(item => item.status), ['rescheduled', 'scheduled'])
  saved = repo.saveVisit(childId, { ...saved, notes: 'Bring the vaccination booklet', appointmentHistory: [] }, { expectedRecords: [saved] })
  assert.equal(repo.read(childId)[0].notes, 'Bring the vaccination booklet')
  assert.equal(saved.appointmentHistory.length, 2)
  saved = repo.saveVisit(childId, { ...saved, ...administration(), appointmentDate: saved.appointmentDate, appointmentTime: saved.appointmentTime }, { expectedRecords: [saved] })
  assert.deepEqual(saved.appointmentHistory.map(item => item.status), ['rescheduled', 'fulfilled'])
  assert.deepEqual(createVaccinationRepository({ storage: db }).read(childId), [saved])
  assert.equal(db.getItem('nomu.demo.sharedMedicalRecords.v1'), 'untouched')
})

test('vaccination legacy records are retained without duplicating repeated parent snapshots; stale writes fail', () => {
  const db = storage(), repo = createVaccinationRepository({ storage: db })
  const legacy = [{ childId, doseId: 'combo1', notes: 'Original' }, { childId, doseId: 'rota1', notes: 'Original' }]
  let saved = repo.saveVisit(childId, pending('visit'), { sourceRecords: legacy, expectedRecords: legacy })
  assert.equal(repo.read(childId, legacy).length, 3)
  const old = saved
  saved = repo.saveVisit(childId, { ...saved, notes: 'updated' }, { sourceRecords: legacy, expectedRecords: [...legacy, saved] })
  assert.throws(() => repo.saveVisit(childId, { ...old, notes: 'stale' }, { sourceRecords: legacy, expectedRecords: [...legacy, old] }), /recordConflict/)
  const records = repo.read(childId, legacy)
  assert.equal(records.length, 3)
  assert.deepEqual(records.filter(record => record.doseId), legacy)
  assert.equal(records.find(record => record.visitId).notes, 'updated')
  const conflicting = [...legacy, { ...legacy[0], administeredAt: '2026-01-01', status: 'completed' }]
  assert.throws(() => repo.saveVisit(childId, pending(), { sourceRecords: conflicting, expectedRecords: [...conflicting, saved] }), /historicalConflict/)
})

test('simultaneous vaccination sibling writes remain visible as conflicting records rather than last-write loss', () => {
  const db = storage(), repo = createVaccinationRepository({ storage: db })
  const saved = repo.saveVisit(childId, pending('baseline'), { expectedRecords: [] })
  const baselineKey = [...db.data.keys()][0]
  const baseline = JSON.parse(db.getItem(baselineKey))
  for (const id of ['concurrent-a', 'concurrent-b']) {
    db.setItem(baselineKey.replace(baseline.id, id), JSON.stringify({ ...baseline, id, order: 2, value: { ...baseline.value, record: { ...saved, notes: id }, supersedes: [baseline.id] } }))
  }
  assert.equal(repo.read(childId).length, 2)
  assert.throws(() => repo.saveVisit(childId, pending('overwrite'), { expectedRecords: repo.read(childId) }), /historicalConflict/)
})

test('import preserves completed and conflicting source records across refresh without duplicate imports', () => {
  const db = storage(), repo = createVaccinationRepository({ storage: db })
  const historical = [administration(), { childId, doseId: 'combo1', administeredAt: '2026-01-01' }, { childId, doseId: 'combo1', administeredAt: '2026-01-02' }]
  repo.importRecords('adam', historical)
  const count = db.length
  repo.importRecords(childId, historical)
  assert.equal(db.length, count)
  assert.deepEqual(createVaccinationRepository({ storage: db }).read(childId), historical)
})

test('milestone answers and notes save independently by mother, child and skill and survive a refresh', () => {
  const db = storage(), repo = createMilestonesRepository({ storage: db })
  repo.saveResponse('adam', demoMotherId, 'm2-social', { answer: 'yes' })
  repo.saveResponse(childId, demoMotherId, 'm2-social', { note: 'Smiles at family' })
  repo.saveResponse(childId, demoMotherId, 'm4-motor', { answer: 'notYet', note: 'Practising' })
  repo.saveResponse(childId, 'another-demo-mother', 'm2-social', { answer: 'unsure' })
  repo.saveResponse('lina', demoMotherId, 'm2-social', { answer: 'notYet' })
  const refreshed = createMilestonesRepository({ storage: db })
  assert.equal(refreshed.read('adam', demoMotherId)['m2-social'].answer, 'yes')
  assert.equal(refreshed.read(childId, demoMotherId)['m2-social'].note, 'Smiles at family')
  assert.equal(refreshed.read(childId, demoMotherId)['m4-motor'].answer, 'notYet')
  assert.equal(refreshed.read(childId, 'another-demo-mother')['m2-social'].answer, 'unsure')
  assert.equal(refreshed.read('lina', demoMotherId)['m2-social'].answer, 'notYet')
  refreshed.saveResponse('adam', demoMotherId, 'm2-social', { answer: null })
  assert.equal(refreshed.read('adam', demoMotherId)['m2-social'].note, 'Smiles at family')
})

test('same-tab notifications, cross-tab events, refresh reads and listener cleanup work for both repositories', () => {
  const db = storage(), host = new EventTarget()
  for (const create of [createVaccinationRepository, createMilestonesRepository]) {
    const a = create({ storage: db, events: host }), b = create({ storage: db, events: host })
    let notifications = 0
    const unsubscribe = b.subscribe(() => notifications++)
    if (create === createVaccinationRepository) {
      a.saveVisit(childId, pending('shared'), { expectedRecords: [] })
      assert.equal(b.read(childId)[0].notes, 'shared')
    } else {
      a.saveResponse(childId, demoMotherId, 'skill', { answer: 'yes' })
      assert.equal(b.read(childId, demoMotherId).skill.answer, 'yes')
    }
    assert.equal(notifications, 1)
    const event = new Event('storage')
    Object.defineProperty(event, 'key', { value: [...db.data.keys()].at(-1) })
    host.dispatchEvent(event)
    assert.equal(notifications, 2)
    const unrelated = new Event('storage')
    Object.defineProperty(unrelated, 'key', { value: 'nomu.language' })
    host.dispatchEvent(unrelated)
    assert.equal(notifications, 2)
    unsubscribe(); host.dispatchEvent(event)
    assert.equal(notifications, 2)
  }
})

test('concurrent milestone field patches are merged and never replace other answers or notes', () => {
  const db = storage(), a = createMilestonesRepository({ storage: db }), b = createMilestonesRepository({ storage: db })
  a.saveResponse(childId, demoMotherId, 'skill', { answer: 'yes' })
  b.saveResponse(childId, demoMotherId, 'skill', { note: 'From another tab' })
  a.saveResponse(childId, demoMotherId, 'different-skill', { answer: 'unsure' })
  assert.equal(b.read(childId, demoMotherId).skill.answer, 'yes')
  assert.equal(b.read(childId, demoMotherId).skill.note, 'From another tab')
  assert.equal(b.read(childId, demoMotherId)['different-skill'].answer, 'unsure')
})

test('corrupt or blocked storage fails without replacing existing bytes or reporting a successful save', () => {
  const db = storage(), repo = createMilestonesRepository({ storage: db })
  repo.saveResponse(childId, demoMotherId, 'skill', { note: 'preserved' })
  const key = [...db.data.keys()][0]
  db.setItem(key, '{broken')
  assert.throws(() => repo.read(childId, demoMotherId))
  assert.throws(() => repo.saveResponse(childId, demoMotherId, 'skill', { answer: 'yes' }))
  assert.equal(db.getItem(key), '{broken')
  const blocked = { get length() { throw Error('blocked') } }
  assert.throws(() => createVaccinationRepository({ storage: blocked }).read(childId), /blocked/)
  const quota = storage()
  quota.setItem = () => { throw Error('quota') }
  assert.throws(() => createMilestonesRepository({ storage: quota }).saveResponse(childId, demoMotherId, 'skill', { answer: 'yes' }), /quota/)
})
