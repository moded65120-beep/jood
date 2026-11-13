import { activeDoctorName } from '../../services/doctorDirectory.js'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import AppointmentAvailability from './AppointmentAvailability.jsx'
import { getBookingMother, readSlotReservations, slotIsPending, submitRescheduleRequest } from '../../services/motherBookingRequests.js'
import { canReschedule, getOwnedAppointment, readRescheduleRequests, rescheduleSlotAllowed, doctorIdForAppointment } from '../../services/motherRescheduleRequests.js'
import './BookAppointment.css'

export default function RescheduleAppointment() {
  const { appointmentId } = useParams()
  return <RescheduleForm key={appointmentId} appointmentId={appointmentId}/>
}

function RescheduleForm({ appointmentId }) {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const [mother] = useState(() => getBookingMother())
  const [now, setNow] = useState(() => new Date())
  const [values, setValues] = useState({ date: '', time: '' })
  const [error, setError] = useState('')
  const [storage, setStorage] = useState(() => {
    try { return { requests: readRescheduleRequests(mother), reservations: readSlotReservations(mother), ready: true } } catch { return { requests: [], reservations: [], ready: false } }
  })
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer) }, [])
  const rt = key => t('mother.reschedule.' + key)
  const bt = key => t('mother.booking.' + key)
  const original = getOwnedAppointment(mother, appointmentId)
  const eligible = canReschedule(mother, original, now)
  const alreadyPending = storage.requests.some(request => request.appointmentId === appointmentId)
  const locale = language === 'ar' ? 'ar-JO' : 'en-US'
  const dateTime = value => new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))
  const doctorId = doctorIdForAppointment(original)
  const isReserved = (date, time) => !rescheduleSlotAllowed(original, date, time, now) || slotIsPending(mother, storage.reservations, doctorId, date, time)
  const change = (name, value) => { setError(''); setValues(previous => ({ ...previous, [name]: value, ...(name === 'date' ? { time: '' } : {}) })) }
  function submit(event) {
    event.preventDefault()
    try {
      submitRescheduleRequest(mother, appointmentId, values)
      navigate('/mother/appointments?tab=pending', { state: { rescheduleSuccess: true } })
    } catch (failure) {
      setError(['ineligible', 'alreadyPending', 'invalidSlot', 'duplicateRequest', 'storageError'].includes(failure.message) ? failure.message : 'storageError')
      try { setStorage({ requests: readRescheduleRequests(mother), reservations: readSlotReservations(mother), ready: true }) } catch { setStorage(previous => ({ ...previous, ready: false })) }
    }
  }
  return <section className="mother-booking" aria-labelledby="reschedule-title">
    <header className="mother-booking__heading"><h1 id="reschedule-title">{rt('title')}</h1><Button variant="secondary" onClick={() => navigate('/mother/appointments')}>{bt('back')}</Button></header>
    <p className="mother-booking__notice">{rt('demoNotice')}</p>
    {!original ? <Card><p role="alert">{rt('notFound')}</p></Card> : <>
      <Card className="mother-booking__summary"><h2>{rt('original')}</h2><dl>{[[bt('child'), t('mother.' + original.childKey)], [bt('doctor'), activeDoctorName(original.doctorKey, language, t('mother.' + original.doctorKey))], [rt('originalTime'), dateTime(original.dateTime)], [bt('reason'), t('mother.appointmentsPage.' + original.reasonKey)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}</dl><p>{rt('rule')}</p></Card>
      {!eligible ? <p role="alert">{rt('ineligible')}</p> : alreadyPending ? <p role="status">{rt('alreadyPending')}</p> : !storage.ready ? <p role="alert">{bt('storageError')}</p> : <form onSubmit={submit}>
        <Card><AppointmentAvailability doctorId={doctorId} date={values.date} time={values.time} now={now} isReserved={isReserved} onChange={change}/></Card>
        <Card className="mother-booking__summary"><h2>{rt('requestedTime')}</h2><p>{values.date && values.time ? dateTime(values.date + 'T' + values.time + ':00') : bt('notSelected')}</p><p>{rt('approvalNote')}</p>{error && <p role="alert" className="mother-booking__error">{rt(error)}</p>}<Button type="submit" disabled={!values.date || !values.time}>{rt('submit')}</Button></Card>
      </form>}
    </>}
  </section>
}
