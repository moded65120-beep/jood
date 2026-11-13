import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import useDemoBookings from '../../hooks/useDemoBookings.js'
import { canRescheduleDemoBooking, demoBookingDoctors, demoSlotReserved, readDemoReservations, rescheduleDemoBooking } from '../../services/motherDemoBookings.js'
import { getDoctorAvailableDates, getDoctorSlots } from '../../pages/mother/bookingAvailabilityDemo.js'
import '../../pages/mother/PortalBooking.css'

export default function MotherRescheduleModal({ bookingId, onClose, onSuccess }) {
  const { language, t } = useLanguage()
  const { records, error: storageError, now } = useDemoBookings()
  const [original] = useState(() => records.find(record => record.id === bookingId))
  const [values, setValues] = useState({ date: '', time: '' })
  const [step, setStep] = useState('select')
  const [error, setError] = useState('')
  const dialog = useRef(null)
  const heading = useRef(null)
  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
    return () => { if (element?.open) element.close() }
  }, [])
  useEffect(() => { heading.current?.focus() }, [step])
  const rt = key => t('demoReschedule.' + key)
  const locale = language === 'ar' ? 'ar-JO' : 'en-US'
  const current = records.find(record => record.id === bookingId)
  const eligible = canRescheduleDemoBooking(current, now) && current.dateTime === original?.dateTime
  const doctor = demoBookingDoctors.find(item => item.id === original?.doctorId)
  let reservations = [], reservationError = false
  try { reservations = readDemoReservations() } catch { reservationError = true }
  const blocked = Boolean(storageError || reservationError)
  const reserved = (date, time) => demoSlotReserved(doctor?.id, date, time, records, reservations)
  const dates = doctor && eligible && !blocked ? getDoctorAvailableDates(doctor.id, now, reserved) : []
  const slots = doctor && eligible && !blocked ? getDoctorSlots(doctor.id, values.date, now).filter(slot => slot.available && !reserved(values.date, slot.time)) : []
  const formatDate = value => new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(value + 'T00:00:00'))
  const formatTime = value => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date('2000-01-01T' + value + ':00'))
  const formatAppointment = value => new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))
  const summary = original && doctor ? [
    [t('mother.booking.child'), t('mother.' + original.childId)],
    [t('mother.booking.doctor'), language === 'ar' ? doctor.nameAr : doctor.name],
    [t('demoBooking.specialty'), language === 'ar' ? doctor.specialtyAr : doctor.specialty],
    [t('demoBooking.clinic'), t(doctor.clinicKey)],
  ] : []
  function confirm() {
    try {
      rescheduleDemoBooking(bookingId, { ...values, expectedDateTime: original?.dateTime })
      onSuccess()
    } catch (failure) { setError(['notEligible', 'changed'].includes(failure.message) ? rt(failure.message) : t('demoBooking.' + (['invalidSlot', 'duplicate', 'storageError'].includes(failure.message) ? failure.message : 'storageError'))) }
  }
  return <dialog className="demo-reschedule-dialog" ref={dialog} aria-labelledby="reschedule-title" lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'} onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="demo-booking-panel"><h2 id="reschedule-title" ref={heading} tabIndex={-1}>{rt(step === 'confirm' ? 'confirm' : 'title')}</h2><p className="demo-reschedule-notice">{t('demoBooking.notice')}</p>
      {blocked && <p role="alert" className="demo-booking-error">{t('demoBooking.storageError')}</p>}
      {!eligible && <p role="alert" className="demo-booking-error">{rt(current && original && current.dateTime !== original.dateTime ? 'changed' : 'notEligible')}</p>}
      {error && <p role="alert" className="demo-booking-error">{error}</p>}
      {original && doctor && <><dl className="demo-booking-summary">{summary.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}<div><dt>{rt('previous')}</dt><dd><time dateTime={original.dateTime}><bdi>{formatAppointment(original.dateTime)}</bdi></time></dd></div>{step === 'confirm' && <div><dt>{rt('next')}</dt><dd><time dateTime={values.date + 'T' + values.time + ':00'}><bdi>{formatDate(values.date)} &middot; {formatTime(values.time)}</bdi></time></dd></div>}</dl>
      {step === 'select' ? <><h3>{rt('select')}</h3><fieldset><legend>{t('mother.booking.date')}</legend><div className="demo-slot-grid">{dates.map(date => <button type="button" key={date} aria-pressed={values.date === date} onClick={() => { setValues({ date, time: '' }); setError('') }}>{formatDate(date)}</button>)}</div>{!dates.length && !blocked && eligible && <p>{rt('noSlots')}</p>}</fieldset>{values.date && <fieldset><legend>{t('mother.booking.time')}</legend><div className="demo-slot-grid">{slots.map(slot => <button type="button" key={slot.time} aria-pressed={values.time === slot.time} onClick={() => { setValues(previous => ({ ...previous, time: slot.time })); setError('') }}>{formatTime(slot.time)}</button>)}</div>{!slots.length && !blocked && eligible && <p>{rt('noSlots')}</p>}</fieldset>}</> : null}</>}
      <div className="demo-booking-actions">{step === 'confirm' ? <><button type="button" className="demo-booking-secondary" onClick={() => { setStep('select'); setError('') }}>{t('common.back')}</button><button type="button" className="demo-booking-primary" disabled={!eligible || blocked} onClick={confirm}>{rt('confirm')}</button></> : <button type="button" className="demo-booking-primary" disabled={!eligible || blocked || !slots.some(slot => slot.time === values.time)} onClick={() => { setStep('confirm'); setError('') }}>{t('demoBooking.review')}</button>}<button type="button" className="demo-booking-secondary" onClick={onClose}>{t('common.cancel')}</button></div>
    </div>
  </dialog>
}
