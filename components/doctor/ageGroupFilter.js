import { ageFromBirthDate, parseRecordDate } from './medicalRecordData.js'

export function matchesAgeGroup(patient, group, now = new Date()) {
  if (group === 'all') return true
  const age = ageFromBirthDate(patient.dateOfBirth, now)
  if (!age) return false
  if (group === 'infant') return age.years === 0
  if (group === 'toddler') return age.years === 1
  if (group !== 'child' || age.years < 2) return false
  const birth = parseRecordDate(patient.dateOfBirth)
  const year = birth.getFullYear() + 3
  const day = Math.min(birth.getDate(), new Date(year, birth.getMonth() + 1, 0).getDate())
  const thirdBirthday = new Date(year, birth.getMonth(), day)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return today <= thirdBirthday
}
