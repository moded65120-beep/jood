const DAY_MS = 86400000

// Date-only UTC ordinals avoid daylight-saving shifts and local timezone drift.
export function dateOrdinal(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1) return null
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.getTime() / DAY_MS
}

export function ageInDays(dateOfBirth, measurementDate) {
  const birth = dateOrdinal(dateOfBirth)
  const measured = dateOrdinal(measurementDate)
  return birth === null || measured === null ? null : measured - birth
}

export function thirdBirthday(dateOfBirth) {
  if (dateOrdinal(dateOfBirth) === null) return null
  const [year, month, day] = dateOfBirth.split('-').map(Number)
  // Feb 29 maps to Feb 28 when the anniversary year is not a leap year.
  const lastDay = new Date(Date.UTC(year + 3, month, 0)).getUTCDate()
  return `${year + 3}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

export function isSupportedMeasurementDate(dateOfBirth, measurementDate) {
  const age = ageInDays(dateOfBirth, measurementDate)
  const end = thirdBirthday(dateOfBirth)
  return age !== null && age >= 0 && end !== null && measurementDate <= end
}

export function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatGrowthDate(value, language) {
  const ordinal = dateOrdinal(value)
  return ordinal === null ? '' : new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(ordinal * DAY_MS))
}

// Display-only calendar duration. Month anniversaries clamp to the last valid
// day, using the original birth day rather than accumulating month-end drift.
export function calendarAge(dateOfBirth, measurementDate) {
  const birth = dateOrdinal(dateOfBirth)
  const measured = dateOrdinal(measurementDate)
  if (birth === null || measured === null || measured < birth) return null
  const [year, month, day] = dateOfBirth.split('-').map(Number)
  const [endYear, endMonth] = measurementDate.split('-').map(Number)
  let months = (endYear - year) * 12 + endMonth - month
  function anniversary(offset) {
    const date = new Date(0)
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCFullYear(year, month - 1 + offset + 1, 0)
    date.setUTCDate(Math.min(day, date.getUTCDate()))
    return date.getTime() / DAY_MS
  }
  if (anniversary(months) > measured) months -= 1
  return { years: Math.floor(months / 12), months: months % 12, days: measured - anniversary(months) }
}

export function formatCalendarAge(age, language) {
  if (!age) return ''
  const parts = [['year', age.years], ['month', age.months], ['day', age.days]]
    .filter(([, value]) => value > 0)
  if (!parts.length) parts.push(['day', 0])
  return new Intl.ListFormat(language, { style: 'long', type: 'conjunction' }).format(
    parts.map(([unit, value]) => new Intl.NumberFormat(language, { style: 'unit', unit, unitDisplay: 'long' }).format(value)),
  )
}
