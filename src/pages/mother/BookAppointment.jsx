import DoctorSelectionCard from '../../components/common/DoctorSelectionCard.jsx'
import AppointmentAvailability from './AppointmentAvailability.jsx'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import { bookingDoctors } from './bookingAvailabilityDemo.js'
import { getBookingMother, readSlotReservations, slotIsPending, submitBookingRequest } from '../../services/motherBookingRequests.js'
import './BookAppointment.css'

export default function BookAppointment() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const [mother] = useState(() => getBookingMother())
  const [values, setValues] = useState({ childId: '', doctorId: '', date: '', time: '', reason: '' })
  const [now, setNow] = useState(() => new Date())
  const [initialStorage] = useState(() => {
    try { return { records: readSlotReservations(mother), ready: true } } catch { return { records: [], ready: false } }
  })
  const [error, setError] = useState(initialStorage.ready ? '' : 'storageError')
  const [records, setRecords] = useState(initialStorage.records)
  const [storageReady, setStorageReady] = useState(initialStorage.ready)
  const bt = key => t('mother.booking.' + key)
  const locale = language === 'ar' ? 'ar-JO' : 'en-US'
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])
  const child = mother.children.find(item => item.id === values.childId)
  const doctor = bookingDoctors.find(item => item.id === values.doctorId)
  const isReserved = (date, time) => slotIsPending(mother, records, values.doctorId, date, time)
  const childName = item => item?.nameKey ? t('mother.' + item.nameKey) : item?.name || bt('notSelected')
  const dateLabel = values.date ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(values.date + 'T00:00:00')) : bt('notSelected')
  const timeLabel = time => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date('2000-01-01T' + time + ':00'))
  function change(name, value) {
    setError('')
    setValues(previous => ({ ...previous, [name]: value, ...(name === 'doctorId' ? { date: '', time: '' } : name === 'date' ? { time: '' } : {}) }))
  }
  function submit(event) {
    event.preventDefault()
    try {
      submitBookingRequest(mother, values)
      navigate('/mother/appointments?tab=pending', { state: { bookingSuccess: true } })
    } catch (failure) {
      setError(['invalidBooking', 'duplicateRequest', 'storageError'].includes(failure.message) ? failure.message : 'storageError')
      try { setRecords(readSlotReservations(mother)) } catch { setStorageReady(false) }
    }
  }
  return <section className="mother-booking" aria-labelledby="mother-booking-title">
    <header className="mother-booking__heading"><h1 id="mother-booking-title">{t('mother.appointmentsPage.bookAppointment')}</h1><Button variant="secondary" onClick={() => navigate('/mother/appointments')}>{bt('back')}</Button></header>
    <p className="mother-booking__notice">{bt('demoNotice')}</p>
    <form onSubmit={submit}>
      <Card>
        <label className="mother-booking__field" htmlFor="booking-child">{bt('child')}<select id="booking-child" required value={values.childId} onChange={event => change('childId', event.target.value)}><option value="">{bt('chooseChild')}</option>{mother.children.map(item => <option key={item.id} value={item.id}>{childName(item)}</option>)}</select></label>
        {mother.children.length === 0 && <p>{bt('noChildren')}</p>}
        <fieldset><legend>{bt('doctor')}</legend><div className="nomu-doctor-grid">{bookingDoctors.map(item => <DoctorSelectionCard key={item.id} doctor={item} selected={values.doctorId === item.id} onSelect={() => change('doctorId', item.id)}/>)}</div></fieldset>
        {doctor && <AppointmentAvailability doctorId={values.doctorId} date={values.date} time={values.time} now={now} isReserved={isReserved} onChange={change}/>}
        <label className="mother-booking__field" htmlFor="booking-reason">{bt('reason')}<textarea id="booking-reason" required maxLength={1000} rows={4} value={values.reason} onChange={event => change('reason', event.target.value)}/></label>
      </Card>
      <Card className="mother-booking__summary"><h2>{bt('summary')}</h2><dl>{[[bt('child'), childName(child)], [bt('doctor'), doctor ? (language === 'ar' ? doctor.nameAr : doctor.name) : bt('notSelected')], [bt('date'), dateLabel], [bt('time'), values.time ? timeLabel(values.time) : bt('notSelected')], [bt('reason'), values.reason.trim() || bt('notSelected')]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}</dl><p>{bt('approvalNote')}</p>
        {error && <p role="alert" className="mother-booking__error">{bt(error)}</p>}
        <Button type="submit" disabled={!storageReady || mother.children.length === 0}>{bt('submit')}</Button>
      </Card>
    </form>
  </section>
}
