// Active profiles only. Historical clinical author strings are never migrated.
export const doctorDirectory = Object.freeze([
  { id: 'ahmad', nameKey: 'doctorAhmad', specialtyKey: 'generalPediatrics', name: 'Dr. Ahmad Khaled', nameAr: 'د. أحمد خالد', specialty: 'Pediatric Ophthalmologist', specialtyAr: 'أخصائي عيون أطفال', gender: 'male', defaultImage: '/assets/doctors/ahmad.jpg', accent: 'blue', days: [0, 2, 4], times: ['09:00', '10:00', '11:00'] },
  { id: 'rania', nameKey: 'doctorRania', specialtyKey: 'pediatricCare', name: 'Dr. Reem Al-Zahrani', nameAr: 'د. ريم الزهراني', specialty: 'Pediatric Pulmonologist', specialtyAr: 'أخصائية أمراض صدرية أطفال', gender: 'female', defaultImage: '/assets/doctors/reem.jpg', accent: 'pink', days: [1, 3], times: ['11:30', '13:00', '14:30'] },
  { id: 'omar', nameKey: 'doctorOmar', specialtyKey: 'pediatricDevelopment', name: 'Dr. Omar Haddad', nameAr: 'د. عمر حداد', specialty: 'Pediatric Cardiologist', specialtyAr: 'أخصائي قلب أطفال', gender: 'male', defaultImage: '/assets/doctors/omar.jpg', accent: 'blue', days: [0, 3, 6], times: ['08:30', '12:00', '15:00'] },
  { id: 'demo-doctor-sarah-ahmad', nameKey: 'doctorLina', specialtyKey: 'pediatricNeurology', name: 'Dr. Lina Mansour', nameAr: 'د. لينا منصور', specialty: 'Pediatric Neurologist', specialtyAr: 'أخصائية أعصاب أطفال', gender: 'female', defaultImage: '/assets/doctors/lina.jpg', accent: 'pink', scheduleSource: 'existing-doctor-calendar' },
  // New independent demo schedules, not copies of existing doctor calendars or histories.
  { id: 'yazan', scheduleSource: 'new-doctor-calendar', nameKey: 'doctorYazan', specialtyKey: 'pediatricGastroenterology', name: 'Dr. Yazan Ibrahim', nameAr: 'د. يزن إبراهيم', specialty: 'Pediatric Gastroenterologist', specialtyAr: 'أخصائي جهاز هضمي أطفال', gender: 'male', defaultImage: '/assets/doctors/yazan.jpg', accent: 'blue', days: [1, 4], times: ['10:30', '13:30'] },
  { id: 'fadi', scheduleSource: 'new-doctor-calendar', nameKey: 'doctorFadi', specialtyKey: 'developmentalPediatrics', name: 'Dr. Fadi Nasser', nameAr: 'د. فادي ناصر', specialty: 'Developmental Pediatrician', specialtyAr: 'أخصائي نمو وتطور الأطفال', gender: 'male', defaultImage: '/assets/doctors/fadi.jpg', accent: 'pink', days: [2, 5], times: ['09:30', '14:00'] },
].map(profile => Object.freeze({ ...profile, currentImage: profile.defaultImage })))
export const getDoctorProfile = id => doctorDirectory.find(doctor => doctor.id === id)

// For active appointment displays only. Clinical history continues to use its stored author text.
export function activeDoctorName(nameKey, language, fallback) {
  const doctor=doctorDirectory.find(profile=>profile.nameKey===nameKey)
  return doctor ? language==='ar'?doctor.nameAr:doctor.name : fallback
}

export function activeDoctorSpecialty(specialtyKey, language, fallback) {
  const doctor=doctorDirectory.find(profile=>profile.specialtyKey===specialtyKey)
  return doctor ? language==='ar'?doctor.specialtyAr:doctor.specialty : fallback
}
