// Read-only helpers. A future backend must enforce authenticated doctor permissions.
export const recordSections = [
  { id: 'overview', icon: 'file', title: 'overviewTitle', subtitle: 'overviewSubtitle' },
  { id: 'growth', icon: 'growth', title: 'growthTitle', subtitle: 'growthSubtitle' },
  { id: 'vaccinations', icon: 'syringe', title: 'vaccinationsTitle', subtitle: 'vaccinationsSubtitle' },
  { id: 'milestones', icon: 'star', title: 'milestonesTitle', subtitle: 'milestonesSubtitle' },
  { id: 'clinical', icon: 'stethoscope', title: 'clinicalTitle', subtitle: 'clinicalSubtitle' },
  { id: 'notes', icon: 'notes', title: 'notesTitle', subtitle: 'notesSubtitle' },
  { id: 'prescriptions', icon: 'pill', title: 'prescriptionsTitle', subtitle: 'prescriptionsSubtitle' },
  { id: 'followup', icon: 'followup', title: 'followupTitle', subtitle: 'followupSubtitle' },
]

export const measurementTypes = {
  weight: { unit: 'kilogram', label: 'weight', icon: 'scale' },
  height: { unit: 'centimeter', label: 'height', icon: 'ruler' },
  headCircumference: { unit: 'centimeter', label: 'headCircumference', icon: 'head' },
}

export function parseRecordDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

export function ageFromBirthDate(value, now = new Date()) {
  const birth = parseRecordDate(value)
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!birth || birth > current) return null
  let months = (current.getFullYear() - birth.getFullYear()) * 12 + current.getMonth() - birth.getMonth()
  // Month-end birthdays use the last day in shorter months.
  const anniversary = Math.min(birth.getDate(), new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate())
  if (current.getDate() < anniversary) months -= 1
  return { years: Math.floor(months / 12), months: months % 12 }
}

export function measurementSeries(measurements = [], type) {
  const byDate = new Map()
  for (const measurement of measurements) {
    const date = measurement?.measurementDate ?? measurement?.date
    const value = measurement?.[{ weight: 'weightKg', height: 'heightCm', headCircumference: 'headCircumferenceCm' }[type]] ?? measurement?.[type]
    if (parseRecordDate(date) && Number.isFinite(value) && value > 0) {
      byDate.set(date, { date, value })
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function formatMeasurement(value, type, language) {
  return new Intl.NumberFormat(language, {
    style: 'unit', unit: measurementTypes[type].unit, unitDisplay: 'short', maximumFractionDigits: 2,
  }).format(value)
}
