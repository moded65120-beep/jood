import { GROWTH_METRICS, plotMeasurement } from './growthChartData.js'

// WHO Anthro LMS and restricted weight tails. See docs/growth-warnings.md.
export function lmsValue(z, { L, M, S }) {
  return L === 0 ? M * Math.exp(S * z) : M * (1 + L * S * z) ** (1 / L)
}

export function lmsZScore(value, row, restricted = false) {
  if (!row || ![value, row.L, row.M, row.S].every(Number.isFinite) || value <= 0 || row.M <= 0 || row.S <= 0) return null
  const { L, M, S } = row
  const z = L === 0 ? Math.log(value / M) / S : L === 1 ? (value - M) / (M * S) : Math.expm1(L * Math.log(value / M)) / (L * S)
  if (!Number.isFinite(z)) return null
  let result = z
  if (restricted && z > 3) result = 3 + (value - lmsValue(3, row)) / (lmsValue(3, row) - lmsValue(2, row))
  if (restricted && z < -3) result = -3 + (value - lmsValue(-3, row)) / (lmsValue(-2, row) - lmsValue(-3, row))
  return Number.isFinite(result) ? result : null
}

export function measurementZScore(dataset, child, measurement, metric) {
  const config = GROWTH_METRICS[metric]
  if (!config || !dataset || dataset.sex !== child.sex || dataset.indicator !== config.indicator) return null
  const point = plotMeasurement(measurement, child, metric)
  if (!point) return null
  const row = dataset.rows?.[point.ageDays]
  if (!row || row.ageDays !== point.ageDays) return null
  const zScore = lmsZScore(point.value, row, config.indicator === 'wfa')
  return zScore === null ? null : { ...point, zScore, indicator: config.indicator }
}
