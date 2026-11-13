import assert from 'node:assert/strict'
import test from 'node:test'
import { matchesAgeGroup } from '../src/components/doctor/ageGroupFilter.js'

test('age groups use birth dates and include the third birthday but no older children', () => {
  const now = new Date(2026, 9, 31)
  for (const [dateOfBirth, expected] of [
    ['2026-10-31', 'infant'], ['2025-11-01', 'infant'],
    ['2025-10-31', 'toddler'], ['2024-11-01', 'toddler'],
    ['2024-10-31', 'child'], ['2023-11-01', 'child'],
    ['2023-10-31', 'child'], ['2023-10-30', null], ['2022-10-31', null],
    ['invalid', null], ['2027-10-31', null],
  ]) {
    const patient = { dateOfBirth, months: 999 }
    assert.equal(matchesAgeGroup(patient, 'all', now), true)
    for (const group of ['infant', 'toddler', 'child']) {
      assert.equal(matchesAgeGroup(patient, group, now), group === expected, `${dateOfBirth}: ${group}`)
    }
  }
  assert.equal(matchesAgeGroup({ dateOfBirth: '2024-02-29' }, 'child', new Date(2027, 1, 28)), true)
  assert.equal(matchesAgeGroup({ dateOfBirth: '2024-02-29' }, 'child', new Date(2027, 2, 1)), false)
})
