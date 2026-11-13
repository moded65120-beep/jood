import assert from 'node:assert/strict'
import { fatherChildSummary } from './fatherChildSummary.js'
import { getDemoChild } from '../pages/mother/childDemoData.js'

const user = { id: '4000000001', role: 'father' }
const now = new Date('2026-11-05T09:00:00')
for (const [alias, id] of [['adam', 'demo-child-3'], ['lina', 'demo-child-lina']]) {
  const seed = getDemoChild(alias)
  const empty = { medicalVisits: [], growthMeasurements: [], followUps: { upcoming: [], past: [], cancelled: [], missed: [] } }
  const before = JSON.stringify([seed, empty])
  const summary = fatherChildSummary(user, id, empty, [], now)
  assert.equal(summary.height, seed.height)
  assert.equal(summary.weight, seed.weight)
  assert.equal(summary.visitDate, seed.lastVisit.slice(0, 10))
  assert.equal(summary.doctorKey, seed.doctorKey)
  if (alias === 'lina') assert.equal(summary.followUp.date, '2026-11-10')
  else assert.equal(summary.followUp, null, 'Past seed follow-ups are not upcoming')
  const updated = { ...empty, medicalVisits: [{ date: '2026-11-04', doctor: 'Recorded doctor' }], growthMeasurements: [{ date: '2026-11-04', weight: 13.2, height: 90 }], followUps: { ...empty.followUps, upcoming: [{ date: '2026-11-08', time: '10:30', status: 'scheduled' }] } }
  const changed = fatherChildSummary(user, id, updated, [], now)
  assert.equal(changed.height, 90); assert.equal(changed.weight, 13.2)
  assert.equal(changed.visitDate, '2026-11-04'); assert.equal(changed.doctor, 'Recorded doctor')
  assert.equal(changed.followUp.date, '2026-11-08')
  const cancelled = { ...empty, followUps: { ...empty.followUps, cancelled: [{ date: '2026-11-10' }] } }
  assert.equal(fatherChildSummary(user, id, cancelled, [], now).followUp, null)
  assert.equal(JSON.stringify([seed, empty]), before, 'No medical fixtures or records are modified')
}
assert.equal(fatherChildSummary({ id: '4000000042', role: 'father' }, 'demo-child-3', null, [], now), null)
assert.equal(fatherChildSummary(user, 'demo-basic-jood-omar', null, [], now), null)
console.log('Father summaries match existing Child Details fixtures; shared updates override, future follow-ups only, cancellation respected, access isolation and no writes passed')
