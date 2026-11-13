import { vaccinationStages } from '../../services/vaccinationScheduleData.js'
import './VaccinationSchedule.css'
import { canonicalChildId } from '../../services/demoChildAccess.js'
import { useVaccinationStorage } from './useChildHealthStorage.js'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Baby, Footprints, Hand, Blocks, ToyBrick, Cake, PersonStanding, Syringe, Check, Clock, CalendarDays, Eye, X, ChevronDown, Info } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import Button from '../common/Button.jsx'
import Card from '../common/Card.jsx'
import { vaccinationDoseState } from '../../services/vaccinationRepository.js'
import useUnifiedDemoUser from '../../hooks/useUnifiedDemoUser.js'
import { currentDoctorProfile } from '../../services/currentDoctorProfile.js'

// Stable historical IDs are retained for equivalent doses. Retired HepA/DTaP records are never deleted.
const schedule = vaccinationStages.map((group, index) => ({ ...group, Icon: [Baby, Footprints, Hand, Blocks, ToyBrick, Cake, PersonStanding][index] }))
function localDate(date = new Date()) {
 return [String(date.getFullYear()).padStart(4, '0'), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}
function validDate(value) {
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
 const date = new Date(value + 'T12:00:00')
 return !Number.isNaN(+date) && localDate(date) === value
}
// Calendar-month anniversaries clamp to the last day of the target month.
function dueDate(group, child = {}, today = localDate()) {
 if (!validDate(today) || !validDate(child.dateOfBirth) || child.dateOfBirth > today) return null
 const birth = new Date(child.dateOfBirth + 'T12:00:00')
 const target = new Date(birth)
 target.setDate(1)
 target.setMonth(birth.getMonth() + group.months)
 const monthEnd = new Date(target)
 monthEnd.setMonth(monthEnd.getMonth() + 1, 0)
 target.setDate(Math.min(birth.getDate(), monthEnd.getDate()))
 return localDate(target)
}

function validTime(value) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
}
function validAppointment({ date, time, stageId }, now = new Date()) {
  if (!validDate(date) || !validTime(time) || !schedule.some(g => g.id === stageId)) return false
  const appointment = new Date(date + 'T' + time + ':00')
  // Reject nonexistent local times (for example, a daylight-saving clock jump).
  return localDate(appointment) === date && appointment.getHours() === Number(time.slice(0, 2)) && appointment.getMinutes() === Number(time.slice(3)) && appointment >= now
}
function formatTime(time, language) {
  return new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date('2000-01-01T' + time + ':00'))
}


