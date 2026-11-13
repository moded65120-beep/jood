import { canonicalChildId, canonicalDemoChildren } from './demoChildAccess.js'
import { parseRecordDate } from '../components/doctor/medicalRecordData.js'
import { createChildHealthLog } from './childHealthLog.js'
import { vaccinationStages } from './vaccinationScheduleData.js'

const signature = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item)
const visit = record => Boolean(record.visitId || record.kind === 'vaccination-visit')
const stage = record => record.visitId || record.stageId
const plain = value => value && typeof value === 'object' && !Array.isArray(value)
const recordShape = record => plain(record) && Boolean(canonicalChildId(record.childId)) && (typeof record.doseId === 'string' || typeof stage(record) === 'string')
export const vaccinationFingerprint = records => signature(records.map(signature).sort())

export function vaccinationDoseState(group, dose, records, childId) {
  const related = records.filter(record => canonicalChildId(record?.childId) === canonicalChildId(childId) && (record.doseId === dose.id || (visit(record) && stage(record) === group.id)))
  const modern = related.filter(record => record.kind === 'vaccination-dose')
  const legacy = related.filter(record => !visit(record) && record.kind !== 'vaccination-dose')
  const visits = related.filter(visit)
  let conflict = modern.length > 1 || legacy.length > 1 || visits.length > 1
  let original = legacy[0]
  const completedVisit = visits.find(record => record.status === 'completed' || record.administeredAt || record.vaccinationDate)
  if (!original && completedVisit) {
    const administrations = completedVisit.administrations
    const valid = Array.isArray(administrations) && administrations.length === group.doses.length && group.doses.every(item => administrations.filter(record => record?.doseId === item.id && (!record.childId || canonicalChildId(record.childId) === canonicalChildId(childId)) && record.status === 'completed' && parseRecordDate(record.administeredAt || record.vaccinationDate)).length === 1)
    if (valid) original = { ...completedVisit, ...administrations.find(record => record.doseId === dose.id), doseId: dose.id, visitId: undefined, kind: 'legacy-dose' }
    else conflict = true
  }
  if (modern.length === 1 && modern[0].stageId !== group.id) conflict = true
  return { record: modern[0] || original || null, conflict, related }
}

