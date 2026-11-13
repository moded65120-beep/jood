import DoctorSelectionCard from '../../components/common/DoctorSelectionCard.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import PortalIcon from '../../components/mother/PortalIcon.jsx'
import useDemoBookings from '../../hooks/useDemoBookings.js'
import { portalChildren } from './motherPortalData.js'
import { getDoctorAvailableDates, getDoctorSlots } from './bookingAvailabilityDemo.js'
import { confirmDemoBooking, demoBookingDoctors, demoSlotReserved, readDemoReservations } from '../../services/motherDemoBookings.js'
import './PortalBooking.css'
import { useMotherPageState } from '../../hooks/useMotherNavigation.js'

export default function PortalBooking() {
  const { language, t } = useLanguage()
  const [params] = useSearchParams()
  const entryChildId = params.get('child') || ''
  const lockedChildId = portalChildren.some(child => child.id === entryChildId) ? entryChildId : ''
  const [previousEntry, setPreviousEntry] = useState(entryChildId)
  const [values, setValues] = useMotherPageState('booking.values', () => ({ childId: lockedChildId, doctorId: '', date: '', time: '' }))
  const [step, setStep] = useMotherPageState('booking.step', 'doctor')
  const [error, setError] = useState('')
  const [saved, setSaved] = useMotherPageState('booking.saved', null)
  const { records, error: storageError, now } = useDemoBookings()
  // A reused route must start a fresh booking when its child context changes.
  if (previousEntry !== entryChildId) {
    setPreviousEntry(entryChildId)
    setValues({ childId: lockedChildId, doctorId: '', date: '', time: '' })
    setStep('doctor')
    setError('')
    setSaved(null)
  }
  const heading = useRef(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [step])
  const bt = key => t('demoBooking.' + key)
  const locale = language === 'ar' ? 'ar-JO' : 'en-US'
  const doctor = demoBookingDoctors.find(item => item.id === values.doctorId)
  let reservations = []
  let reservationError = false
  try { reservations = readDemoReservations() } catch { reservationError = true }
  const unavailableStorage = Boolean(storageError || reservationError)
  const reserved = (date, time) => demoSlotReserved(values.doctorId, date, time, records, reservations)
  const dates = doctor ? getDoctorAvailableDates(doctor.id, now, reserved) : []
  const slots = doctor ? getDoctorSlots(doctor.id, values.date, now).filter(slot => slot.available && !reserved(values.date, slot.time)) : []
  const formatDate = value => new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(value + 'T00:00:00'))
  const formatTime = value => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date('2000-01-01T' + value + ':00'))
  const cancelTo = values.childId ? '/mother/children/' + values.childId : '/mother/appointments'
  const summary = doctor ? [
    [t('mother.booking.child'), t('mother.' + values.childId)],
    [t('mother.booking.doctor'), language === 'ar' ? doctor.nameAr : doctor.name],
    [bt('specialty'), language === 'ar' ? doctor.specialtyAr : doctor.specialty],
    [bt('clinic'), t(doctor.clinicKey)],
    [t('mother.booking.date'), values.date ? formatDate(values.date) : ''],
    [t('mother.booking.time'), values.time ? formatTime(values.time) : ''],
  ] : []
  function changeStep(next) { setError(''); setStep(next) }
  function confirm() {
    try {
      const record = confirmDemoBooking({ ...values, childId: lockedChildId || values.childId })
      setSaved(record)
      changeStep('success')
    } catch (failure) { setError(['invalidSlot', 'duplicate', 'storageError'].includes(failure.message) ? failure.message : 'storageError') }
  }
  const stepIndex = ['doctor', 'slot', 'review', 'success'].indexOf(step)
  return <section className="portal-page demo-booking" aria-labelledby="demo-booking-title">
    <header className="portal-page-heading"><p className="portal-eyebrow">{bt('demoLabel')}</p><h1 id="demo-booking-title" ref={heading} tabIndex={-1}>{bt(step === 'success' ? 'successTitle' : 'title')}</h1><p>{bt('notice')}</p></header>
    <ol className="demo-booking-steps" aria-label={bt('progress')}>{['doctor', 'slot', 'review'].map((item, index) => <li key={item} aria-current={step === item ? 'step' : undefined} className={stepIndex >= index ? 'is-reached' : ''}><span aria-hidden="true">{new Intl.NumberFormat(locale).format(index + 1)}</span>{bt(item + 'Step')}</li>)}</ol>
    {step !== 'success' && unavailableStorage && <p className="demo-booking-error" role="alert">{bt('storageError')}</p>}
    {error && <p className="demo-booking-error" role="alert">{bt(error)}</p>}
    {step === 'doctor' && <div className="demo-booking-panel"><label className="demo-booking-field" htmlFor="demo-booking-child">{t('mother.booking.child')}<select id="demo-booking-child" value={lockedChildId || values.childId} disabled={Boolean(lockedChildId)} onChange={event => { if (!lockedChildId) setValues(previous => ({ ...previous, childId: event.target.value })) }}><option value="">{t('mother.booking.chooseChild')}</option>{portalChildren.map(child => <option key={child.id} value={child.id}>{t('mother.' + child.id)}</option>)}</select></label><h2>{bt('chooseDoctor')}</h2><div className="nomu-doctor-grid">{demoBookingDoctors.map(item => <DoctorSelectionCard key={item.id} doctor={item} selected={values.doctorId === item.id} disabled={!values.childId || unavailableStorage} onSelect={() => { setValues(previous => ({ ...previous, doctorId: item.id, date: '', time: '' })); changeStep('slot') }}/>)}</div></div>}
    {step === 'slot' && doctor && <div className="demo-booking-panel"><div className="demo-selected-doctor"><PortalIcon name="doctor"/><div><h2>{t('mother.' + doctor.nameKey)}</h2><p>{t('mother.booking.' + doctor.specialtyKey)} &middot; {t(doctor.clinicKey)}</p></div><span className="portal-tag">{bt('demoLabel')}</span></div><fieldset><legend>{t('mother.booking.date')}</legend><div className="demo-slot-grid">{dates.map(date => <button type="button" key={date} aria-pressed={values.date === date} onClick={() => setValues(previous => ({ ...previous, date, time: '' }))}>{formatDate(date)}</button>)}</div>{!dates.length && <p>{bt('noSlots')}</p>}</fieldset>{values.date && <fieldset><legend>{t('mother.booking.time')}</legend><div className="demo-slot-grid demo-time-grid">{slots.map(slot => <button type="button" key={slot.time} aria-pressed={values.time === slot.time} onClick={() => setValues(previous => ({ ...previous, time: slot.time }))}>{formatTime(slot.time)}</button>)}</div>{!slots.length && <p>{bt('noSlots')}</p>}</fieldset>}<div className="demo-booking-actions"><button type="button" className="demo-booking-secondary" onClick={() => changeStep('doctor')}>{t('common.back')}</button><button type="button" className="demo-booking-primary" disabled={unavailableStorage || !slots.some(slot => slot.time === values.time)} onClick={() => changeStep('review')}>{bt('review')}</button></div></div>}
    {step === 'review' && <div className="demo-booking-panel"><h2>{bt('review')}</h2><dl className="demo-booking-summary">{summary.map(([label, value]) => <div key={label}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}</dl><p className="portal-info">{bt('notice')}</p><div className="demo-booking-actions"><button type="button" className="demo-booking-secondary" onClick={() => changeStep('slot')}>{t('common.back')}</button><button type="button" className="demo-booking-primary" disabled={unavailableStorage} onClick={confirm}>{bt('confirm')}</button></div></div>}
    {step === 'success' && saved && <div className="demo-booking-panel demo-booking-success" role="status"><span className="demo-success-icon"><PortalIcon name="check"/></span><h2>{bt('successTitle')}</h2><p>{bt('successMessage')}</p><dl className="demo-booking-summary">{summary.map(([label, value]) => <div key={label}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}</dl><div className="demo-booking-actions"><Link className="demo-booking-primary" to="/mother/appointments?tab=upcoming">{bt('viewAppointments')}</Link><Link className="demo-booking-secondary" to={'/mother/children/' + saved.childId + '/follow-up-visits'}>{t('mother.followUpVisits')}</Link></div></div>}
    {step !== 'success' && <Link className="demo-booking-cancel" to={cancelTo}>{t('common.cancel')}</Link>}
  </section>
}
