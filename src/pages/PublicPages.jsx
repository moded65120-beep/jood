import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowDown, ArrowLeft, Stethoscope, UsersRound, FileHeart, ChartNoAxesCombined, CalendarDays, HeartHandshake } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext.jsx'
import LanguageSwitcher from '../components/common/LanguageSwitcher.jsx'
import nomuLogo from '../assets/mother/nomu-logo-transparent-test.png'
import usePublicNavigation from '../hooks/usePublicNavigation.js'
import './PublicPages.css'

export default function PublicPage({ about = false }) {
  const { language, t } = useLanguage()
  const root = useRef(null)
  const title = useRef(null)
  const { pathname } = useLocation()
  const { go, leaving } = usePublicNavigation(root, { direction: 'down', to: '/', enabled: about })
  useEffect(() => { root.current?.scrollTo(0, 0); title.current?.focus({ preventScroll: true }) }, [pathname])
  const pt = key => t('publicNavigation.' + key)
  return <div ref={root} className={'nomu-public-page ' + (about ? 'nomu-public-about' : 'nomu-public-selection') + (leaving ? ' nomu-public-page--leaving' : '')} lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'}>
    <header className="nomu-public-header"><Link to="/" aria-label={t('home.brandHome')}><img src={nomuLogo} alt="nomu | نمو"/></Link><LanguageSwitcher/></header>
    <main className="nomu-public-content"><Link className="nomu-public-back" to="/"><ArrowLeft aria-hidden="true"/>{pt('backHome')}</Link>
      {about ? <>
        <section className="nomu-public-about-hero"><div><p className="nomu-public-eyebrow">{pt('aboutTitle')}</p><h1 ref={title} tabIndex={-1}>{pt('aboutHeadline')}</h1><p className="nomu-public-intro">{pt('introduction')}</p></div><figure><img src={`${import.meta.env.BASE_URL}images/home/nomu-family-pastel-preview.png`} alt={t('home.nemo.imageAlt')} width="2170" height="725"/></figure></section>
        <section className="nomu-public-mission"><span className="nomu-public-mission-icon" aria-hidden="true"><HeartHandshake/></span><div><h2>{pt('mission')}</h2><p>{pt('missionText')}</p></div></section>
        <section><h2>{pt('offers')}</h2><div className="nomu-public-features">{[[FileHeart, 'records'], [ChartNoAxesCombined, 'growth'], [CalendarDays, 'appointments']].map(([Icon, key]) => <article key={key}><Icon aria-hidden="true"/><h3>{pt(key)}</h3><p>{pt(key + 'Text')}</p></article>)}</div></section>
        <button className="nomu-public-down" type="button" onClick={go}><ArrowDown aria-hidden="true"/>{pt('downHome')}</button>
      </> : <><div className="nomu-public-selection-heading"><h1 ref={title} tabIndex={-1}>{pt('welcome')}</h1><p className="nomu-public-intro">{pt('choose')}</p></div><div className="nomu-public-roles">{[[Stethoscope, 'staff', 'doctor'], [UsersRound, 'parent', 'parent']].map(([Icon, key, audience]) => <Link key={key} to="/login" state={{ audience }}><span className="nomu-public-role-icon"><Icon aria-hidden="true"/></span><h2>{pt(key)}</h2><p>{pt(key + 'Text')}</p></Link>)}</div></>}
    </main>
  </div>
}