// Merge repeated parent snapshots by occurrence count, retaining genuine duplicate
// historical rows. Parent records are never silently migrated or deleted.
function sources(batches, childId) {
  const result = new Map()
  for (const batch of batches) {
    const counts = new Map()
    for (const original of batch) {
      if (!recordShape(original) || canonicalChildId(original.childId) !== childId) continue
      const record = { ...original, childId }, key = signature(record)
      const count = (counts.get(key) || 0) + 1
      counts.set(key, count)
      const id = 'source:' + key + ':' + count
      result.set(id, { id, record })
    }
  }
  return [...result.values()]
}
export function createVaccinationRepository(options) {
  const log = createChildHealthLog('vaccinations', value => plain(value) && (value.record === null || recordShape(value.record)) && Array.isArray(value.sources) && value.sources.every(recordShape) && Array.isArray(value.supersedes) && value.supersedes.every(id => typeof id === 'string') && (value.record !== null || value.supersedes.length === 0), options)
  function load(id, parentRecords = []) {
    const childId = canonicalChildId(id)
    if (!childId) throw Error('missingChildId')
    const events = log.read(childId)
    if (events.some(event => (event.value.record && event.value.record.childId !== childId) || event.value.sources.some(record => canonicalChildId(record.childId) !== childId))) throw Error('invalidStorage')
    const superseded = new Set(events.flatMap(event => event.value.supersedes))
    return [...sources([parentRecords, ...events.map(event => event.value.sources)], childId), ...events.filter(event => event.value.record).map(event => ({ id: event.id, record: event.value.record }))].filter(item => !superseded.has(item.id))
  }
  function read(id, parentRecords = []) { return structuredClone(load(id, parentRecords).map(item => item.record)) }
  function importRecords(id, records) {
    const childId = canonicalChildId(id)
    if (!childId) throw Error('missingChildId')
    if (!Array.isArray(records)) throw Error('invalidRecord')
    const selected = records.filter(record => canonicalChildId(record?.childId) === childId)
    if (!selected.every(recordShape)) throw Error('invalidRecord')
    load(childId) // Validate the existing log before adding any source data.
    const batches = log.read(childId).map(event => event.value.sources)
    if (sources([...batches, selected], childId).length === sources(batches, childId).length) return
    log.append(childId, { record: null, sources: selected.map(record => ({ ...record, childId })), supersedes: [] })
  }
  function saveVisit(id, draft, { sourceRecords = [], expectedRecords } = {}) {
    const childId = canonicalChildId(id)
    if (!childId || canonicalChildId(draft?.childId) !== childId) throw Error('missingChildId')
    const record = structuredClone({ ...draft, childId })
    const doseIds = record.doseIds
    if (!visit(record) || typeof stage(record) !== 'string' || !stage(record) || !Array.isArray(doseIds) || !doseIds.length || doseIds.some(id => typeof id !== 'string' || !id) || new Set(doseIds).size !== doseIds.length || typeof record.notes !== 'string') throw Error('invalidRecord')
    const relevant = r => visit(r) ? stage(r) === stage(record) : doseIds.includes(r.doseId)
    const current = load(childId, sourceRecords), related = current.filter(item => relevant(item.record))
    if (!Array.isArray(expectedRecords) || vaccinationFingerprint(related.map(item => item.record)) !== vaccinationFingerprint(expectedRecords.map(r => ({ ...r, childId })))) throw Error('recordConflict')
    const previous = related.filter(item => visit(item.record))
    const legacy = related.filter(item => !visit(item.record) && item.record.kind !== 'vaccination-dose').map(item => item.record)
    const administered = r => r.administeredAt || r.vaccinationDate
    // Completed and conflicting historical records remain immutable.
    const completedLegacy = legacy.filter(r => administered(r) || r.status === 'completed')
    if (previous.length > 1 || previous.some(item => administered(item.record) || item.record.status === 'completed') || completedLegacy.length) throw Error('historicalConflict')
    if (previous.some(({ record }) => !Array.isArray(record.doseIds) || record.doseIds.length !== doseIds.length || doseIds.some(id => !record.doseIds.includes(id)))) throw Error('historicalConflict')
    if (legacy.some(r => (r.appointmentDate || r.appointmentTime) && (!parseRecordDate(r.appointmentDate) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(r.appointmentTime)))) throw Error('historicalConflict')
    if (legacy.some(r => r.appointmentDate || r.appointmentTime) && new Set(legacy.map(r => [r.appointmentDate || '', r.appointmentTime || ''].join('T'))).size > 1) throw Error('historicalConflict')
    const birth = canonicalDemoChildren.find(child => child.id === childId)?.dateOfBirth
    const now = new Date(), today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const date = administered(record)
    if (record.status === 'completed') {
      if (!parseRecordDate(date) || date > today || (birth && date < birth) || !Array.isArray(record.administrations) || record.administrations.length !== doseIds.length || doseIds.some(id => record.administrations.filter(r => r.doseId === id && r.childId === childId && administered(r) === date && r.status === 'completed').length !== 1)) throw Error('invalidRecord')
    } else if (record.status !== 'pending' || date) throw Error('invalidRecord')
    const old = previous[0]?.record
    const history = new Map((old?.appointmentHistory || []).map(item => [item.id, item]))
    for (const item of record.appointmentHistory || []) {
      if (!plain(item) || typeof item.id !== 'string' || !parseRecordDate(item.date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.time) || !['scheduled', 'rescheduled', 'fulfilled'].includes(item.status)) throw Error('invalidRecord')
      history.set(item.id, item)
    }
    const hasAppointment = record.appointmentDate || record.appointmentTime
    if (hasAppointment) {
      if (!parseRecordDate(record.appointmentDate) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(record.appointmentTime)) throw Error('invalidFollowUp')
      const changed = !old || old.appointmentDate !== record.appointmentDate || old.appointmentTime !== record.appointmentTime
      if (changed && record.status !== 'completed' && new Date(record.appointmentDate + 'T' + record.appointmentTime) < now) throw Error('invalidFollowUp')
      if (changed && old?.appointmentDate) {
        const id = stage(record) + ':' + old.appointmentDate + 'T' + old.appointmentTime
        history.set(id, { id, date: old.appointmentDate, time: old.appointmentTime, status: 'rescheduled' })
      }
      const id = stage(record) + ':' + record.appointmentDate + 'T' + record.appointmentTime
      history.set(id, { id, date: record.appointmentDate, time: record.appointmentTime, status: record.status === 'completed' ? 'fulfilled' : 'scheduled' })
    } else if (old?.appointmentDate) throw Error('invalidFollowUp')
    record.appointmentHistory = [...history.values()]
    if (old && signature(old) === signature(record)) return structuredClone(old)
    // Independent keys preserve both siblings if two tabs write the same baseline
    // simultaneously. The component then shows its existing conflict review UI.
    log.append(childId, { record, sources: sourceRecords.filter(r => canonicalChildId(r?.childId) === childId).map(r => ({ ...r, childId })), supersedes: previous.map(item => item.id) })
    return structuredClone(record)
  }
  function saveDose(id, draft, { sourceRecords = [], expectedRecords } = {}) {
    const childId = canonicalChildId(id)
    if (!childId || canonicalChildId(draft?.childId) !== childId) throw Error('missingChildId')
    const group = vaccinationStages.find(group => group.id === draft.stageId)
    const dose = group?.doses.find(dose => dose.id === draft.doseId)
    if (!dose || draft.kind !== 'vaccination-dose' || draft.status !== 'completed' || typeof draft.notes !== 'string') throw Error('invalidRecord')
    const now = new Date(), today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const date = draft.administeredAt
    const birth = canonicalDemoChildren.find(child => child.id === childId)?.dateOfBirth
    if (!parseRecordDate(date) || date > today || (birth && date < birth)) throw Error('required')
    if (!['internal', 'external'].includes(draft.administrationLocation)) throw Error('locationRequired')
    if (draft.administrationLocation === 'external' && (typeof draft.facilityName !== 'string' || !draft.facilityName.trim())) throw Error('facilityRequired')
    if (draft.administrationLocation === 'external' && !['vaccinationCard', 'parentReport', 'medicalDocument'].includes(draft.informationSource)) throw Error('sourceRequired')
    if (draft.informationSource && !['vaccinationCard', 'parentReport', 'medicalDocument'].includes(draft.informationSource)) throw Error('sourceRequired')
    const all = load(childId, sourceRecords)
    const related = all.filter(item => item.record.doseId === dose.id || (visit(item.record) && stage(item.record) === group.id))
    if (!Array.isArray(expectedRecords) || vaccinationFingerprint(related.map(item => item.record)) !== vaccinationFingerprint(expectedRecords.map(record => ({ ...record, childId })))) throw Error('recordConflict')
    const modern = related.filter(item => item.record.kind === 'vaccination-dose')
    const legacy = related.filter(item => item.record.kind !== 'vaccination-dose')
    const oldVisits = legacy.filter(item => visit(item.record))
    const oldDoses = legacy.filter(item => !visit(item.record))
    if (modern.length > 1 || oldVisits.length > 1 || oldVisits.some(item => item.record.status === 'completed' || item.record.administeredAt || item.record.vaccinationDate) || oldDoses.some(item => item.record.status === 'completed' || item.record.administeredAt || item.record.vaccinationDate)) throw Error('historicalConflict')
    if (modern.some(item => item.record.stageId !== group.id)) throw Error('historicalConflict')
    const old = modern[0]?.record
    const record = {
      ...old, childId, kind: 'vaccination-dose', stageId: group.id, doseId: dose.id,
      vaccineId: dose.vaccineId, doseNumber: dose.number, serviceKind: dose.kind, amount: dose.amount,
      status: 'completed', administeredAt: date, vaccinationDate: date,
      administrationLocation: draft.administrationLocation,
      facilityName: draft.administrationLocation === 'external' ? draft.facilityName.trim() : '',
      informationSource: draft.informationSource || '', sourceVerified: false, notes: draft.notes,
      ...(draft.doctorId ? { doctorId: draft.doctorId } : {}),
      ...(draft.doctorName ? { doctorName: draft.doctorName } : {}),
      revisionHistory: old ? [...(old.revisionHistory || []), { ...old, revisionHistory: undefined, replacedAt: now.toISOString() }] : [],
    }
    if (old && signature({ ...old, revisionHistory: undefined }) === signature({ ...record, revisionHistory: undefined })) return structuredClone(old)
    log.append(childId, { record, sources: sourceRecords.filter(record => canonicalChildId(record?.childId) === childId).map(record => ({ ...record, childId })), supersedes: modern.map(item => item.id) })
    return structuredClone(record)
  }
  function correctDose(id, draft, { sourceRecords = [], expectedRecords, actor, confirmReversal = false } = {}) {
    const childId = canonicalChildId(id)
    if (!actor || actor.role !== 'doctor' || actor.clinicalEditing !== true || typeof actor.id !== 'string' || !actor.id.trim() || typeof actor.name !== 'string' || !actor.name.trim()) throw Error('correctionForbidden')
    if (!childId || canonicalChildId(draft?.childId) !== childId) throw Error('missingChildId')
    const group = vaccinationStages.find(group => group.id === draft.stageId)
    const dose = group?.doses.find(dose => dose.id === draft.doseId)
    if (!dose || !['completed', 'pending'].includes(draft.status) || typeof draft.notes !== 'string') throw Error('invalidRecord')
    const current = load(childId, sourceRecords)
    const info = vaccinationDoseState(group, dose, current.map(item => item.record), childId)
    if (info.conflict || !info.record) throw Error('historicalConflict')
    if (!Array.isArray(expectedRecords) || vaccinationFingerprint(info.related) !== vaccinationFingerprint(expectedRecords.map(record => ({ ...record, childId })))) throw Error('recordConflict')
    const old = info.record
    const now = new Date(), today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const birth = canonicalDemoChildren.find(child => child.id === childId)?.dateOfBirth
    const date = draft.administeredAt || ''
    if (draft.status === 'completed') {
      if (!parseRecordDate(date) || date > today || (birth && date < birth)) throw Error('required')
      if (!['internal', 'external'].includes(draft.administrationLocation)) throw Error('locationRequired')
      if (draft.administrationLocation === 'external' && (typeof draft.facilityName !== 'string' || !draft.facilityName.trim())) throw Error('facilityRequired')
      if (draft.administrationLocation === 'external' && !['vaccinationCard', 'parentReport', 'medicalDocument'].includes(draft.informationSource)) throw Error('sourceRequired')
    }
    if (draft.administrationLocation && !['internal', 'external'].includes(draft.administrationLocation)) throw Error('locationRequired')
    if (draft.informationSource && !['vaccinationCard', 'parentReport', 'medicalDocument'].includes(draft.informationSource)) throw Error('sourceRequired')
    if ((old.status === 'completed' || old.administeredAt || old.vaccinationDate) && draft.status === 'pending' && !confirmReversal) throw Error('reversalConfirmationRequired')
    const previousValue = structuredClone(old)
    delete previousValue.correctionHistory
    delete previousValue.revisionHistory
    const updatedValue = {
      childId, kind: 'vaccination-dose', stageId: group.id, doseId: dose.id, vaccineId: dose.vaccineId,
      doseNumber: dose.number, serviceKind: dose.kind, amount: dose.amount, status: draft.status,
      administeredAt: draft.status === 'completed' ? date : '', vaccinationDate: draft.status === 'completed' ? date : '',
      administrationLocation: draft.administrationLocation || '',
      facilityName: draft.administrationLocation === 'external' ? (draft.facilityName || '').trim() : '',
      informationSource: draft.informationSource || '', sourceVerified: false, notes: draft.notes,
    }
    const same = Object.entries(updatedValue).every(([key, value]) => old[key] === value)
    if (same) return structuredClone(old)
    const correction = { previousValue, updatedValue: structuredClone(updatedValue), correctedAt: now.toISOString(), doctor: { id: actor.id, name: actor.name, role: 'doctor' }, completionReversed: draft.status === 'pending' && Boolean(old.status === 'completed' || old.administeredAt || old.vaccinationDate) }
    const record = { ...updatedValue, correctionHistory: [...(old.correctionHistory || []), correction], revisionHistory: old.revisionHistory || [], updatedAt: now.toISOString(), doctorId: actor.id, doctorName: actor.name }
    const supersedes = current.filter(item => item.record.kind === 'vaccination-dose' && item.record.doseId === dose.id).map(item => item.id)
    log.append(childId, { record, sources: sourceRecords.filter(record => canonicalChildId(record?.childId) === childId).map(record => ({ ...record, childId })), supersedes })
    return structuredClone(record)
  }
  function manageVisit(id, draft, { sourceRecords = [], expectedRecords, actor, confirmReversal = false, cancelAppointment = false } = {}) {
    if (!actor || actor.role !== 'doctor' || actor.clinicalEditing !== true || typeof actor.id !== 'string' || !actor.id.trim() || typeof actor.name !== 'string' || !actor.name.trim()) throw Error('correctionForbidden')
    const childId = canonicalChildId(id)
    const group = vaccinationStages.find(group => group.id === draft?.stageId)
    if (!childId || canonicalChildId(draft?.childId) !== childId) throw Error('missingChildId')
    if (!group || !['completed', 'pending'].includes(draft.status) || typeof draft.notes !== 'string') throw Error('invalidRecord')
    const current = load(childId, sourceRecords)
    const related = current.filter(({ record }) => visit(record) ? stage(record) === group.id : group.doses.some(dose => dose.id === record.doseId))
    const old = related.find(item => visit(item.record))?.record
    if (!Array.isArray(expectedRecords) || vaccinationFingerprint(related.map(item => item.record)) !== vaccinationFingerprint(expectedRecords.map(record => ({ ...record, childId })))) throw Error('recordConflict')
    if (related.filter(item => visit(item.record)).length > 1 || group.doses.some(dose => ['vaccination-dose', 'legacy'].some(kind => related.filter(item => !visit(item.record) && item.record.doseId === dose.id && (item.record.kind === 'vaccination-dose' ? 'vaccination-dose' : 'legacy') === kind).length > 1))) throw Error('historicalConflict')
    if (cancelAppointment) {
      if (!old || related.length !== 1) throw Error('historicalConflict')
      if (old.status === 'completed' || old.administeredAt || old.vaccinationDate || !parseRecordDate(old.appointmentDate) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(old.appointmentTime || '')) throw Error('invalidFollowUp')
      const correctedAt = new Date().toISOString()
      const { correctionHistory: _history, ...previousValue } = structuredClone(old)
      const updatedValue = { ...previousValue, appointmentDate: '', appointmentTime: '' }
      const correction = { previousValue, updatedValue, correctedAt, doctor: { id: actor.id, name: actor.name, role: 'doctor' }, appointmentCancelled: true, completionReversed: false }
      const record = { ...old, appointmentDate: '', appointmentTime: '', updatedAt: correctedAt, correctionHistory: [...(old.correctionHistory || []), correction] }
      log.append(childId, { record, sources: sourceRecords.filter(record => canonicalChildId(record?.childId) === childId).map(record => ({ ...record, childId })), supersedes: related.map(item => item.id) })
      return structuredClone(record)
    }
    const now = new Date(), today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const birth = canonicalDemoChildren.find(child => child.id === childId)?.dateOfBirth
    const date = draft.status === 'completed' ? draft.administeredAt : ''
    const administeredTime = draft.status === 'completed' ? draft.administeredTime ?? '' : ''
    if (draft.status === 'completed') {
      if (!parseRecordDate(date) || date > today || (birth && date < birth)) throw Error('required')
      if (administeredTime !== '' && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(administeredTime)) throw Error('invalidAdministrationTime')
      if (typeof draft.facilityName !== 'string' || !draft.facilityName.trim()) throw Error('locationRequired')
    }
    const completedBefore = related.some(({ record }) => record.status === 'completed' || record.administeredAt || record.vaccinationDate)
    if (completedBefore && draft.status === 'pending' && !confirmReversal) throw Error('reversalConfirmationRequired')
    const appointmentDate = draft.appointmentDate || '', appointmentTime = draft.appointmentTime || ''
    const hasAppointment = Boolean(appointmentDate || appointmentTime)
    if (draft.status === 'pending' && (hasAppointment ? !parseRecordDate(appointmentDate) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(appointmentTime) : !completedBefore || !confirmReversal)) throw Error('invalidFollowUp')
    if (draft.status === 'pending' && hasAppointment) {
      const appointment = new Date(appointmentDate + 'T' + appointmentTime)
      if (appointment.getHours() !== Number(appointmentTime.slice(0, 2)) || appointment.getMinutes() !== Number(appointmentTime.slice(3)) || ((old?.appointmentDate !== appointmentDate || old?.appointmentTime !== appointmentTime) && appointment < now)) throw Error('invalidFollowUp')
    }
    const history = new Map(related.flatMap(item => Array.isArray(item.record.appointmentHistory) ? item.record.appointmentHistory : []).map(item => [item.id, item]))
    for (const { record } of related) if (record.appointmentDate && record.appointmentTime) {
      const key = group.id + ':' + record.appointmentDate + 'T' + record.appointmentTime
      history.set(key, { id: key, date: record.appointmentDate, time: record.appointmentTime, status: draft.status === 'completed' ? 'fulfilled' : record.appointmentDate === appointmentDate && record.appointmentTime === appointmentTime ? 'scheduled' : 'rescheduled' })
    }
    if (draft.status === 'pending' && hasAppointment) {
      const key = group.id + ':' + appointmentDate + 'T' + appointmentTime
      history.set(key, { id: key, date: appointmentDate, time: appointmentTime, status: 'scheduled' })
    }
    const updatedValue = {
      childId, kind: 'vaccination-visit', visitId: group.id, stageId: group.id, doseIds: group.doses.map(dose => dose.id), status: draft.status,
      scheduledAgeMonths: group.months, services: group.doses.map(dose => ({ doseId: dose.id, vaccineId: dose.vaccineId, doseNumber: dose.number, kind: dose.kind, amount: dose.amount })),
      administeredAt: date, vaccinationDate: date, administeredTime, appointmentDate: draft.status === 'pending' ? appointmentDate : '', appointmentTime: draft.status === 'pending' ? appointmentTime : '',
      administrationLocation: draft.status === 'completed' ? old?.administrationLocation ?? draft.administrationLocation ?? '' : '', facilityName: draft.status === 'completed' ? draft.facilityName.trim() : '',
      informationSource: old?.informationSource ?? draft.informationSource ?? '', sourceVerified: old?.sourceVerified ?? false, notes: draft.notes,
      administrations: draft.status === 'completed' ? group.doses.map(dose => ({ ...dose, childId, doseId: dose.id, vaccineId: dose.vaccineId, doseNumber: dose.number, status: 'completed', administeredAt: date, vaccinationDate: date, administeredTime })) : undefined,
    }
    if (related.length === 1 && old && Object.entries(updatedValue).every(([key, value]) => signature(old[key]) === signature(value))) return structuredClone(old)
    const previousRecords = related.map(({ record }) => {
      const { correctionHistory: _corrections, legacyRecords: _legacy, ...value } = record
      return value
    })
    const correction = { previousValue: previousRecords[0] || {}, previousRecords, updatedValue: structuredClone(updatedValue), correctedAt: now.toISOString(), doctor: { id: actor.id, name: actor.name, role: 'doctor' }, completionReversed: completedBefore && draft.status === 'pending' }
    const record = { ...updatedValue, appointmentHistory: [...history.values()], legacyRecords: [...(old?.legacyRecords || []), ...related.filter(item => !visit(item.record)).map(item => item.record)], correctionHistory: [...(old?.correctionHistory || []), correction], doctorId: actor.id, doctorName: actor.name, updatedAt: now.toISOString() }
    log.append(childId, { record, sources: sourceRecords.filter(record => canonicalChildId(record?.childId) === childId).map(record => ({ ...record, childId })), supersedes: related.map(item => item.id) })
    return structuredClone(record)
  }
  return { read, importRecords, saveVisit, saveDose, correctDose, manageVisit, subscribe: log.subscribe }
}
export const vaccinationRepository = createVaccinationRepository()
