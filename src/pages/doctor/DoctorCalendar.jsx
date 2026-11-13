import PatientInitials from '../../components/doctor/PatientInitials.jsx'
import { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import DoctorModal from '../../components/doctor/DoctorModal.jsx'
import Icon from '../../components/doctor/Icon.jsx'
import { appointmentDurations, availableSlots, bookingDate, formatBookingTime } from '../../components/doctor/appointmentsData.js'
import { registeredPatients, formatDate, formatAge } from '../../components/doctor/patientData.js'
import { ageFromBirthDate } from '../../components/doctor/medicalRecordData.js'
import './DoctorCalendar.css'

export function RequestInformation({ request }) {
  const { language, t } = useLanguage()
  const c = key => t(`doctor.booking.${key}`)
  const child = registeredPatients.find(item => item.id === request.childId)
  const age = child && ageFromBirthDate(child.dateOfBirth)
  return <div className="dc-request-info">
    <PatientInitials name={child?.name || request.childId} gender={child?.gender} className="dc-request-avatar" />
    <div><strong><bdi>{child?.name || request.childId}</bdi></strong>{age && <small>{age.years ? formatAge(age.years, 'year', language) : formatAge(age.months, 'month', language)}</small>}</div>
    <dl><div><dt>{c('date')}</dt><dd><bdi>{formatDate(bookingDate(new Date(request.start)), language)}</bdi></dd></div><div><dt>{c('time')}</dt><dd><bdi>{formatBookingTime(request.start, language)} – {formatBookingTime(request.end, language)}</bdi></dd></div><div><dt>{c('workplace')}</dt><dd>{c(request.workplace)}{request.location && <> · <bdi>{request.location}</bdi></>}</dd></div><div><dt>{c('reason')}</dt><dd dir="auto">{request.reason}</dd></div></dl>
  </div>
}

export default function DoctorCalendar({ bookings, initialTab = 'availability', initialRequestId = null }) {
  const { language, t } = useLanguage()
  const c = key => t(`doctor.booking.${key}`)
  const { state, warning } = bookings
  const [tab, setTab] = useState(initialTab)
  const [draft, setDraft] = useState(() => structuredClone(state.availability))
  const [filter, setFilter] = useState('all')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [conflicts, setConflicts] = useState([])
  const [exceptionDate, setExceptionDate] = useState('')
  const [exceptionReason, setExceptionReason] = useState('')
  const [previewDate, setPreviewDate] = useState(bookingDate())
  const [dialog, setDialog] = useState(initialRequestId ? { id: initialRequestId, action: 'details' } : null)
  const [rejection, setRejection] = useState('')
  const [dialogError, setDialogError] = useState('')
  const selected = state.requests.find(item => item.id === dialog?.id)
  const pending = state.requests.filter(item => item.status === 'pending')
  const slots = availableSlots(state.availability, state.requests, previewDate)
  const dayName = day => new Intl.DateTimeFormat(language, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 10, 1 + day)))
  function updateDay(day, transform) { setDraft(value => ({ ...value, days: value.days.map(item => item.day === day ? transform(item) : item) })) }
  function interval(day, index, field, value) { updateDay(day, item => ({ ...item, intervals: item.intervals.map((entry, position) => position === index ? { ...entry, [field]: value } : entry) })) }
  function save(event) {
    event.preventDefault(); setNotice(''); setError(''); setConflicts([])
    const result = bookings.save(draft)
    if (result.error) { setError(result.error); setConflicts(result.conflicts || []); return }
    setNotice('availabilitySaved')
  }
  function addException() {
    setError(''); setNotice('')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exceptionDate) || !Number.isFinite(Date.parse(exceptionDate)) || new Date(`${exceptionDate}T12:00:00Z`).toISOString().slice(0, 10) !== exceptionDate || exceptionDate < bookingDate() || draft.exceptions.some(item => item.date === exceptionDate)) { setError('invalidException'); return }
    const booked = state.requests.filter(item => ['pending', 'approved'].includes(item.status) && bookingDate(new Date(item.start)) === exceptionDate)
    if (booked.length) { setError('availabilityConflict'); setConflicts(booked); return }
    setDraft(value => ({ ...value, exceptions: [...value.exceptions, { date: exceptionDate, reason: exceptionReason }] })); setExceptionDate(''); setExceptionReason('')
  }
  function decide(event) {
    event.preventDefault()
    const result = bookings.decide(selected.id, dialog.action, rejection)
    if (result.error) { setDialogError(result.error); return }
    setDialog(null); setError(''); setConflicts([]); setNotice(dialog.action === 'approved' ? 'approvedSuccess' : 'rejectedSuccess')
  }
  function open(id, action) { setDialog({ id, action }); setRejection(''); setDialogError('') }
  return <div className="dd-content dc-page">
    <header className="dc-title"><Icon name="calendar" /><div><h2>{c('title')}</h2><p>{c('subtitle')}</p></div></header>
    <p className="dc-demo">{c('shortDemoNotice')}</p>
    <div className="dc-tabs" role="tablist" aria-label={c('title')}>{['availability', 'requests'].map(value => <button id={`dc-tab-${value}`} role="tab" aria-selected={tab === value} aria-controls={`dc-panel-${value}`} key={value} onClick={() => setTab(value)}>{c(value)}{value === 'requests' && <span className="dc-count">{new Intl.NumberFormat(language).format(pending.length)}</span>}</button>)}</div>
    {warning && <p className="dd-error" role="alert">{c(warning)}</p>}
    {error && <div className="dd-error" role="alert"><p>{c(error)}</p>{conflicts.map(item => <button className="dd-button" key={item.id} onClick={() => { setTab('requests'); open(item.id, 'details') }}><bdi>{formatDate(bookingDate(new Date(item.start)), language)} · {formatBookingTime(item.start, language)}</bdi> — {c('viewDetails')}</button>)}</div>}
    {notice && <p className="dd-success" role="status">{c(notice)}</p>}
    {tab === 'availability' ? <section id="dc-panel-availability" role="tabpanel" aria-labelledby="dc-tab-availability">
      <form onSubmit={save} noValidate className="dc-availability">
        <div className="dc-left"><section className="dc-panel"><h3><Icon name="calendar" />{c('availability')}</h3><p>{c('availabilityDescription')}</p>
          <div className="dc-fields"><label>{c('workplace')}<select value={draft.workplace} onChange={event => setDraft({ ...draft, workplace: event.target.value })}>{['clinic', 'hospital'].map(value => <option key={value} value={value}>{c(value)}</option>)}</select></label><label>{c('duration')}<select value={draft.duration} onChange={event => setDraft({ ...draft, duration: Number(event.target.value) })}>{appointmentDurations.map(value => <option key={value} value={value}>{new Intl.NumberFormat(language).format(value)} {c('minutes')}</option>)}</select></label><label className="dc-full">{c('location')}<input dir="auto" value={draft.location} onChange={event => setDraft({ ...draft, location: event.target.value })} /></label></div>
          <h4>{c('weeklySchedule')}</h4><div className="dc-week">{draft.days.map(day => <div key={day.day} className="dc-day" role="group" aria-label={dayName(day.day)}>
            <span className="dc-day-name">{dayName(day.day)}</span>
            <label className="dc-toggle"><input type="checkbox" role="switch" aria-label={dayName(day.day) + ' ' + c('workingDay')} checked={day.enabled} onChange={event => updateDay(day.day, value => ({ ...value, enabled: event.target.checked }))} /><span className="dd-sr-only">{c('workingDay')}</span></label>
            <div className="dc-intervals">{day.intervals.map((entry, index) => <div className="dc-interval" key={index}><label><span className="dd-sr-only">{dayName(day.day)} {c('start')} {index + 1}</span><input type="time" disabled={!day.enabled} value={entry.start} onChange={event => interval(day.day, index, 'start', event.target.value)} /></label><span aria-hidden="true">{'\u2013'}</span><label><span className="dd-sr-only">{dayName(day.day)} {c('end')} {index + 1}</span><input type="time" disabled={!day.enabled} value={entry.end} onChange={event => interval(day.day, index, 'end', event.target.value)} /></label><button type="button" className="dc-remove" disabled={!day.enabled} aria-label={c('removeInterval') + ' ' + dayName(day.day) + ' ' + (index + 1)} onClick={() => updateDay(day.day, value => ({ ...value, intervals: value.intervals.filter((_, position) => position !== index) }))}><Icon name="x" /></button></div>)}</div>
            <button type="button" className="dc-add-interval" disabled={!day.enabled} aria-label={c('addInterval') + ' ' + dayName(day.day)} title={c('addInterval')} onClick={() => updateDay(day.day, value => ({ ...value, intervals: [...value.intervals, { start: '', end: '' }] }))}><Icon name="plus" /></button>
          </div>)}</div>
        </section>
        <section className="dc-panel dc-exceptions"><h3>{c('exceptions')}</h3><p>{c('exceptionsDescription')}</p><details className="dc-exception-editor"><summary>{c('addException')}</summary><div className="dc-fields"><label>{c('date')}<input type="date" min={bookingDate()} value={exceptionDate} onChange={event => setExceptionDate(event.target.value)} /></label><label>{c('optionalReason')}<input dir="auto" value={exceptionReason} onChange={event => setExceptionReason(event.target.value)} /></label></div><button type="button" className="dd-button" onClick={addException}>{c('addException')}</button></details>{!draft.exceptions.length ? <p>{c('noExceptions')}</p> : <ul className="dc-exception-list">{draft.exceptions.slice().sort((a,b) => a.date.localeCompare(b.date)).map(item => <li key={item.date}><div><bdi>{formatDate(item.date, language)}</bdi><p dir="auto">{item.reason}</p></div><button type="button" className="dc-remove" aria-label={`${c('removeException')} ${formatDate(item.date, language)}`} onClick={() => setDraft(value => ({ ...value, exceptions: value.exceptions.filter(entry => entry.date !== item.date) }))}>×</button></li>)}</ul>}<small>{c('saveReminder')}</small></section>
          <button type="submit" className="dd-record-button dc-save">{c('saveAvailability')}</button>
        </div>
        <div className="dc-side">
          <section className="dc-panel"><h3>{c('slotPreview')}</h3><p>{c('previewDescription')}</p><label>{c('date')}<input type="date" min={bookingDate()} value={previewDate} onChange={event => setPreviewDate(event.target.value)} /></label><div className="dc-slots">{slots.length ? slots.map(slot => <span key={slot.id}><bdi>{formatBookingTime(slot.start, language)} – {formatBookingTime(slot.end, language)}</bdi></span>) : <p>{c('noSlots')}</p>}</div></section>
        </div>
      </form>
    </section> : <section id="dc-panel-requests" role="tabpanel" aria-labelledby="dc-tab-requests" className="dc-panel"><h3><Icon name="patients" />{c('requests')}</h3><p>{c('requestsDescription')}</p><div className="dc-filters" role="group" aria-label={c('filterRequests')}>{['all', 'pending', 'approved', 'rejected'].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{c(value)}{value === 'pending' && <span className="dc-count">{new Intl.NumberFormat(language).format(pending.length)}</span>}</button>)}</div><div className="dc-request-list">{state.requests.filter(item => filter === 'all' || item.status === filter).slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(request => <article className={`dc-request dc-request-${request.status}`} key={request.id}><div className="dc-request-top"><span className={`dc-status dc-status-${request.status}`}>{c(request.status)}</span></div><RequestInformation request={request} />{request.rejectionReason && <p className="dc-rejection"><strong>{c('rejectionReason')}: </strong><bdi>{request.rejectionReason}</bdi></p>}<div className="dc-request-actions"><button className="dd-record-button" onClick={() => open(request.id, 'details')}>{c('viewDetails')}</button>{request.status === 'pending' && <><button className="dc-approve" onClick={() => open(request.id, 'approved')}>{c('approve')}</button><button className="dc-reject" onClick={() => open(request.id, 'rejected')}>{c('reject')}</button></>}</div></article>)}</div>{!state.requests.some(item => filter === 'all' || item.status === filter) && <p className="dc-empty">{c(state.requests.length ? 'emptyRequests' : 'noRequestsYet')}</p>}</section>}
    {selected && <DoctorModal title={c(dialog.action === 'details' ? 'requestDetails' : dialog.action === 'approved' ? 'confirmApproval' : 'confirmRejection')} onClose={() => setDialog(null)} className="dc-dialog"><RequestInformation request={selected} /><p><strong>{c('status')}: </strong>{c(selected.status)}</p>{selected.decisionAt && <p>{c('decisionTime')}: <bdi>{formatDate(bookingDate(new Date(selected.decisionAt)), language)} · {formatBookingTime(selected.decisionAt, language)}</bdi></p>}{selected.rejectionReason && <p>{c('rejectionReason')}: <bdi>{selected.rejectionReason}</bdi></p>}{dialog.action === 'details' ? <button className="dd-button" onClick={() => setDialog(null)}>{c('close')}</button> : <form onSubmit={decide} noValidate><p>{c(dialog.action === 'approved' ? 'approveWarning' : 'rejectWarning')}</p>{dialog.action === 'rejected' && <label>{c('rejectionReason')} *<textarea required dir="auto" rows="3" value={rejection} onChange={event => setRejection(event.target.value)} aria-invalid={dialogError === 'rejectionRequired'} /></label>}{dialogError && <p className="dd-error" role="alert">{c(dialogError)}</p>}<div className="dc-request-actions"><button type="button" className="dd-button" onClick={() => setDialog(null)}>{t('common.cancel')}</button><button type="submit" className={dialog.action === 'approved' ? 'dc-approve' : 'dc-reject'}>{c(dialog.action === 'approved' ? 'confirmApprove' : 'confirmReject')}</button></div></form>}</DoctorModal>}
  </div>
}
