import { activeDoctorName } from '../../services/doctorDirectory.js'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import PortalIcon from '../../components/mother/PortalIcon.jsx'
import ParentingTips from '../../components/mother/ParentingTips.jsx'
import PortalChildCard from '../../components/mother/PortalChildCard.jsx'
import { portalChildren, getScheduledFollowUps } from './motherPortalData.js'
import { useState } from 'react'
import './MotherDashboard.css'

export default function LegacyMotherHome() {
  const { t, language } = useLanguage()
  const [now] = useState(() => new Date())
  const appointments = getScheduledFollowUps(now).filter(item => item.period === 'upcoming')
  const locale = language === 'ar' ? 'ar-JO' : 'en-US'
  const dateFormatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' })
  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true })
  return <div className="portal-page portal-home">
    <section className="portal-welcome" aria-labelledby="dashboard-title"><div><p className="portal-eyebrow">{t('mother.dashboardEyebrow')}</p><h1 id="dashboard-title">{t('mother.welcome')}</h1><p>{t('mother.welcomeSubtitle')}</p></div><Link to="/mother/children" className="portal-welcome-link">{t('mother.myChildren')}<PortalIcon name="arrow"/></Link></section>
    <section aria-labelledby="children-title"><div className="portal-section-heading"><div><p className="portal-eyebrow">{t('portal.yourFamily')}</p><h2 id="children-title">{t('mother.myChildren')}</h2></div><Link to="/mother/children">{t('mother.viewAll')}<PortalIcon name="chevron"/></Link></div><div className="portal-child-grid">{portalChildren.length ? portalChildren.map(child => <PortalChildCard key={child.id} child={child}/>) : <p className="portal-empty">{t('mother.booking.noChildren')}</p>}</div></section>
    <section className="mother-panel mother-appointments" aria-labelledby="appointments-title">
      <div className="mother-section-heading"><h2 id="appointments-title"><PortalIcon name="calendar"/>{t('mother.upcomingAppointments')}</h2><Link className="mother-view-all" to="/mother/appointments">{t('mother.viewAll')}<PortalIcon name="chevron"/></Link></div>
      <div className="mother-appointment-list">{appointments.length ? appointments.map(item => <article className={'mother-appointment mother-tone-' + (portalChildren.find(child => child.id === item.childKey)?.tone || 'blue')} key={item.id}>
        <span className="mother-appointment-badge"><PortalIcon name="calendar"/></span>
        <div className="mother-appointment-child"><h3>{t('mother.' + item.childKey)}</h3><p>{t('mother.followUpVisit')}</p></div>
        <div className="mother-appointment-date"><PortalIcon name="calendar"/><div><p><bdi>{dateFormatter.format(new Date(item.dateTime))}</bdi></p><span><bdi>{timeFormatter.format(new Date(item.dateTime))}</bdi></span></div></div>
        <div className="mother-appointment-doctor"><PortalIcon name="user"/><div><h3>{activeDoctorName(item.doctorKey, language, t('mother.' + item.doctorKey))}</h3><p>{t('mother.pediatrician')}</p></div></div>
        <Link className="mother-appointment-button" to={'/mother/children/' + item.childKey + '/follow-up-visits'}>{t('mother.viewDetails')}</Link>
      </article>) : <p className="portal-empty">{t('portal.noAppointments')}</p>}</div>
    </section>
    <ParentingTips/>
  </div>
}
