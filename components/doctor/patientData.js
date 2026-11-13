const day = new Date()
function localDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
export const today = localDate(day)
function offset(days) { const date = new Date(day); date.setDate(date.getDate() + days); return localDate(date) }
const records = [
  ['Haneen Khalil', 24, 'Female', '00123', -6, -2],
  ['Jana Adham', 12, 'Female', '00456', -13, 18],
  ['Adam Ahmad', 36, 'Male', '00789', -28, 2],
  ['Lily Omar', 8, 'Female', '01011', -17, 14],
  ['Omar Khaled', 14, 'Male', '01456', -30, 7],
  ['Sara Nasser', 26, 'Female', '01890', -8, null],
  ['Yazan Ali', 9, 'Male', '02134', -20, 10],
  ['Maya Samir', 48, 'Female', '02301', -4, 21],
  ['Zain Faris', 60, 'Male', '02302', -9, -1],
  ['Nour Sami', 18, 'Female', '02303', -11, null],
]
const arabicNames = ['حنين خليل', 'جنى أدهم', 'آدم أحمد', 'ليلي عمر', 'عمر خالد', 'سارة ناصر', 'يزن علي', 'مايا سمير', 'زين فارس', 'نور سامي']
// Fixed fictional birth dates, not derived from a hardcoded age at render time.
const birthDates = ['2024-10-18', '2025-10-18', '2023-10-18', '2026-02-18', '2025-08-18', '2024-08-18', '2026-01-18', '2022-10-18', '2021-10-18', '2025-04-18']
export const registeredPatients = records.map(([name, months, gender, file, last, next], index) => ({
  id: `demo-child-${index + 1}`, name, months, gender, file: `MF-${file}`,
  nameAr: arabicNames[index],
  dateOfBirth: birthDates[index],
  growthMeasurements: [],
  medicalNotes: [],
  nationalId: `DEMO-${String(index + 1).padStart(6, '0')}`,
  lastVisit: offset(last), nextFollowUp: next === null ? null : offset(next),
  visits: index < 3 ? [today] : [],
}))
export const initialPatients = registeredPatients.slice(0, 8)
export function followUpStatus(patient) { return !patient.nextFollowUp ? 'No Follow-up' : patient.nextFollowUp < today ? 'Overdue' : 'Upcoming' }
// Presentation only: stored ISO dates and native date inputs remain unchanged.
export function formatDate(value, language = 'en') { return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: language === 'ar' ? 'long' : 'short', year: 'numeric', calendar: 'gregory', numberingSystem: language === 'ar' ? 'arab' : 'latn' }).format(new Date(`${value}T12:00:00`)) }

export function patientName(patient, language) { return language === 'ar' ? patient.nameAr || patient.name : patient.name }

// Intl applies the language's unit and plural rules, including Arabic dual forms.
export function formatAge(value, unit, language) {
  return new Intl.NumberFormat(language, { style: 'unit', unit, unitDisplay: 'long' }).format(value)
}