function useLocalDay() {
  const [today, setToday] = useState(localDate)
  useEffect(() => {
    let timer
    function refresh() {
      clearTimeout(timer)
      setToday(localDate())
      const now = new Date()
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      timer = setTimeout(refresh, Math.max(100, midnight - now + 50))
    }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearTimeout(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  return today
}


function normalizeTimeDigits(value) {
  return value.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, digit => String(digit.charCodeAt(0) - (digit.charCodeAt(0) >= 0x06f0 ? 0x06f0 : 0x0660)))
}
function parseWheelNumber(raw, min, max) {
  const text = normalizeTimeDigits(raw)
  return /^\d{1,2}$/.test(text) && Number(text) >= min && Number(text) <= max ? Number(text) : null
}
function to24Hour(hour, minute, period) {
  const h = parseWheelNumber(hour, 1, 12), m = parseWheelNumber(minute, 0, 59)
  if (h === null || m === null || !['am', 'pm'].includes(period)) return ''
  return String(h % 12 + (period === 'pm' ? 12 : 0)).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}
function TimeWheel({ part, label, options, value, onChange, invalidMessage }) {
  const wheel = useRef(null), editor = useRef(null), timer = useRef(null)
  const [entry, setEntry] = useState(null)
  const id = useId()
  const index = Math.max(0, options.findIndex(option => option.value === value))
  const numeric = part !== 'period'
  const min = part === 'hour' ? 1 : 0, max = part === 'hour' ? 12 : 59
  const invalid = entry !== null && parseWheelNumber(entry, min, max) === null
  useEffect(() => {
    clearTimeout(timer.current)
    wheel.current.scrollTop = index * 40
    return () => clearTimeout(timer.current)
  }, [index])
  const editing = entry !== null
  useEffect(() => { if (editing) { editor.current.focus({ preventScroll: true }); editor.current.select() } }, [editing])
  function select(next) {
    clearTimeout(timer.current)
    const option = options[Math.max(0, Math.min(options.length - 1, next))]
    onChange(option.value)
    wheel.current.scrollTop = Math.max(0, options.indexOf(option)) * 40
  }
  function edit() { clearTimeout(timer.current); wheel.current.scrollTop = index * 40; setEntry(value) }
  function commit() {
    const number = parseWheelNumber(entry || '', min, max)
    if (number === null) return false
    onChange(part === 'minute' ? String(number).padStart(2, '0') : String(number))
    setEntry(null)
    return true
  }
  return <div className="vaccination__wheelColumn"><span id={id + '-label'}>{label}</span><div className="vaccination__wheelFrame">
    <div className="vaccination__wheel" ref={wheel} role="listbox" tabIndex={editing ? -1 : 0} aria-labelledby={id + '-label'} aria-activedescendant={id + '-' + index} data-part={part} data-editing={editing}
      onKeyDown={event => {
        if (editing) return
        if ((event.key === 'Enter' || event.key === ' ') && numeric) { event.preventDefault(); edit(); return }
        const next = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: options.length - 1, PageUp: index - 5, PageDown: index + 5 }[event.key]
        if (next !== undefined) { event.preventDefault(); select(next) }
      }}
      onScroll={() => { if (editing) return; clearTimeout(timer.current); timer.current = setTimeout(() => select(Math.round(wheel.current.scrollTop / 40)), 120) }}>
      {options.map((option, i) => <div key={option.value} id={id + '-' + i} role="option" aria-selected={i === index} data-value={option.value} onClick={() => {
        if (editing) return
        if (i === index && numeric) edit()
        else { select(i === index && !numeric ? 1 - index : i); wheel.current.focus({ preventScroll: true }) }
      }}>{option.label}</div>)}
    </div>
    {editing && <input ref={editor} className="vaccination__wheelEditor" type="text" inputMode="numeric" dir="ltr" value={entry} maxLength={2} autoComplete="off" spellCheck={false} aria-label={label} aria-invalid={invalid} aria-describedby={invalid ? id + '-error' : undefined} data-part={part} onChange={event => { event.target.setCustomValidity(''); setEntry(normalizeTimeDigits(event.target.value)) }} onBlur={() => { commit() }} onKeyDown={event => {
      event.stopPropagation()
      if (event.key === 'Enter') { event.preventDefault(); if (commit()) wheel.current.focus({ preventScroll: true }) }
      if (event.key === 'Escape') { event.preventDefault(); setEntry(null); wheel.current.focus({ preventScroll: true }) }
    }} />}
    </div>{invalid && <small className="vaccination__error" id={id + '-error'}>{invalidMessage}</small>}
  </div>
}
function TimeField({ time, onChange, v, disabled, label, error }) {
  const { language } = useLanguage()
  const [draft, setDraft] = useState(null)
  const trigger = useRef(null), popup = useRef(null)
  const id = useId(), isOpen = draft !== null
  const number = n => new Intl.NumberFormat(language, { minimumIntegerDigits: 2, useGrouping: false }).format(n)
  useEffect(() => {
    if (!isOpen) return
    const element = popup.current, button = trigger.current
    element.showModal()
    function position() {
      const rect = button.getBoundingClientRect(), viewport = window.visualViewport
      const width = Math.min(document.documentElement.clientWidth, viewport?.width || innerWidth), height = viewport?.height || innerHeight
      const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0, bounds = element.getBoundingClientRect()
      element.style.left = left + Math.max(8, Math.min(rect.left - left, width - bounds.width - 8)) + 'px'
      element.style.top = top + Math.max(8, Math.min(rect.bottom - top + 8, height - bounds.height - 8)) + 'px'
    }
    element.querySelector('[role="listbox"]').focus({ preventScroll: true }); position()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(position)
    observer?.observe(element)
    window.addEventListener('resize', position); window.visualViewport?.addEventListener('resize', position); window.visualViewport?.addEventListener('scroll', position)
    return () => { observer?.disconnect(); window.removeEventListener('resize', position); window.visualViewport?.removeEventListener('resize', position); window.visualViewport?.removeEventListener('scroll', position); element.close(); button.focus({ preventScroll: true }) }
  }, [isOpen])
  function open() {
    const known = validTime(time)
    setDraft({ hour: known ? String(Number(time.slice(0, 2)) % 12 || 12) : '12', minute: known ? time.slice(3) : '00', period: known && Number(time.slice(0, 2)) >= 12 ? 'pm' : 'am' })
  }
  function confirm() {
    const values = {}
    for (const wheel of popup.current.querySelectorAll('[role="listbox"]')) {
      const entry = popup.current.querySelector('.vaccination__wheelEditor[data-part="' + wheel.dataset.part + '"]')
      if (entry) {
        const min = wheel.dataset.part === 'hour' ? 1 : 0, max = wheel.dataset.part === 'hour' ? 12 : 59
        const parsed = parseWheelNumber(entry.value, min, max)
        if (parsed === null) { entry.setCustomValidity(v(wheel.dataset.part === 'hour' ? 'invalidHour' : 'invalidMinute')); entry.reportValidity(); entry.focus(); return }
        values[wheel.dataset.part] = String(parsed)
      } else values[wheel.dataset.part] = wheel.children[Math.max(0, Math.min(wheel.children.length - 1, Math.round(wheel.scrollTop / 40)))].dataset.value
    }
    const confirmed = to24Hour(values.hour, values.minute, values.period)
    if (confirmed) { onChange(confirmed); setDraft(null) }
  }
  return <div className={`vaccination__timeField${error ? ' vaccination__timeField--invalid' : ''}`}><label id={id + '-label'} htmlFor={id}>{label || v('time')}</label><input type="hidden" name="time" value={time} />
    <button id={id} className="vaccination__timeTrigger" aria-invalid={error ? true : undefined} aria-describedby={error ? id + '-error' : undefined} ref={trigger} type="button" disabled={disabled} aria-haspopup="dialog" aria-expanded={isOpen} onClick={open}>{validTime(time) ? formatTime(time, language) : v('selectTime')}<Clock size={17} aria-hidden="true" /></button>
    {error && <p id={id + '-error'} className="vaccination__fieldError" role="alert">{error}</p>}
    {draft && <dialog className="vaccination__timePopover" ref={popup} aria-labelledby={id + '-label'} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setDraft(null) } }} onCancel={event => { event.preventDefault(); event.stopPropagation(); setDraft(null) }}>
      <div className="vaccination__wheels" dir="ltr">
        <TimeWheel part="hour" label={v('hour')} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} value={draft.hour} onChange={hour => setDraft(previous => previous && ({ ...previous, hour }))} invalidMessage={v('invalidHour')} />
        <TimeWheel part="minute" label={v('minute')} options={Array.from({ length: 60 }, (_, i) => ({ value: String(i).padStart(2, '0'), label: number(i) }))} value={draft.minute} onChange={minute => setDraft(previous => previous && ({ ...previous, minute }))} invalidMessage={v('invalidMinute')} />
        <TimeWheel part="period" label={v('period')} options={[{ value: 'am', label: v('am') }, { value: 'pm', label: v('pm') }]} value={draft.period} onChange={period => setDraft(previous => previous && ({ ...previous, period }))} />
      </div><div className="vaccination__pickerActions"><Button variant="secondary" onClick={() => setDraft(null)}>{v('cancel')}</Button><Button onClick={confirm}>{v('done')}</Button></div>
    </dialog>}
  </div>
}
// Temporary records are owned by one mounted child session; parent data is never mutated.
function validChildId(value) {
  return typeof value === 'string' ? value.trim().length > 0 : typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
function administrationDate(record) { return record?.administeredAt || record?.vaccinationDate }
function isCompleted(record, today = localDate()) {
  const date = administrationDate(record)
  return validDate(date) && date <= today
}
// New records represent one visit. Legacy dose rows remain intact and are inspected, not migrated silently.
function isVisitRecord(record) { return Boolean(record?.visitId || record?.kind === 'vaccination-visit') }
function belongsToGroup(record, group) {
  return isVisitRecord(record) ? (record.visitId || record.stageId) === group.id : group.doses.some(d => d.id === record.doseId)
}
function recordSignature(record) {
  return JSON.stringify(record)
}
function groupFingerprint(group, records) {
  return JSON.stringify(records.filter(r => belongsToGroup(r, group)).map(recordSignature).sort())
}

function visitState(group, child, records, today = localDate()) {
  const related = records.filter(r => r && r.childId === child.id && belongsToGroup(r, group))
  if (related.some(record => record.kind === 'vaccination-dose')) {
    const states = group.doses.map(dose => vaccinationDoseState(group, dose, records, child.id))
    const conflict = states.some(info => info.conflict || (info.record?.status === 'completed' && (!isCompleted(info.record, today) || (validDate(child.dateOfBirth) && administrationDate(info.record) < child.dateOfBirth))))
    const completedCount = states.filter(info => info.record?.status === 'completed' && isCompleted(info.record, today)).length
    const completed = !conflict && completedCount === group.doses.length
    const dates = [...new Set(states.filter(info => info.record?.status === 'completed' && isCompleted(info.record, today)).map(info => administrationDate(info.record)))].sort()
    const visit = related.find(isVisitRecord)
    const eligible = Boolean(dueDate(group, child, today) && dueDate(group, child, today) <= today)
    const appointment = !completed && visit?.appointmentDate && validTime(visit.appointmentTime) ? { date: visit.appointmentDate, time: visit.appointmentTime } : null
    return { status: conflict ? 'conflict' : completed ? 'completed' : completedCount ? 'partial' : eligible ? 'due' : 'upcoming', eligible, conflict, completed, date: completed ? dates.at(-1) : '', dates, appointment, visit, legacy: related.filter(record => !isVisitRecord(record) && record.kind !== 'vaccination-dose'), related, signature: groupFingerprint(group, records) }
  }
  const visits = related.filter(isVisitRecord)
  const legacy = related.filter(r => !isVisitRecord(r))
  const visit = visits[0]
  const dates = [...new Set(legacy.filter(r => isCompleted(r, today)).map(administrationDate))]
  const completedIds = new Set(legacy.filter(r => isCompleted(r, today)).map(r => r.doseId))
  const count = completedIds.size
  const partial = count > 0 && count < group.doses.length
  const legacyAppointments = legacy.filter(r => !isCompleted(r, today) && (r.appointmentDate || r.appointmentTime))
  const appointmentKeys = [...new Set(legacyAppointments.map(r => (r.appointmentDate || '') + 'T' + (r.appointmentTime || '')))]
  let conflict = visits.length > 1 || partial || dates.length > 1
  for (const record of related) {
    const date = administrationDate(record)
    if (record.appointmentHistory != null && (!Array.isArray(record.appointmentHistory) || record.appointmentHistory.some(item => !item || typeof item !== 'object'))) conflict = true
    if (record.status === 'completed' && !isCompleted(record, today)) conflict = true
    if (date && (!validDate(date) || date > today || (validDate(child.dateOfBirth) && date < child.dateOfBirth))) conflict = true
    if ((record.appointmentDate || record.appointmentTime) && (!validDate(record.appointmentDate) || !validTime(record.appointmentTime))) conflict = true
  }
  for (const dose of group.doses) {
    const duplicates = legacy.filter(r => r.doseId === dose.id)
    if (new Set(duplicates.map(r => JSON.stringify([administrationDate(r) || '', r.appointmentDate || '', r.appointmentTime || '']))).size > 1) conflict = true
  }
  if (!visit && appointmentKeys.length > 1) conflict = true
  if (visit) {
    const ids = Array.isArray(visit.doseIds) ? visit.doseIds : Array.isArray(visit.administrations) ? visit.administrations.filter(Boolean).map(r => r.doseId) : []
    if (ids.length !== group.doses.length || group.doses.some(d => !ids.includes(d.id))) conflict = true
    if (count && (!isCompleted(visit, today) || dates.some(date => date !== administrationDate(visit)))) conflict = true
    // A visit timestamp alone is not evidence that every required dose was applied.
    const administrations = visit.administrations
    if (administrations !== undefined && (!Array.isArray(administrations) || administrations.length !== group.doses.length || group.doses.some(d => administrations.filter(r => r && r.doseId === d.id && (r.childId == null || r.childId === child.id) && isCompleted(r, today) && administrationDate(r) === administrationDate(visit)).length !== 1))) conflict = true
    if (isCompleted(visit, today) && administrations === undefined && !(count === group.doses.length && dates.length === 1 && dates[0] === administrationDate(visit))) conflict = true
    if (!isCompleted(visit, today) && legacyAppointments.some(r => r.appointmentDate !== visit.appointmentDate || r.appointmentTime !== visit.appointmentTime)) {
      // A deliberate visit edit retains its original legacy rows for history; later external changes still need review.
      if (visit.legacyFingerprint !== JSON.stringify(legacy.map(recordSignature).sort())) conflict = true
    }
  }
  const completed = visit ? isCompleted(visit, today) : count === group.doses.length && dates.length === 1
  const due = dueDate(group, child, today)
  const eligible = Boolean(due && due <= today)
  const status = conflict ? (partial ? 'partial' : 'conflict') : completed ? 'completed' : eligible ? 'due' : 'upcoming'
  const appointmentSource = visit || legacyAppointments[0]
  const appointment = !conflict && !completed && appointmentSource?.appointmentDate && validTime(appointmentSource.appointmentTime)
    ? { date: appointmentSource.appointmentDate, time: appointmentSource.appointmentTime } : null
  return { status, eligible, conflict, completed: completed && !conflict, date: completed && !conflict ? administrationDate(visit) || dates[0] : '', dates, appointment, visit, legacy, related, signature: groupFingerprint(group, records) }
}
function stageState(group, child, records, today = localDate()) { return visitState(group, child, records, today) }
function DateField({ label, value, onChange, min, max, disabled, placeholder, errorId, required = false, error }) {
  const id = useId()
  return <div className={`vaccination__dateField${error ? ' vaccination__dateField--invalid' : ''}`}><label htmlFor={id}>{label}</label><div className="vaccination__dateControl"><input id={id} className={value ? '' : 'vaccination__emptyDate'} type="date" value={value} onChange={event => onChange(event.target.value)} min={min} max={max} disabled={disabled} required={required} aria-invalid={error ? true : undefined} aria-describedby={error ? id + '-error' : errorId} />{!value && <span className="vaccination__datePlaceholder" aria-hidden="true">{placeholder}</span>}</div>{error && <p id={id + '-error'} className="vaccination__fieldError" role="alert">{error}</p>}</div>
}
// A one-line notes field grows with its existing controlled draft, without changing save behavior.
function CompactDoseNotes({ label, value, onChange, disabled }) {
  const id = useId()
  const ref = useRef(null)
  function resize() {
    const element = ref.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = Math.min(128, Math.max(36, element.scrollHeight + 2)) + 'px'
  }
  useLayoutEffect(resize, [value])
  useEffect(() => { window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize) }, [])
  return <div className="vaccination__compactNotes"><label htmlFor={id}>{label}</label><textarea id={id} ref={ref} rows={1} value={value} onChange={onChange} disabled={disabled} /></div>
}

