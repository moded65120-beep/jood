import MotherChildHealth from '../../components/mother/MotherChildHealth.jsx'
import ChildDemoBookings from '../../components/mother/ChildDemoBookings.jsx'
import { Link, useParams } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { childSections, getDemoChild } from './childDemoData.js'
import './ChildOverview.css'

function ChildIcon({ name }) {
  const paths = {
    user: 'M4 22v-2a8 8 0 0 1 16 0v2M8 6a4 4 0 1 0 8 0 4 4 0 1 0-8 0',
    record: 'M6 2h9l5 5v15H6ZM14 2v6h6M9 12h8M9 16h8',
    prescription: 'm5 19 14-14a5 5 0 0 0-7-1L4 12a5 5 0 0 0 1 7ZM8 8l8 8',
    calendar: 'M3 5h18v17H3ZM7 2v6M17 2v6M3 11h18M7 15h2m3 0h2m3 0h1',
    vaccine: 'm4 20 14-14M13 4l7 7M16 2l6 6M6 11l7 7M2 22l3-3M9 8l7 7',
    growth: 'M3 21v-6h4v6M10 21V9h4v12M17 21V3h4v18',
    star: 'm12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z',
    assistant: 'M5 7h14v14H5ZM12 3v4M2 12v5M22 12v5M8 12h1m6 0h1M9 17h6',
    age: 'M3 22V11h18v11ZM3 16h18M7 7v4m5-4v4m5-4v4M7 3v1m5-1v1m5-1v1',
    weight: 'M5 8h14l3 14H2ZM8 8V5a4 4 0 0 1 8 0v3M12 12v4',
    height: 'M4 3v18M1 6l3-3 3 3M1 18l3 3 3-3M12 2h8v20h-8ZM12 7h4m-4 5h4m-4 5h4',
    head: 'M7 22v-5a8 8 0 1 1 12-7l3 4h-3v5h-5v3M6 8h11',
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>
}

export default function ChildOverview() {
  const { childId, section = 'overview' } = useParams()
  const { language, t } = useLanguage()
  const child = getDemoChild(childId)
  const selectedSection = childSections.find(([id]) => id === section)
  const locale = language === 'ar' ? 'ar-JO' : 'en-US'
  const date = value => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
  const time = value => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value))
  const measure = (value, unit) => new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: 1 }).format(value)
  const mt = key => t('mother.' + key)
  if (!child || !selectedSection) return <section className="child-page child-not-found"><h1>{mt(!child ? 'childNotFound' : 'sectionNotFound')}</h1><Link to="/mother">{mt('backToChildren')}</Link></section>
  const childHealth = ['vaccinations', 'milestones', 'growth-chart'].includes(section)
  const details = [
    ['age', mt('age'), mt(child.ageKey)],
    ['weight', t('childHealth.weight'), measure(child.weight, 'kilogram')],
    ['height', t('childHealth.height'), measure(child.height, 'centimeter')],
    ['head', t('childHealth.headCircumference'), measure(child.headCircumference, 'centimeter')],
    ['calendar', mt('lastVisit'), date(child.lastVisit)],
    ['user', mt('lastDoctor'), mt(child.doctorKey)],
  ]
  const visitList = status => <section className="child-visit-group"><h3>{mt(status === 'upcoming' ? 'upcomingVisits' : 'previousVisits')}</h3>{child.followUps.filter(visit => visit.status === status).map(visit => <article className="child-readonly-entry" key={visit.date}><p><bdi>{date(visit.date)}</bdi> · <bdi>{time(visit.date)}</bdi></p><p>{mt(visit.doctorKey)}</p></article>)}</section>
  return <div className={'child-page child-theme-' + child.tone}>
    <nav className="child-breadcrumb" aria-label={mt('childBreadcrumb')}><Link to="/mother">{t('common.home')}</Link><span aria-hidden="true">/</span><Link to="/mother/children">{mt('myChildren')}</Link><span aria-hidden="true">/</span><span>{mt(child.id)}</span></nav>
    <div className="child-page-layout">
      <div className={`child-content${childHealth ? ' child-content--health' : ''}`}>
        {!childHealth && <header className="child-profile"><span className="child-profile-avatar" aria-hidden="true">{mt(child.id).trim().split(/\s+/u).map(part => Array.from(part)[0]).slice(0, 2).join('')}</span><div><h1>{mt(child.id)}</h1><p>{mt(child.ageKey)} · {mt(child.genderKey)}</p></div></header>}
        {childHealth ? <MotherChildHealth childId={child.id} section={section} /> : section === 'overview' ? <section className="child-overview-details" aria-label={mt('childOverview')}><dl>{details.map(([icon, label, value], index) => <div className={'child-detail child-detail-' + (['blue', 'pink', 'peach'][index % 3])} key={icon}><span className="child-detail-icon"><ChildIcon name={icon}/></span><div><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div></div>)}</dl></section> : <section className="child-section" aria-labelledby="child-section-title">
          <h2 id="child-section-title">{t(selectedSection[1])}</h2>
          {['medical-record', 'prescriptions', 'follow-up-visits'].includes(section) && <p className="child-section-note">{mt('doctorEnteredReadOnly')}</p>}
          {section === 'medical-record' && <article className="child-readonly-entry"><p><bdi>{date(child.lastVisit)}</bdi> · {mt(child.doctorKey)}</p><dl className="child-record-fields"><div><dt>{mt('diagnosis')}</dt><dd>{mt(child.record.diagnosisKey)}</dd></div><div><dt>{mt('clinicalNotes')}</dt><dd>{mt(child.record.notesKey)}</dd></div></dl></article>}
          {section === 'prescriptions' && <article className="child-readonly-entry"><p><bdi>{date(child.lastVisit)}</bdi> · {mt(child.doctorKey)}</p><dl className="child-record-fields"><div><dt>{mt('medication')}</dt><dd>{mt(child.prescription.medicationKey)}</dd></div><div><dt>{mt('doctorInstructions')}</dt><dd>{mt(child.prescription.instructionsKey)}</dd></div></dl></article>}
          {section === 'follow-up-visits' && <>{visitList('upcoming')}{visitList('previous')}<ChildDemoBookings childId={child.id}/></>}
          {['ai-assistant'].includes(section) && <p className="child-placeholder">{mt('futureSectionPlaceholder')}</p>}
        </section>}
      </div>
    </div>
  </div>
}
