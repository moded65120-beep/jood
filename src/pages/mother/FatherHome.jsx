import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import useUnifiedDemoUser from '../../hooks/useUnifiedDemoUser.js'
import { useMotherMedicalRecords } from '../../contexts/MedicalRecordContext.jsx'
import { motherRouteAliases, parentFamilyScope, parentCanViewChild } from '../../services/demoChildAccess.js'
import { ageFromBirthDate, parseRecordDate } from '../../components/doctor/medicalRecordData.js'
import { fatherChildSummary } from '../../services/fatherChildSummary.js'
import useDemoBookings from '../../hooks/useDemoBookings.js'
import { bookingAppointments } from '../../services/motherDemoBookings.js'
import { formatAge, formatDate } from '../../components/doctor/patientData.js'
import { initials } from './motherPortalData.js'
import PortalIcon from '../../components/mother/PortalIcon.jsx'
import ParentingTips from '../../components/mother/ParentingTips.jsx'
import './MotherDashboard.css'

export default function FatherHome() {
  const user = useUnifiedDemoUser()
  const { language, t } = useLanguage()
  const { children, getMedicalRecord } = useMotherMedicalRecords(parentFamilyScope(user))
  const [now] = useState(() => new Date())
  const { records: bookings, now: bookingNow } = useDemoBookings()
  const locale = language === 'ar' ? 'ar-JO' : 'en-GB'
  const date = value => parseRecordDate(value) ? formatDate(value, language) : t('parentHome.notAvailable')
  const name = child => child.id === 'demo-child-lina' ? t('mother.lina') : language === 'ar' ? child.nameAr || child.name : child.name
  const measure = (value, unit) => Number.isFinite(value) ? new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short' }).format(value) : t('parentHome.notAvailable')
  return <div className="portal-page portal-home">
    <section className="portal-welcome" aria-labelledby="dashboard-title"><div><p className="portal-eyebrow">{t('unifiedLogin.parentDashboard')}</p><h1 id="dashboard-title">{t('unifiedLogin.welcome').replace('{name}', user?.name || '')}</h1><p>{t('mother.welcomeSubtitle')}</p></div><Link to="/mother/children" className="portal-welcome-link">{t('mother.myChildren')}<PortalIcon name="arrow"/></Link></section>
    <section aria-labelledby="children-title"><div className="portal-section-heading"><div><p className="portal-eyebrow">{t('portal.yourFamily')}</p><h2 id="children-title">{t('mother.myChildren')}</h2></div><Link to="/mother/children">{t('mother.viewAll')}<PortalIcon name="chevron"/></Link></div>
      <div className="portal-child-grid">{children.length ? children.map(child => {
        const record = getMedicalRecord(child.id)
        const summary = fatherChildSummary(user, child.id, record, bookingAppointments(bookings, bookingNow), bookingNow)
        const followUp = summary?.followUp
        const age = ageFromBirthDate(child.dateOfBirth, now)
        const ageText = age ? [age.years ? formatAge(age.years, 'year', language) : '', age.months || !age.years ? formatAge(age.months, 'month', language) : ''].filter(Boolean).join(' ') : t('parentHome.notAvailable')
        const alias = Object.entries(motherRouteAliases).find(([, id]) => id === child.id)?.[0] || child.id
        const canOpen = parentCanViewChild(user, child.id)
        const gender = child.gender?.toLowerCase()
        const details = [
          ['calendar', t('mother.lastVisit'), summary?.visitDate ? date(summary.visitDate) : t('fatherHome.noVisits')],
          ['height', t('childHealth.height'), measure(summary?.height, 'centimeter')],
          ['weight', t('childHealth.weight'), measure(summary?.weight, 'kilogram')],
          ['doctor', t('mother.lastDoctor'), summary?.doctor || (summary?.doctorKey ? t('mother.' + summary.doctorKey) : t('fatherHome.noDoctor'))],
        ]
        return <article className={'portal-child-card portal-tone-' + (gender === 'female' ? 'pink' : 'blue')} key={child.id}>
          <div className="portal-followup"><span className="portal-followup-icon"><PortalIcon name="calendar"/></span><div><p>{t('demoBooking.nextAppointment')}</p>{followUp ? <><time dateTime={followUp.date}><bdi>{date(followUp.date)}{followUp.time ? ' · ' + new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(`${followUp.date}T${followUp.time}`)) : ''}</bdi></time><span dir="auto">{followUp.doctor || (followUp.doctorKey ? t('mother.' + followUp.doctorKey) : t('fatherHome.noDoctor'))}</span></> : <strong>{t('portal.noFollowUp')}</strong>}</div></div>
          <div className="portal-child-identity"><span className="portal-initials" aria-hidden="true">{initials(name(child))}</span><h3 dir="auto">{name(child)}</h3><p>{ageText} · {['male', 'female'].includes(gender) ? t('parentHome.' + gender) : t('parentHome.notAvailable')}</p></div>
          <dl className="portal-child-facts">{details.map(([icon, label, value]) => <div key={icon}><dt><PortalIcon name={icon}/>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}</dl>
          {canOpen && <Link className="portal-child-link" to={'/mother/children/' + alias}>{t('mother.viewChildDetails')}<PortalIcon name="chevron"/></Link>}
        </article>
      }) : <p className="portal-empty">{t('mother.booking.noChildren')}</p>}</div>
    </section>
    <ParentingTips/>
  </div>
}
