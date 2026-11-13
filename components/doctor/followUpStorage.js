import { registeredPatients } from './patientData.js'
import { appointmentsFor, syncFollowUp, validateFollowUp } from './followUpData.js'
import { parseRecordDate } from './medicalRecordData.js'

export const FOLLOW_UP_STORAGE_KEY = 'nomu.doctor.demoFollowUpAppointments.v1'
const knownIds = new Set(registeredPatients.map(patient => patient.id))
const statuses = ['scheduled', 'cancelled', 'completed', 'missed']
const text = (value, max) => typeof value === 'string' && value.length <= max

function validAppointment(item) {
  return item && text(item.id, 250) && item.id.length > 0 && knownIds.has(item.patientId)
    && parseRecordDate(item.date) && statuses.includes(item.status)
    && text(item.time, 5) && !validateFollowUp({ date: item.date, time: item.time }, '0000-01-01').time
    && text(item.reason, 4000) && text(item.instructions, 4000)
    && (item.visitId === null || text(item.visitId, 250))
}

// This namespaced key is for fictional demo records only. No names, visits or prescriptions are stored.
export function loadFollowUpPatients(patients, storage) {
  const fallback = () => patients.map(patient => syncFollowUp(patient))
  try {
    const target = storage || window.localStorage
    const raw = target.getItem(FOLLOW_UP_STORAGE_KEY)
    if (raw === null) return { patients: fallback(), warning: null }
    const saved = JSON.parse(raw)
    if (saved?.version !== 1 || !Array.isArray(saved.appointments) || !Array.isArray(saved.childIds)) throw new Error('Invalid demo data')
    const valid = []
    const seen = new Set()
    let invalid = false
    for (const item of saved.appointments) {
      if (!validAppointment(item) || seen.has(item.id)) { invalid = true; continue }
      seen.add(item.id)
      valid.push({ id: item.id, patientId: item.patientId, date: item.date, time: item.time, reason: item.reason, instructions: item.instructions, status: item.status, visitId: item.visitId })
    }
    const childIds = new Set(saved.childIds.filter(id => knownIds.has(id)))
    valid.forEach(item => childIds.add(item.patientId))
    const restored = [...patients, ...registeredPatients.filter(patient => childIds.has(patient.id) && !patients.some(item => item.id === patient.id))]
    return {
      patients: restored.map(patient => childIds.has(patient.id) ? syncFollowUp({ ...patient, followUpAppointments: valid.filter(item => item.patientId === patient.id) }) : syncFollowUp(patient)),
      warning: invalid ? 'invalidStorage' : null,
    }
  } catch (error) {
    return { patients: fallback(), warning: error instanceof SyntaxError || error.message === 'Invalid demo data' ? 'invalidStorage' : 'storageUnavailable' }
  }
}

export function persistFollowUps(patients, storage) {
  try {
    const appointments = patients.flatMap(appointmentsFor)
    if (!appointments.every(validAppointment)) return false
    const payload = { version: 1, childIds: patients.map(patient => patient.id).filter(id => knownIds.has(id)), appointments }
    ;(storage || window.localStorage).setItem(FOLLOW_UP_STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch { return false }
}
