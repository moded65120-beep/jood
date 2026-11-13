// Frontend-only fixtures. Replace with authenticated API data when backend integration begins.
// Groups/statuses are explicit demo values, not a live approval or scheduling workflow.
export const appointmentGroups = ['upcoming', 'pending', 'past']
export const motherAppointmentDemoData = [
  { motherId: 'demo-mother-sara', id: 'demo-appointment-1', childKey: 'adam', doctorKey: 'doctorAhmad', dateTime: '2026-11-05T10:00:00', reasonKey: 'routineCheckup', status: 'confirmed', group: 'upcoming' },
  { motherId: 'demo-mother-sara', id: 'demo-appointment-2', childKey: 'lina', doctorKey: 'doctorRania', dateTime: '2026-11-10T11:30:00', reasonKey: 'skinFollowUp', status: 'confirmed', group: 'upcoming' },
  { motherId: 'demo-mother-sara', id: 'demo-appointment-3', childKey: 'adam', doctorKey: 'doctorAhmad', dateTime: '2026-11-15T09:30:00', reasonKey: 'generalConsultation', status: 'pending', group: 'pending' },
  { motherId: 'demo-mother-sara', id: 'demo-appointment-4', childKey: 'lina', doctorKey: 'doctorRania', dateTime: '2026-10-12T11:30:00', reasonKey: 'skinConsultation', status: 'completed', group: 'past' },
  { motherId: 'demo-mother-sara', id: 'demo-appointment-5', childKey: 'adam', doctorKey: 'doctorAhmad', dateTime: '2026-10-10T10:00:00', reasonKey: 'routineCheckup', status: 'completed', group: 'past' },
]
export function getMotherAppointments(group) {
  return motherAppointmentDemoData.filter(appointment => appointment.group === group)
}
