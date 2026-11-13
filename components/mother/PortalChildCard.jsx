import { useState } from 'react'
import useDemoBookings from '../../hooks/useDemoBookings.js'
import { bookingAppointments } from '../../services/motherDemoBookings.js'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { getNextFollowUp, initials } from '../../pages/mother/motherPortalData.js'
import PortalIcon from './PortalIcon.jsx'

export default function PortalChildCard({ child }) {
  const { language, t } = useLanguage()
  const mt = key => t('mother.' + key)
  const locale = language === 'ar' ? 'ar-JO' : 'en-US'
  const [expanded, setExpanded] = useState(false)
  const { records, error, now } = useDemoBookings()
  const followUp = [getNextFollowUp(child.id, now), ...bookingAppointments(records, now).filter(item => item.childId === child.id && item.period === 'upcoming')].filter(Boolean).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))[0]
  const formatDate = value => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
  const measure = (value, unit) => new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short' }).format(value)
  const details = [
    ['calendar', mt('lastVisit'), formatDate(child.lastVisit)],
    ['height', t('childHealth.height'), measure(child.height, 'centimeter')],
    ['weight', t('childHealth.weight'), measure(child.weight, 'kilogram')],
    ['doctor', mt('lastDoctor'), mt(child.doctorKey)],
  ]
  return <article className={'portal-child-card portal-tone-' + child.tone}>
    <div className="portal-followup">
      <span className="portal-followup-icon"><PortalIcon name="calendar"/></span>
      <div><p>{t('demoBooking.nextAppointment')}</p>{followUp ? <><time dateTime={followUp.dateTime}><bdi>{formatDate(followUp.dateTime)} &middot; {new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(followUp.dateTime))}</bdi></time><span>{mt(followUp.doctorKey)}</span>{followUp.demoBooking && <span>{t('demoBooking.confirmed')}</span>}</> : <strong>{t('portal.noFollowUp')}</strong>}</div>
    </div>
    <button className="portal-booking-toggle" type="button" aria-expanded={expanded} aria-controls={'child-booking-' + child.id} aria-label={t('demoBooking.toggle') + ' ' + mt(child.id)} onClick={() => setExpanded(previous => !previous)}><PortalIcon name="plus"/></button>
    <div className={'portal-booking-expander' + (expanded ? ' is-expanded' : '')} id={'child-booking-' + child.id} aria-hidden={!expanded} inert={!expanded}><div><div className="portal-booking-expand-content"><p>{t('demoBooking.cardHint')}</p><Link className="portal-child-link" tabIndex={expanded ? 0 : -1} to={'/mother/appointments/book?child=' + child.id}>{t('mother.appointmentsPage.bookAppointment')}<PortalIcon name="chevron"/></Link></div></div></div>
    {error && <p className="portal-booking-storage-error" role="alert">{t('demoBooking.storageError')}</p>}
    <div className="portal-child-identity"><span className="portal-initials" aria-hidden="true">{initials(mt(child.id))}</span><h3>{mt(child.id)}</h3><p>{mt(child.ageKey)} <span aria-hidden="true">&middot;</span> {mt(child.genderKey)}</p></div>
    <dl className="portal-child-facts">{details.map(([icon, label, value]) => <div key={icon}><dt><PortalIcon name={icon}/>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}</dl>
    <Link className="portal-child-link" to={'/mother/children/' + child.id}>{mt('viewChildDetails')}<PortalIcon name="chevron"/></Link>
  </article>
}
