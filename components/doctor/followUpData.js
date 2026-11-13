import { parseRecordDate } from './medicalRecordData.js'

export function followUpToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function followUpDraft(patient) {
  const appointment = currentAppointment(patient)
  return {
    date: appointment?.date || patient.nextFollowUp || '', time: appointment?.time || patient.nextFollowUpTime || '',
    reason: appointment?.reason || patient.nextFollowUpReason || '', instructions: appointment?.instructions || patient.nextFollowUpInstructions || '',
  }
}

export function validateFollowUp(draft, today = followUpToday()) {
  const errors = {}
  if (!parseRecordDate(draft.date)) errors.date = 'dateRequired'
  else if (draft.date < today) errors.date = 'pastDate'
  if (draft.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) errors.time = 'invalidTime'
  return errors
}

// One current date on the child remains the source for the record and patient list.
export function followUpPatch({ date, time = '', reason = '', instructions = '' }) {
  return { nextFollowUp: date, nextFollowUpTime: time, nextFollowUpReason: reason, nextFollowUpInstructions: instructions }
}

export function appointmentsFor(patient) {
  if (Array.isArray(patient.followUpAppointments)) return patient.followUpAppointments
  const appointments = parseRecordDate(patient.nextFollowUp) ? [{
    id: `legacy:${patient.id}:${patient.nextFollowUp}`, patientId: patient.id,
    date: patient.nextFollowUp, time: patient.nextFollowUpTime || '',
    reason: patient.nextFollowUpReason || '', instructions: patient.nextFollowUpInstructions || '',
    status: 'scheduled', visitId: null,
  }] : []
  // Migrate existing in-memory visit follow-ups without rewriting their historical snapshots.
  for (const visit of patient.medicalVisits || []) {
    if (parseRecordDate(visit.nextFollowUp) && !appointments.some(item => item.date === visit.nextFollowUp)) {
      appointments.push({
        id: `visit:${patient.id}:${visit.id}`, patientId: patient.id, date: visit.nextFollowUp,
        time: '', reason: '', instructions: '', status: 'scheduled', visitId: visit.id,
      })
    }
  }
  return appointments
}

export function currentAppointment(patient, today = followUpToday()) {
  return appointmentsFor(patient).filter(item => item.status === 'scheduled' && item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))[0] || null
}

export function syncFollowUp(patient, today = followUpToday()) {
  const followUpAppointments = appointmentsFor(patient)
  const next = currentAppointment({ ...patient, followUpAppointments }, today)
  return { ...patient, followUpAppointments, ...followUpPatch(next || { date: null }) }
}

export function appointmentGroup(appointment, today = followUpToday()) {
  if (appointment.status === 'cancelled') return 'cancelled'
  if (appointment.status === 'missed') return 'missed'
  if (appointment.status === 'completed' || appointment.date < today) return 'past'
  return 'upcoming'
}

// Mock state only. Real authenticated-doctor authorization must be enforced by the backend.
export function saveFollowUp(patients, patientId, draft, today = followUpToday()) {
  if (!patients.some(patient => patient.id === patientId) || Object.keys(validateFollowUp(draft, today)).length) return patients
  const patient = patients.find(item => item.id === patientId)
  const appointments = appointmentsFor(patient)
  const existing = draft.id && appointments.find(item => item.id === draft.id)
  if (draft.id && patients.some(item => item.id !== patientId && appointmentsFor(item).some(entry => entry.id === draft.id))) return patients
  if (existing && (existing.status !== 'scheduled' || existing.date < today)) return patients
  const appointment = {
    id: existing?.id || draft.id || `${patientId}:${crypto.randomUUID()}`, patientId,
    date: draft.date, time: draft.time || '', reason: draft.reason || '', instructions: draft.instructions || '',
    status: 'scheduled', visitId: existing?.visitId || null,
  }
  const followUpAppointments = existing ? appointments.map(item => item.id === existing.id ? appointment : item) : [...appointments, appointment]
  return patients.map(item => item.id === patientId ? syncFollowUp({ ...item, followUpAppointments }, today) : item)
}

export function cancelFollowUp(patients, patientId, appointmentId, today = followUpToday()) {
  const patient = patients.find(item => item.id === patientId)
  const appointment = patient && appointmentsFor(patient).find(item => item.id === appointmentId)
  if (!appointment || appointment.status !== 'scheduled' || appointment.date < today) return patients
  return patients.map(item => item.id === patientId ? syncFollowUp({ ...item, followUpAppointments: appointmentsFor(item).map(entry => entry.id === appointmentId ? { ...entry, status: 'cancelled' } : entry) }, today) : item)
}

export function addVisitAppointment(patient, date, visitId, today = followUpToday(), rescheduleCurrent = false) {
  const appointments = appointmentsFor(patient)
  // One visit action can create at most one appointment; reuse an existing scheduled date.
  const matching = appointments.find(item => item.visitId === visitId || (item.status === 'scheduled' && item.date === date))
  if (matching) return syncFollowUp({ ...patient, followUpAppointments: appointments }, today)
  const current = rescheduleCurrent && date >= today && currentAppointment(patient, today)
  if (current) return syncFollowUp({ ...patient, followUpAppointments: appointments.map(item => item.id === current.id ? {
    ...item, date, time: '', reason: '', instructions: '', visitId,
  } : item) }, today)
  return syncFollowUp({ ...patient, followUpAppointments: [...appointments, {
    id: `visit:${patient.id}:${visitId}`, patientId: patient.id, date,
    time: '', reason: '', instructions: '', status: 'scheduled', visitId,
  }] }, today)
}

export function formatFollowUpTime(value, language) {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return ''
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-JO' : 'en-GB', { hour: 'numeric', minute: '2-digit' }).format(new Date(`2000-01-01T${value}:00`))
}
