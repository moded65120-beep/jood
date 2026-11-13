import { GROWTH_METRICS, plotMeasurement } from './growthChartData.js'
import { isSupportedMeasurementDate, localDateString } from './growthDates.js'
import { evaluateGrowthMeasurement } from './growthWarnings.js'

// Same record contract as the doctor form. No storage or second data model.
export function childMeasurements(child, measurements) {
  if (child?.id == null || !Array.isArray(measurements)) return []
  return measurements.filter((record) => record && record.childId === child.id)
}

export function datedMeasurements(child, measurements) {
  return childMeasurements(child, measurements)
    .filter((record) => isSupportedMeasurementDate(child.dateOfBirth, record.measurementDate) && record.measurementDate <= localDateString())
    .sort((a, b) => a.measurementDate.localeCompare(b.measurementDate))
}

export function latestMeasurement(child, measurements) {
  return datedMeasurements(child, measurements)
    .filter((record) => Object.keys(GROWTH_METRICS).some((metric) => plotMeasurement(record, child, metric)))
    .at(-1) ?? null
}

export function buildGrowthInsight(dataset, child, measurements, metric) {
  const records = childMeasurements(child, measurements)
  if (!records.length) return { status: 'empty' }
  if (!GROWTH_METRICS[metric]) return { status: 'invalid' }
  const valid = datedMeasurements(child, records).filter((record) => plotMeasurement(record, child, metric))
  const latest = valid.at(-1)
  if (!latest) return { status: 'invalid' }
  const assessment = evaluateGrowthMeasurement(dataset, child, latest, metric)
  if (assessment.status !== 'evaluated') return { status: 'unavailable' }
  // Above/below are descriptive comparisons, not clinical classifications.
  // Only exact median equality is labelled median; no invented "near" band.
  const position = assessment.zScore === 0 ? 'median' : assessment.zScore > 0 ? 'above' : 'below'
  return {
    status: 'ready', metric, latest, assessment,
    position: assessment.warning ? 'review' : position,
    hasExcludedRecords: valid.length !== records.length,
  }
}
