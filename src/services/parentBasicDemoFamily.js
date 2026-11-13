// Temporary development-only personal information. Never imported into medical storage
// or doctor eligibility lists. Replace with an authorized parent API response later.
export const basicDemoChildren = Object.freeze([
  Object.freeze({ id: 'demo-basic-jood-omar', name: 'Omar Alajouri', nameAr: 'عمر العجوري', dateOfBirth: '2023-06-15', placeOfBirth: 'Amman, Jordan', placeOfBirthAr: 'عمّان، الأردن', gender: 'Male', basicOnly: true }),
  Object.freeze({ id: 'demo-basic-jood-layan', name: 'Layan Alajouri', nameAr: 'ليان العجوري', dateOfBirth: '2024-09-20', placeOfBirth: 'Irbid, Jordan', placeOfBirthAr: 'إربد، الأردن', gender: 'Female', basicOnly: true }),
])
export const basicDemoFamily = Object.freeze({
  id: 'demo-family-jood-alajouri',
  parents: Object.freeze([Object.freeze({ nationalId: '3000000002', role: 'mother' })]),
  childIds: Object.freeze(basicDemoChildren.map(child => child.id)),
})
