import { activeDoctorName, activeDoctorSpecialty } from '../../services/doctorDirectory.js'
import { CalendarDays } from 'lucide-react'
import './MotherAppointments.css'
import { useState } from 'react'
import MotherRescheduleModal from '../../components/mother/MotherRescheduleModal.jsx'
import useDemoBookings from '../../hooks/useDemoBookings.js'
import { bookingAppointments, canRescheduleDemoBooking } from '../../services/motherDemoBookings.js'
import { Link, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import PortalIcon from '../../components/mother/PortalIcon.jsx'
import { getScheduledFollowUps } from './motherPortalData.js'

export default function MotherAppointments() {
  const { language, t } = useLanguage()
  const [rescheduleId, setRescheduleId] = useState(null)
  const [rescheduled, setRescheduled] = useState(false)
  const [params, setParams] = useSearchParams()
  const activeTab = params.get('tab') === 'past' ? 'past' : 'upcoming'
  const { records, error, now } = useDemoBookings()
  const appointments = [...getScheduledFollowUps(now), ...bookingAppointments(records, now)].filter(item => item.period === activeTab).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
  if (activeTab === 'past') appointments.reverse()
  const locale = language === 'ar' ? 'ar-JO' : 'en-US'
  const at = key => t('mother.appointmentsPage.' + key)
  const date = value => new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value))
  const time = value => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
  function selectTab(tab) { const next = new URLSearchParams(params); next.set('tab', tab); setParams(next) }
  function handleTabKey(event, index) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index
    selectTab(['upcoming', 'past'][next])
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus()
  }
  return <section className="portal-page" aria-labelledby="appointments-title"><header className="portal-page-heading"><p className="portal-eyebrow">{t('mother.portal')}</p><h1 id="appointments-title">{at('title')}</h1><p>{t('portal.appointmentsSubtitle')}</p></header><p className="portal-info"><PortalIcon name="shield"/>{t('demoBooking.appointmentsNotice')}</p>{error && <p role="alert">{t('demoBooking.storageError')}</p>}{rescheduled && <p role="status">{t('demoReschedule.success')}</p>}<Link className="mother-booking-entry" to="/mother/appointments/book"><span className="mother-booking-entry__icon"><CalendarDays size={24} aria-hidden="true"/></span><span>{at('bookingCardTitle')}</span></Link><div className="portal-tabs" role="tablist" aria-label={at('appointmentGroups')}>{['upcoming', 'past'].map((tab, index) => <button key={tab} type="button" role="tab" id={'appointments-tab-' + tab} aria-selected={activeTab === tab} aria-controls={'appointments-panel-' + tab} tabIndex={activeTab === tab ? 0 : -1} onClick={() => selectTab(tab)} onKeyDown={event => handleTabKey(event, index)}>{at(tab)}</button>)}</div><div role="tabpanel" id={'appointments-panel-' + activeTab} aria-labelledby={'appointments-tab-' + activeTab} tabIndex={0} className="portal-appointment-grid">{appointments.length ? appointments.map(item => <article key={item.id} className={'portal-appointment-card portal-tone-' + (item.childKey === 'adam' ? 'blue' : 'pink')}><header><span className="portal-appointment-icon"><PortalIcon name="calendar"/></span><div><h2>{t('mother.' + item.childKey)}</h2><p>{t(item.demoBooking ? 'demoBooking.demoLabel' : 'mother.followUpVisit')}</p></div><span className="portal-tag">{item.demoBooking ? t('demoBooking.confirmed') : at(item.status)}</span></header><dl><div><dt>{at('date')}</dt><dd><time dateTime={item.dateTime}><bdi>{date(item.dateTime)} &middot; {time(item.dateTime)}</bdi></time></dd></div><div><dt>{at('doctor')}</dt><dd>{activeDoctorName(item.doctorKey, language, t('mother.' + item.doctorKey))}</dd></div>{item.demoBooking ? <><div><dt>{t('demoBooking.clinic')}</dt><dd>{t(item.clinicKey)}</dd></div><div><dt>{t('demoBooking.specialty')}</dt><dd>{activeDoctorSpecialty(item.specialtyKey, language, t('mother.booking.' + item.specialtyKey))}</dd></div></> : <div><dt>{at('reason')}</dt><dd>{at(item.reasonKey)}</dd></div>}</dl><Link to={'/mother/children/' + item.childKey + '/follow-up-visits'}>{t('mother.followUpVisits')}<PortalIcon name="chevron"/></Link>{item.demoBooking && canRescheduleDemoBooking(item, now) && <button type="button" className="demo-booking-secondary demo-reschedule-trigger" onClick={() => { setRescheduled(false); setRescheduleId(item.id) }}>{t('demoReschedule.title')}</button>}</article>) : <div className="portal-empty"><PortalIcon name="calendar"/><h2>{t('portal.noAppointments')}</h2><p>{t('portal.emptyAppointmentsHelp')}</p></div>}</div>{rescheduleId && <MotherRescheduleModal key={rescheduleId} bookingId={rescheduleId} onClose={() => setRescheduleId(null)} onSuccess={() => { setRescheduleId(null); setRescheduled(true) }}/>}</section>
}
