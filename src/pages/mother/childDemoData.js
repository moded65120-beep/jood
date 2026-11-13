// Frontend fixtures only. Replace this module with the mother-authorized API response later.
export const childSections = [
  ['overview', 'mother.childOverview', 'user'],
  ['medical-record', 'navigation.medicalRecord', 'record'],
  ['prescriptions', 'navigation.prescriptions', 'prescription'],
  ['follow-up-visits', 'mother.followUpVisits', 'calendar'],
  ['vaccinations', 'navigation.vaccinations', 'vaccine'],
  ['growth-chart', 'mother.growthChart', 'growth'],
  ['milestones', 'mother.milestones', 'star'],
  ['ai-assistant', 'navigation.aiAssistant', 'assistant'],
]
export const demoChildren = {
  adam: {
    id: 'adam', ageKey: 'twoYearsOld', genderKey: 'male', tone: 'blue',
    weight: 12, height: 86, headCircumference: 48,
    lastVisit: '2026-10-10T10:00:00', doctorKey: 'doctorAhmad',
    record: { diagnosisKey: 'adamDiagnosis', notesKey: 'adamNotes' },
    prescription: { medicationKey: 'adamMedication', instructionsKey: 'adamInstructions' },
    followUps: [
      { date: '2026-10-25T10:00:00', doctorKey: 'doctorAhmad', status: 'upcoming' },
      { date: '2026-10-10T10:00:00', doctorKey: 'doctorAhmad', status: 'previous' },
    ],
  },
  lina: {
    id: 'lina', ageKey: 'oneYearOld', genderKey: 'female', tone: 'pink',
    weight: 9.2, height: 74, headCircumference: 45,
    lastVisit: '2026-10-12T11:30:00', doctorKey: 'doctorRania',
    record: { diagnosisKey: 'linaDiagnosis', notesKey: 'linaNotes' },
    prescription: { medicationKey: 'linaMedication', instructionsKey: 'linaInstructions' },
    followUps: [
      { date: '2026-11-10T11:30:00', doctorKey: 'doctorRania', status: 'upcoming' },
      { date: '2026-10-12T11:30:00', doctorKey: 'doctorRania', status: 'previous' },
    ],
  },
}
export const getDemoChild = id => Object.hasOwn(demoChildren, id) ? demoChildren[id] : undefined