function AppointmentSummary({ date, time, labels, today = localDate() }) {
  const { v, formatDate, language } = labels
  const id = useId()
  const hasDate = validDate(date)
  const tone = hasDate ? date <= today ? 'due' : 'upcoming' : 'empty'
  return <section className={`vaccination__appointmentSummary vaccination__appointmentSummary--${tone}`} aria-labelledby={id} aria-live="polite">
    <CalendarDays size={22} aria-hidden="true" />
    <div><h4 id={id}>{v('appointmentSummaryTitle')}</h4>{hasDate ? <dl><div><dt>{v('appointmentDate')}</dt><dd><time dateTime={date}>{formatDate(date)}</time></dd></div><div><dt>{v('time')}</dt><dd>{validTime(time) ? <time dateTime={time}>{formatTime(time, language)}</time> : v('appointmentSummaryNoTime')}</dd></div></dl> : <p>{v('appointmentSummaryEmpty')}</p>}</div>
  </section>
}

function VisitEditor({ group, child, info, actor, onSave, labels, actionHost, showAppointment = true, onClose, compactDetails = false }) {
  const { v, serviceLabel, number, formatDate, language } = labels
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dateError, setDateError] = useState('')
  const [locationError, setLocationError] = useState('')
  const [appointmentDateError, setAppointmentDateError] = useState('')
  const [appointmentTimeError, setAppointmentTimeError] = useState('')
  const [success, setSuccess] = useState(false)
  const id = useId()
  const record = info.record || {}
  const today = localDate()
  const completed = record.status === 'completed' || Boolean(administrationDate(record))
  const hasSavedAdministration = record.status !== 'pending' && completed && validDate(administrationDate(record))
  const scheduled = !completed && validDate(record.appointmentDate) && validTime(record.appointmentTime)
  const title = v('visitIncludes')
  const locationName = entry => entry.facilityName || (['internal', 'external'].includes(entry.administrationLocation) ? v('corrections.' + entry.administrationLocation) : entry.administrationLocation) || ''
  const fields = ['administeredAt', 'administeredTime', 'facilityName', 'notes']
  const recordedFields = !hasSavedAdministration ? [] : compactDetails ? fields.filter(key => {
    if (key === 'administeredAt') return validDate(administrationDate(record))
    if (key === 'administeredTime') return validTime(record.administeredTime)
    const value = key === 'facilityName' ? locationName(record) : record[key]
    return typeof value === 'string' && Boolean(value.trim())
  }) : fields
  const fieldLabel = key => key === 'facilityName' ? v('corrections.administrationLocation') : key === 'administeredTime' ? v('administrationTime') : v('corrections.' + key)
  const display = (value, key) => key === 'facilityName' ? locationName(record) || v('corrections.unspecified') : key === 'administeredTime' ? validTime(value) ? formatTime(value, language) : v('corrections.unspecified') : key === 'administeredAt' ? value ? formatDate(value) : v('noDate') : value || v('corrections.unspecified')
  function start(status, mode) {
    setSuccess(false)
    setError('')
    setDateError('')
    setLocationError('')
    setAppointmentDateError('')
    setAppointmentTimeError('')
    setEditing({ mode, expected: structuredClone(info.related), wasCompleted: completed || info.related?.some(record => record.status === 'completed' || Boolean(administrationDate(record))), draft: { childId: child.id, stageId: group.id, status, administeredAt: hasSavedAdministration ? administrationDate(record) : '', administeredTime: hasSavedAdministration ? record.administeredTime || '' : '', facilityName: hasSavedAdministration ? locationName(record) : '', notes: mode === 'schedule' || hasSavedAdministration ? record.notes || '' : '', appointmentDate: record.appointmentDate || '', appointmentTime: record.appointmentTime || '' } })
  }
  const update = patch => setEditing(previous => ({ ...previous, draft: { ...previous.draft, ...patch } }))
  function appointmentErrors(draft) {
    const unchanged = draft.appointmentDate === record.appointmentDate && draft.appointmentTime === record.appointmentTime
    const date = !draft.appointmentDate ? v('appointmentDateRequired') : !validDate(draft.appointmentDate) || (!unchanged && draft.appointmentDate < today) ? v('appointmentDateInvalid') : ''
    let time = !draft.appointmentTime ? v('appointmentTimeRequired') : !validTime(draft.appointmentTime) ? v('appointmentTimeInvalid') : ''
    if (!date && !time && !unchanged && !validAppointment({ date: draft.appointmentDate, time: draft.appointmentTime, stageId: group.id })) time = v('appointmentTimeInvalid')
    return { date, time }
  }
  function updateAppointment(patch) {
    const errors = appointmentErrors({ ...editing.draft, ...patch })
    update(patch)
    if (appointmentDateError) setAppointmentDateError(errors.date)
    if (appointmentTimeError) setAppointmentTimeError(errors.time)
  }
  async function submit(event) {
    event.preventDefault()
    if (!actor || busy || !editing) return
    const draft = editing.draft
    setError('')
    setDateError('')
    if (draft.status === 'completed') {
      const invalidDate = !validDate(draft.administeredAt) || draft.administeredAt > today || (validDate(child.dateOfBirth) && draft.administeredAt < child.dateOfBirth)
      const missingLocation = !draft.facilityName.trim()
      if (invalidDate) setDateError(v(!draft.administeredAt ? 'vaccinationDateRequired' : 'corrections.required'))
      if (missingLocation) setLocationError(v('corrections.locationRequired'))
      if (invalidDate || missingLocation) return
    }
    const errors = draft.status === 'completed' && draft.administeredTime && !validTime(draft.administeredTime) ? ['invalidAdministrationTime'] : []
    if (draft.status === 'pending' && editing.mode === 'schedule') {
      const errors = appointmentErrors(draft)
      setAppointmentDateError(errors.date)
      setAppointmentTimeError(errors.time)
      if (errors.date || errors.time) return
    }
    const failure = errors.find(Boolean)
    if (failure) { setError(v(['invalidFollowUp', 'invalidAdministrationTime'].includes(failure) ? failure : 'corrections.' + failure)); return }
    const reversal = editing.wasCompleted && draft.status === 'pending'
    if (reversal && !window.confirm(v('visitConfirmReversal'))) return
    setBusy(true)
    try {
      const result = await onSave(draft, editing.expected, reversal)
      if (!result || result.status !== draft.status) throw Error('failed')
      setEditing(null)
      setSuccess(true)
    } catch (failure) {
      const key = ['required', 'locationRequired', 'invalidFollowUp', 'invalidAdministrationTime', 'recordConflict', 'historicalConflict', 'correctionForbidden', 'reversalConfirmationRequired'].includes(failure.message) ? failure.message : 'failed'
      if (key === 'invalidFollowUp' && editing.mode === 'schedule') {
        const errors = appointmentErrors(draft)
        setAppointmentDateError(errors.date)
        setAppointmentTimeError(errors.time || (!errors.date ? v('appointmentTimeInvalid') : ''))
      }
      else if (key === 'locationRequired') setLocationError(v('corrections.locationRequired'))
      else if (key === 'required') setDateError(v(!draft.administeredAt ? 'vaccinationDateRequired' : 'corrections.required'))
      else setError(v(['invalidFollowUp', 'invalidAdministrationTime'].includes(key) ? key : 'corrections.' + key))
    } finally { setBusy(false) }
  }
  async function cancelAppointment() {
    if (!actor || busy || !editing || editing.mode !== 'schedule' || !scheduled || info.conflict) return
    if (!window.confirm(v('cancelAppointmentConfirm'))) return
    setError('')
    setBusy(true)
    try {
      const result = await onSave(editing.draft, editing.expected, false, true)
      if (!result || result.appointmentDate || result.appointmentTime) throw Error('failed')
      setEditing(null)
      setSuccess(true)
      onClose?.()
    } catch (failure) {
      setError(v(['recordConflict', 'historicalConflict', 'correctionForbidden'].includes(failure.message) ? 'corrections.' + failure.message : 'corrections.failed'))
    } finally { setBusy(false) }
  }
  const appointment = editing ? editing.draft : record
  const summary = showAppointment && (editing || !compactDetails || validDate(appointment.appointmentDate)) && <AppointmentSummary date={appointment.appointmentDate} time={appointment.appointmentTime} labels={labels} today={today} />
  const actions = <div className="vaccination__modalActions">{actor && editing?.mode === 'schedule' && scheduled && !info.conflict && <Button variant="secondary" className="vaccination__cancelAppointment" disabled={busy} onClick={cancelAppointment}>{v('cancelAppointment')}</Button>}<Button variant="secondary" disabled={busy} onClick={() => { setEditing(null); setError(''); setDateError(''); setLocationError(''); setAppointmentDateError(''); setAppointmentTimeError(''); onClose?.() }}>{v('cancel')}</Button><Button form={id + '-form'} type="submit" disabled={busy}>{v(busy ? 'saving' : 'saveChanges')}</Button></div>
  return <section className="vaccination__service vaccination__doseCorrection" aria-labelledby={id}>
    <ul className="vaccination__vaccineChips">{group.doses.map(service => <li className="vaccination__vaccineChip" key={service.id}><bdi dir="auto">{serviceLabel(service)}{service.number ? " \u00b7 " + (service.number === "booster" ? v("booster") : v("doseLabel") + " " + number(service.number)) : ""}</bdi></li>)}</ul><div className="vaccination__serviceHeading"><h4 id={id}>{title}</h4>{(!compactDetails || completed) && <span className={`vaccination__badge vaccination__badge--${completed ? 'completed' : 'upcoming'}`}>{v('corrections.' + (completed ? 'completed' : 'pending'))}</span>}</div>
    {!editing || !actor ? <>{compactDetails && !hasSavedAdministration && !validDate(record.appointmentDate) && <p className="vaccination__notAdministered">{v('notAdministeredYet')}</p>}{recordedFields.length > 0 && <dl className={`vaccination__recordFacts${compactDetails ? ' vaccination__administrationDetails' : ''}`}>{recordedFields.map(key => <div key={key}><dt>{fieldLabel(key)}</dt><dd dir="auto">{display(key === 'administeredAt' ? administrationDate(record) : record[key], key)}</dd></div>)}</dl>}{summary}{actor && !info.conflict && <div className="vaccination__visitActions">{completed ? <Button variant="secondary" onClick={() => start('completed', 'edit')}>{v('visitEdit')}</Button> : <><Button variant="secondary" onClick={() => start('pending', 'schedule')}>{v(scheduled ? 'editAppointment' : 'visitSchedule')}</Button><Button onClick={() => start('completed', 'administer')}>{v('visitAdminister')}</Button></>}</div>}</> : <form id={id + '-form'} onSubmit={submit} noValidate className="vaccination__correctionForm" aria-labelledby={id}>
      {editing.mode === 'edit' && <><label htmlFor={id + '-status'}>{v('corrections.status')}</label><select id={id + '-status'} value={editing.draft.status} disabled={busy} onChange={event => update({ status: event.target.value, appointmentDate: '', appointmentTime: '' })}><option value="completed">{v('corrections.completed')}</option><option value="pending">{v('corrections.pending')}</option></select></>}
      {editing.draft.status === 'completed' && <><div className="vaccination__appointmentFields"><DateField label={v('corrections.administeredAt')} value={editing.draft.administeredAt} required error={dateError} onChange={administeredAt => { update({ administeredAt }); if (validDate(administeredAt) && administeredAt <= today && (!validDate(child.dateOfBirth) || administeredAt >= child.dateOfBirth)) setDateError('') }} min={validDate(child.dateOfBirth) ? child.dateOfBirth : undefined} max={today} disabled={busy || editing.draft.status !== 'completed'} placeholder={v('selectDate')} errorId={error ? id + '-error' : undefined} />
      <TimeField time={editing.draft.administeredTime} onChange={administeredTime => update({ administeredTime })} v={v} label={v('administrationTime')} disabled={busy} /></div>
      <label htmlFor={id + '-location'}>{v('corrections.administrationLocation')}</label><input id={id + '-location'} type="text" className={locationError ? 'vaccination__locationInput--invalid' : undefined} aria-invalid={locationError ? true : undefined} aria-describedby={locationError ? id + '-location-error' : undefined} value={editing.draft.facilityName} placeholder={v('locationPlaceholder')} dir="auto" required disabled={busy} onChange={event => { update({ facilityName: event.target.value }); if (event.target.value.trim()) setLocationError('') }} />{locationError && <p id={id + '-location-error'} className="vaccination__fieldError" role="alert">{locationError}</p>}</>}
      {editing.draft.status === 'pending' && editing.mode === 'schedule' && <div className="vaccination__appointmentFields"><DateField label={v('appointmentDate')} value={editing.draft.appointmentDate} required error={appointmentDateError} onChange={appointmentDate => updateAppointment({ appointmentDate })} min={today} disabled={busy} placeholder={v('selectDate')} /><TimeField time={editing.draft.appointmentTime} error={appointmentTimeError} onChange={appointmentTime => updateAppointment({ appointmentTime })} v={v} disabled={busy} /></div>}
      <CompactDoseNotes label={v('corrections.notes')} value={editing.draft.notes} onChange={event => update({ notes: event.target.value })} disabled={busy} />
      {error && <p id={id + '-error'} role="alert" className="vaccination__error">{error}</p>}
      {summary}
      {actionHost ? createPortal(actions, actionHost) : actions}
    </form>}
    {success && <p role="status">{v('corrections.success')}</p>}
  </section>
}

