import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { lmsValue, lmsZScore, measurementZScore } from '../src/utils/whoZScores.js'
import { evaluateGrowthMeasurement, WHO_WARNING_RULES } from '../src/utils/growthWarnings.js'
import { GROWTH_METRICS } from '../src/utils/growthChartData.js'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'

const child = { id: 'test', sex: 'female', dateOfBirth: '2024-01-01' }
const record = { childId: child.id, measurementDate: '2024-01-02', weightKg: 3.123456789, heightCm: 49.123456789, headCircumferenceCm: 34.123456789, measurementMethod: 'recumbent_length' }
const load = async (indicator, sex) => JSON.parse(await readFile(new URL(`../src/data/who/reference/${indicator}-${sex}.json`, import.meta.url)))
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`)

test('sex, indicator, exact day and decimal raw values select the official LMS row', async () => {
  for (const sex of ['male', 'female']) {
    for (const [metric, { indicator }] of Object.entries(GROWTH_METRICS)) {
      const dataset = await load(indicator, sex)
      const selected = { ...child, sex }
      const result = measurementZScore(dataset, selected, record, metric)
      assert.equal(result.ageDays, 1)
      assert.equal(result.rawValue, record[metric])
      close(result.zScore, lmsZScore(record[metric], dataset.rows[1], indicator === 'wfa'))
      assert.notEqual(result.zScore, lmsZScore(record[metric], dataset.rows[0], indicator === 'wfa'))
      assert.equal(measurementZScore(dataset, { ...selected, sex: sex === 'male' ? 'female' : 'male' }, record, metric), null)
      assert.equal(measurementZScore({ ...dataset, indicator: 'wrong' }, selected, record, metric), null)
    }
  }
})

test('L=0, median precision and restricted weight tails follow analytical formulas', () => {
  const row = { L: 0, M: 10, S: 0.1 }
  close(lmsZScore(10, row), 0)
  close(lmsZScore(10 * Math.exp(0.2), row), 2)
  for (const score of [-5, -4, -3, -2, 0, 2, 3, 4, 5]) {
    const value = score > 3 ? lmsValue(3, row) + (score - 3) * (lmsValue(3, row) - lmsValue(2, row))
      : score < -3 ? lmsValue(-3, row) + (score + 3) * (lmsValue(-2, row) - lmsValue(-3, row)) : lmsValue(score, row)
    close(lmsZScore(value, row, true), score)
    if (Math.abs(score) > 3) assert.notEqual(lmsZScore(value, row), lmsZScore(value, row, true))
  }
  for (const L of [0, 1, -0.2]) close(lmsZScore(10.000000001, { ...row, L }), Math.log(10.000000001 / 10) / 0.1, 1e-15)
})

test('all official daily curve tables cross-check LMS, including extreme weight extensions', async () => {
  for (const sex of ['male', 'female']) for (const { indicator } of Object.values(GROWTH_METRICS)) {
    const dataset = await load(indicator, sex)
    for (const row of dataset.rows) for (const score of [-4, -3, -2, 0, 2, 3, 4]) {
      // Published curve values are rounded to 0.001 units; LMS parameters are not.
      close(lmsZScore(row.zScores[score], row, indicator === 'wfa'), score, 0.01)
    }
  }
})

test('method conversion at days 730/731 is explicit and never mutates the record', async () => {
  const dataset = await load('lhfa', 'female')
  for (const [measurementDate, measurementMethod, ageDays, adjustmentCm] of [
    ['2025-12-31', 'standing_height', 730, 0.7],
    ['2026-01-01', 'recumbent_length', 731, -0.7],
  ]) {
    const entry = { ...record, measurementDate, measurementMethod, heightCm: 86.123456789 }
    const before = structuredClone(entry)
    const result = measurementZScore(dataset, child, entry, 'heightCm')
    assert.equal(result.ageDays, ageDays)
    assert.equal(result.adjustmentCm, adjustmentCm)
    close(result.zScore, lmsZScore(entry.heightCm + adjustmentCm, dataset.rows[ageDays]))
    assert.deepEqual(entry, before)
  }
})

test('indicator-specific limits are strict and separate review from potential errors', () => {
  // Exact arithmetic fixture isolates rule boundaries from LMS floating point.
  for (const [metric, { lower, upper, id }] of Object.entries(WHO_WARNING_RULES)) {
    const dataset = { sex: child.sex, indicator: GROWTH_METRICS[metric].indicator, rows: [null, { ageDays: 1, L: 1, M: 128, S: 1 / 128 }] }
    for (const score of [-6.5, -6, -5.5, -5, -3.5, -3, -2.5, 0, 2.5, 3, 3.5, 5, 5.5, 6, 6.5]) {
      const assessment = evaluateGrowthMeasurement(dataset, child, { ...record, [metric]: 128 + score }, metric)
      close(assessment.zScore, score)
      const expected = score < lower || score > upper ? 'potential_error' : Math.abs(score) > 3 ? 'clinical_review' : null
      assert.equal(assessment.warning?.category ?? null, expected)
      if (expected === 'potential_error') assert.equal(assessment.warning.ruleId, id)
    }
  }
})

test('missing or invalid reference inputs never fabricate a normal result', async () => {
  const data = await load('wfa', 'female')
  for (const dataset of [null, { ...data, rows: [] }, { ...data, rows: [null, { ageDays: 2, L: 1, M: 3, S: 0.1 }] }, { ...data, rows: [null, { ageDays: 1, L: 1, M: 3, S: 0 }] }]) {
    const result = evaluateGrowthMeasurement(dataset, child, record, 'weightKg')
    assert.equal(result.status, 'unavailable')
    assert.equal(result.zScore, null)
    assert.equal(result.warning, null)
  }
  assert.equal(measurementZScore(data, child, { ...record, measurementDate: '2027-01-02' }, 'weightKg'), null)
  assert.equal(lmsZScore(Infinity, data.rows[1]), null)
})

test('structured warnings have readable English and Arabic messages and source IDs', async () => {
  const data = await load('hcfa', 'female')
  for (const dictionary of [en, ar]) for (const score of [3.5, 6]) {
    const entry = { ...record, headCircumferenceCm: lmsValue(score, data.rows[1]) }
    const result = evaluateGrowthMeasurement(data, child, entry, 'headCircumferenceCm', (key) => key.split('.').reduce((value, part) => value[part], dictionary))
    assert.equal(result.warning.message, score === 6 ? dictionary.growth.warningPotentialError : dictionary.growth.warningClinicalReview)
    assert.match(result.warning.source, /^https:\/\/cdn.who.int\//)
    assert.ok(result.warning.ruleId)
    assert.equal(result.warning.measurementType, 'headCircumferenceCm')
  }
})
