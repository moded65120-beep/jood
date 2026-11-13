import useUnifiedDemoUser from '../../hooks/useUnifiedDemoUser.js'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { Baby, CalendarDays, MapPin, UsersRound, UserRound, VenusAndMars } from 'lucide-react'
import ParentingTips from '../../components/mother/ParentingTips.jsx'
import { useMotherMedicalRecords } from '../../contexts/MedicalRecordContext.jsx'
import { parentFamilyScope, motherRouteAliases } from '../../services/demoChildAccess.js'
import { ageFromBirthDate, parseRecordDate } from '../../components/doctor/medicalRecordData.js'
import { formatAge, formatDate } from '../../components/doctor/patientData.js'
import './MotherDashboard.css'
import './ParentHome.css'

export default function ParentHome() {
  const { t, language } = useLanguage()
  const authenticatedUser = useUnifiedDemoUser()
  const familyId = parentFamilyScope(authenticatedUser)
  const { children } = useMotherMedicalRecords(familyId)
  const parentName = authenticatedUser?.name || t('mother.sara')
  const unavailable = t('parentHome.notAvailable')
  const headings = [['name', UserRound], ['birthDate', CalendarDays], ['birthPlace', MapPin], ['age', Baby], ['gender', VenusAndMars]]
  const [today] = useState(() => {
    const now = new Date()
    return parseRecordDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)) || now
  })
  const ageLabel = date => {
    const age = ageFromBirthDate(date, today)
    if (!age) return unavailable
    return [age.years ? formatAge(age.years, 'year', language) : '', age.months || !age.years ? formatAge(age.months, 'month', language) : ''].filter(Boolean).join(' ')
  }
  return <div className="portal-page portal-home parent-home">
    <h1 className="parent-home__title">{t('unifiedLogin.parentDashboard')}</h1>
    <section className="parent-home__welcome" aria-labelledby="parent-welcome-title"><h2 id="parent-welcome-title">{t('parentHome.welcomeBefore')} <bdi>{parentName}</bdi>{t('parentHome.welcomeAfter')}</h2><p>{t('parentHome.subtitle')}</p></section>
    <section aria-labelledby="children-title">
      <div className="parent-home__section-heading"><h2 id="children-title">{t('mother.myChildren')}</h2><span className="parent-home__count"><UsersRound aria-hidden="true" size={20}/>{t('parentHome.childCount').replace('{count}', new Intl.NumberFormat(language).format(children.length))}</span></div>
      <div className="parent-home__information"><h3>{t('parentHome.information')}</h3>
        <table className="parent-home__table"><thead><tr>{headings.map(([key, Icon]) => <th key={key} scope="col"><span><Icon size={20} aria-hidden="true"/>{t('parentHome.' + key)}</span></th>)}</tr></thead><tbody>{children.length ? children.map(child => {
          const alias = Object.entries(motherRouteAliases).find(([, id]) => id === child.id)?.[0] || child.id
          const gender = child.gender?.toLowerCase()
          const name = language === 'ar' ? child.nameAr || child.name : child.name
          const birthplace = language === 'ar' ? child.placeOfBirthAr || child.placeOfBirth : child.placeOfBirth
          const values = [child.basicOnly ? <span key="name" dir="auto" style={{ fontWeight: 650 }}>{name || unavailable}</span> : <Link key="name" to={`/mother/children/${encodeURIComponent(alias)}`} dir="auto">{child.name || unavailable}</Link>, parseRecordDate(child.dateOfBirth) ? <bdi key="birthDate">{formatDate(child.dateOfBirth, language)}</bdi> : unavailable, birthplace || unavailable, <bdi key="age">{ageLabel(child.dateOfBirth)}</bdi>, ['male', 'female'].includes(gender) ? <span key="gender" className={'parent-home__gender parent-home__gender--' + gender}>{t('parentHome.' + gender)}</span> : unavailable]
          return <tr key={child.id}>{values.map((value, index) => <td key={headings[index][0]} data-label={t('parentHome.' + headings[index][0])}>{value}</td>)}</tr>
        }) : <tr><td colSpan={5}><p className="portal-empty">{t('mother.booking.noChildren')}</p></td></tr>}</tbody></table>
      </div>
    </section>
    <ParentingTips/>
  </div>
}
