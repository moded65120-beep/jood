import { ageInDays, dateOrdinal, isSupportedMeasurementDate, thirdBirthday } from './growthDates.js'

export const WHO_DAYS_PER_MONTH = 30.4375
export const REFERENCE_SCORES = [-3, -2, 0, 2, 3]
export const GROWTH_METRICS = {
  weightKg: { indicator: 'wfa', unitKey: 'kg' },
  heightCm: { indicator: 'lhfa', unitKey: 'cm' },
  headCircumferenceCm: { indicator: 'hcfa', unitKey: 'cm' },
}

export function referenceMethod(ageDays) {
  return ageDays <= 730 ? 'recumbent_length' : 'standing_height'
}

export function plotMeasurement(measurement, child, metric) {
  if (!GROWTH_METRICS[metric] || measurement.childId !== child.id || !isSupportedMeasurementDate(child.dateOfBirth, measurement.measurementDate)) return null
  const rawValue = measurement[metric]
  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue <= 0) return null
  const ageDays = ageInDays(child.dateOfBirth, measurement.measurementDate)
  let adjustmentCm = 0
  const expectedMethod = referenceMethod(ageDays)
  if (metric === 'heightCm') {
    // Never infer an actual method for legacy records that lack one.
    if (!['recumbent_length', 'standing_height'].includes(measurement.measurementMethod)) return null
    if (measurement.measurementMethod !== expectedMethod) adjustmentCm = expectedMethod === 'recumbent_length' ? 0.7 : -0.7
  }
  const value = rawValue + adjustmentCm
  if (!Number.isFinite(value) || value <= 0) return null
  return { measurementDate: measurement.measurementDate, ageDays, rawValue, value, adjustmentCm, measurementMethod: measurement.measurementMethod, referenceMethod: expectedMethod }
}

// Values below are copied from the validated daily table, never regenerated
// from LMS or interpolated. Patient adjustments do not alter the raw record.
export function buildGrowthChartData(dataset, child, measurements, metric) {
  const config = GROWTH_METRICS[metric]
  if (!config || !dataset || dataset.sex !== child.sex || dataset.indicator !== config.indicator || dateOrdinal(child.dateOfBirth) === null) return null
  const maxAgeDays = ageInDays(child.dateOfBirth, thirdBirthday(child.dateOfBirth))
  if (maxAgeDays > dataset.coverage.maxAgeDays) return null
  const points = measurements.map((measurement) => plotMeasurement(measurement, child, metric)).filter(Boolean).sort((a, b) => a.ageDays - b.ageDays)
  const byDay = new Map()
  for (const point of points) {
    if (!byDay.has(point.ageDays)) byDay.set(point.ageDays, [])
    byDay.get(point.ageDays).push(point)
  }
  const rows = []
  for (let day = 0; day <= maxAgeDays; day += 1) {
    const reference = dataset.rows[day]
    if (!reference || reference.ageDays !== day) return null
    const scores = Object.fromEntries(REFERENCE_SCORES.map((score) => [`sd${score}`, reference.zScores[String(score)]]))
    if (!Object.values(scores).every(Number.isFinite)) return null
    for (const point of byDay.get(day) ?? [null]) {
      rows.push({
        ageDays: day, ...scores,
        // Separate series explicitly preserve the 730/731 discontinuity.
        ...Object.fromEntries(REFERENCE_SCORES.flatMap((score) => [
          [`sd${score}Length`, day <= 730 ? scores[`sd${score}`] : null],
          [`sd${score}Height`, day >= 731 ? scores[`sd${score}`] : null],
        ])),
        childValue: point?.value ?? null,
        childLength: day <= 730 ? point?.value ?? null : null,
        childHeight: day >= 731 ? point?.value ?? null : null,
      })
    }
  }
  return { rows, points, maxAgeDays }
}