function StageDetails({ group, child, records, doctor, onClose, labels, correctionActor, onManageVisit }) {
  const { v, stageLabel, serviceLabel, formatDate } = labels
  const today = useLocalDay()
  const state = visitState(group, child, records, today)
  const [actionHost, setActionHost] = useState(null)
  const dialog = useRef(null), titleId = useId()
  useEffect(() => { const previous = document.activeElement, element = dialog.current; element.showModal(); return () => { element.close(); previous?.focus() } }, [])
  const doseRecords = group.doses.map(dose => vaccinationDoseState(group, dose, records, child.id).record).filter(Boolean)
  const shared = key => doseRecords.length && doseRecords.every(record => record[key] === doseRecords[0][key]) ? doseRecords[0][key] : ''
  const record = state.visit && !state.related.some(record => record.kind === 'vaccination-dose') ? state.visit : { ...state.visit, status: state.completed ? 'completed' : 'pending', administeredAt: state.date || '', vaccinationDate: state.date || '', administeredTime: shared('administeredTime'), administrationLocation: shared('administrationLocation'), facilityName: shared('facilityName'), informationSource: shared('informationSource'), notes: shared('notes'), appointmentDate: state.appointment?.date || '', appointmentTime: state.appointment?.time || '' }
  const historical = [...state.related.filter(record => !isVisitRecord(record)), ...(state.visit?.legacyRecords || [])]
  return <dialog className={doctor ? 'vaccination__details vaccination__details--doctor' : 'vaccination__details vaccination__details--mother'} ref={dialog} aria-labelledby={titleId} onCancel={event => { if (event.target !== event.currentTarget) event.preventDefault(); else onClose() }}>
    <div className="vaccination__modalHeader"><div><h3 id={titleId}>{stageLabel(group)}</h3><span className={'vaccination__badge vaccination__badge--' + state.status}>{v(state.status)}</span></div><Button variant="secondary" className="vaccination__close" aria-label={v('close')} onClick={onClose}><X size={18} aria-hidden="true" /></Button></div>
    <div className="vaccination__detailsBody">
    {state.conflict && <p role="alert" className="vaccination__error">{v('historicalConflict')}</p>}
    <VisitEditor group={group} child={child} info={{ record, related: state.related, conflict: state.related.filter(isVisitRecord).length > 1 || group.doses.some(dose => vaccinationDoseState(group, dose, records, child.id).conflict) }} actor={doctor ? correctionActor : null} onSave={onManageVisit} labels={labels} actionHost={actionHost} onClose={onClose} compactDetails={doctor} />
    {historical.length > 0 && <details className="vaccination__historical"><summary>{v('historicalRecords')}</summary>{historical.map((entry, index) => <section key={index}><h4>{serviceLabel(group.doses.find(dose => dose.id === entry.doseId) || { vaccineId: entry.vaccineId })}</h4><VisitEditor group={{ ...group, doses: [] }} child={child} info={{ record: entry }} actor={null} labels={labels} showAppointment={false} compactDetails={doctor} /></section>)}</details>}
    {state.conflict && state.related.filter(isVisitRecord).map((entry, index) => <p key={index}>{formatDate(administrationDate(entry))} &#xB7; {entry.notes}</p>)}
    </div>
    <div className="vaccination__detailsFooter"><div ref={setActionHost} /><div className="vaccination__modalActions vaccination__detailsClose"><Button variant="secondary" onClick={onClose}>{v('close')}</Button></div></div>
  </dialog>
}
// Education is separate from vaccination records and is mounted only for the mother role.
function VaccineInformation({ v }) {
  const [expanded, setExpanded] = useState(null)
  const id = useId()
  const items = [{ key: 'hexa', abbreviation: 'HEXA' }, { key: 'bcg', abbreviation: 'BCG' }, { key: 'rota', abbreviation: 'ROTA' }, { key: 'opv', abbreviation: 'OPV' }, { key: 'mmr', abbreviation: 'MMR' }, { key: 'dpt', abbreviation: 'DPT' }, { key: 'measles' }, { key: 'vitaminA' }]
  return <section className="vaccination__information" aria-labelledby={id + '-title'}>
    <h3 id={id + '-title'}><Info size={20} aria-hidden="true" />{v('information.title')}</h3>
    <p className="vaccination__informationSubtitle">{v('information.subtitle')}</p>
    <div className="vaccination__informationItems">{items.map(({ key, abbreviation }) => {
      const open = expanded === key
      const buttonId = id + '-' + key + '-button'
      const panelId = id + '-' + key + '-panel'
      return <div className="vaccination__informationItem" key={key}>
        <h4><button type="button" id={buttonId} aria-expanded={open} aria-controls={panelId} onClick={() => setExpanded(previous => previous === key ? null : key)}>
          <span>{abbreviation && <><bdi dir="ltr" lang="en">{abbreviation}</bdi><span aria-hidden="true"> &#x2013; </span></>}<bdi dir="auto">{v('information.' + key + '.name')}</bdi></span><ChevronDown size={18} className={open ? 'vaccination__informationChevron--open' : ''} aria-hidden="true" />
        </button></h4>
        <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}><p>{v('information.' + key + '.description')}</p></div>
      </div>
    })}</div>
  </section>
}

// Shared canonical-child storage persists records; changing children resets drafts only.
export default function VaccinationSchedule(props) {
  const childId = canonicalChildId(props.child?.id)
  const sessionKey = validChildId(childId) ? typeof childId + ':' + childId : 'invalid-child'
  const child = props.child && typeof props.child === 'object' && !Array.isArray(props.child) ? props.child : {}
  return <VaccinationSession key={sessionKey} {...props} child={{ ...child, id: childId }} />
}
function VaccinationSession({ role, child = {}, currentAge, vaccinationRecords = [] }) {
  const { language, t } = useLanguage()
  const authenticatedUser = useUnifiedDemoUser()
  const v = key => t(`childHealth.vaccinations.${key}`)
  const today = useLocalDay()
  const { records, manageVisit, error: storageError } = useVaccinationStorage(child.id, vaccinationRecords)
  const [modal, setModal] = useState(null)
  const [message, setMessage] = useState('')
  const doctor = role === 'doctor'
  const profile = doctor && (!authenticatedUser || (authenticatedUser.role === 'doctor' && authenticatedUser.clinicalEditing === true)) ? currentDoctorProfile() : null
  const correctionActor = profile ? { id: profile.id, name: profile.name, role: 'doctor', clinicalEditing: true } : null
  const number = value => new Intl.NumberFormat(language).format(value)
  const formatDate = date => validDate(date) ? new Intl.DateTimeFormat(language, { calendar: 'gregory', year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(date + 'T12:00:00')) : '—'
  const formatAppointment = (date, time) => `${formatDate(date)} — ${validTime(time) ? formatTime(time, language) : '—'}`
  const stageLabel = group => v(`stageLabels.${group.id}`)
  const serviceLabel = service => ['measles', 'vitaminA'].includes(service.vaccineId) ? `${v(service.vaccineId)}${service.amount ? ' · ' + number(service.amount) + ' ' + v('iu') : ''}` : service.vaccineId
  const tableServiceLabel = service => {
    const name = ['measles', 'vitaminA'].includes(service.vaccineId) ? v(service.vaccineId) : service.vaccineId
    const dose = service.number === 'booster' ? v('booster') : service.number ? v('doseLabel') + ' ' + number(service.number) : ''
    return name + (dose ? ' \u00b7 ' + dose : '')
  }
  const rows = schedule.map(group => ({ ...group, ...stageState(group, child, records, today) }))
  // Age ownership matches DevelopmentalMilestones: completed months supplied by the parent.
  // DOB is used only for scheduling, eligibility and administration-date validation.
  const providedAge = currentAge === undefined ? child.currentAge : currentAge
  const age = Number.isInteger(providedAge) && providedAge >= 0
    ? new Intl.NumberFormat(language, { style: 'unit', unit: 'month', unitDisplay: 'long' }).format(providedAge)
    : v('unknownAge')

  return <Card className={role === 'mother' ? 'vaccination vaccination--mother' : 'vaccination'} dir={language === 'ar' ? 'rtl' : 'ltr'} lang={language}>
    <header className="vaccination__header"><div className="vaccination__intro"><div className="vaccination__title"><span className="vaccination__titleIcon"><Syringe aria-hidden="true" /></span><div><h2>{v('title')}</h2><p>{v('subtitle')}</p></div></div>{role !== 'mother' && role !== 'doctor' && <div className="vaccination__child"><strong>{typeof child.name === 'string' && child.name.trim() ? child.name : v('unknownChild')}</strong><dl><div><dt>{t('childHealth.dateOfBirth')}</dt><dd>{validDate(child.dateOfBirth) && child.dateOfBirth <= today ? formatDate(child.dateOfBirth) : '—'}</dd></div><div><dt>{v('age')}</dt><dd>{age}</dd></div></dl></div>}</div></header>
    <div className="vaccination__summary">{['completed', 'due', 'upcoming'].map((status, index) => {
      const Icon = [Check, Clock, CalendarDays][index]
      const count = rows.filter(row => status === 'completed' ? row.status === 'completed' : status === 'due' ? row.status === 'partial' || row.status === 'conflict' || row.status === 'due' : row.status === 'upcoming').length
      return <div className={`vaccination__stat vaccination__stat--${status}`} key={status}><Icon aria-hidden="true" /><div>{v(status)}<strong>{number(count)}</strong></div></div>
    })}</div>
    <h3 className="vaccination__sr">{v('schedule')}</h3>
    <div className="vaccination__scroll" tabIndex="0" role="region" aria-label={v('schedule')}><table><caption className="vaccination__sr">{v('schedule')}</caption><thead><tr>{['tableScheduledAge', 'tableVaccines', 'status', 'vaccinationDate', 'nextAppointment', 'action'].map(key => <th scope="col" key={key} className={key === 'tableScheduledAge' ? 'vaccination__scheduledAge' : undefined}>{v(key)}</th>)}</tr></thead><tbody>{rows.map(group => {
      const appointment = group.appointment
      const Icon = group.Icon
      return <tr key={group.id} className={modal?.id === group.id ? 'vaccination__selectedRow' : ''}>
        <th scope="row" className="vaccination__scheduledAge"><div className="vaccination__stageAge"><span className={`vaccination__stageIcon vaccination__stageIcon--${group.id}`}><Icon size={22} aria-hidden="true" /></span><span>{v(`tableStageLabels.${group.id}`)}</span></div></th>
        <td className="vaccination__vaccinesCell"><ul className="vaccination__vaccineChips">{group.doses.map(service => <li key={service.id} className="vaccination__vaccineChip"><bdi dir="auto">{tableServiceLabel(service)}</bdi></li>)}</ul></td>
        <td><span className={`vaccination__badge vaccination__badge--${group.status}`}>{v(group.status)}</span>{group.conflict && <small>{v('historicalReview')}</small>}{!dueDate(group, child, today) && group.status !== 'completed' && <small>{v('unknownDue')}</small>}</td>
        <td>{group.conflict ? v('historicalReview') : formatDate(group.date)}</td><td>{appointment ? formatAppointment(appointment.date, appointment.time) : '—'}</td>
        <td><Button variant="secondary" className="vaccination__view" onClick={() => { setMessage(''); setModal(group) }}><Eye size={16} aria-hidden="true" />{v('view')}</Button></td>
      </tr>
    })}</tbody></table></div>
    {role === 'mother' && <VaccineInformation v={v} />}
    {!validChildId(child.id) && doctor && <p role="alert">{v('missingChildId')}</p>}{storageError && <p role="alert">{v('failed')}</p>}{message && <p role="status">{message}</p>}<footer>{v('footer')}</footer>
    {modal && <StageDetails key={`${child.id}-${modal.id}-${doctor}`} group={modal} child={child} records={records} doctor={doctor && !storageError} correctionActor={correctionActor} onManageVisit={(draft, expected, confirmReversal, cancelAppointment = false) => {
      if (!doctor || !correctionActor || storageError) throw Error('correctionForbidden')
      const result = manageVisit(draft, expected, correctionActor, confirmReversal, cancelAppointment)
      setMessage(v('corrections.success'))
      return result
    }} onClose={() => setModal(null)} labels={{ v, number, language, stageLabel, serviceLabel, formatDate, formatAppointment }} />}
  </Card>
}
