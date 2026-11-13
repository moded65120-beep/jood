import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUp, ArrowLeft, ArrowRight, Activity, HeartPulse, Users, Stethoscope, Sparkles, Info } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext.jsx'
import LanguageSwitcher from '../components/common/LanguageSwitcher.jsx'
import nomuLogo from '../assets/mother/nomu-logo-transparent-test.png'
import UnifiedLoginForm from '../components/common/UnifiedLoginForm.jsx'
import NemoAuthScreen from '../components/common/NemoAuthScreen.jsx'
import NemoAboutModal from '../components/common/NemoAboutModal.jsx'
import useNemoGestures from '../hooks/useNemoGestures.js'
import usePublicNavigation from '../hooks/usePublicNavigation.js'
import './Home.css'
import './PublicPages.css'

// Temporarily hidden at the user's request; retain the modal for later reuse.
const SHOW_ABOUT_BUTTON = false
// Local preview only: set false to restore the original illustration.
const USE_PASTEL_FAMILY_PREVIEW = true
const familyIllustration = USE_PASTEL_FAMILY_PREVIEW ? 'nomu-family-pastel-preview.png' : 'nemo-family-flat.png'

export default function Home({ loginMode = false, initialAudience = null, initialPortalOpen = false }) {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const [portalOpen, setPortalOpen] = useState(initialPortalOpen || Boolean(initialAudience))
  const [authScreen, setAuthScreen] = useState(initialAudience)
  const [authLeaving, setAuthLeaving] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const closeAbout = useCallback(() => setAboutOpen(false), [])
  const locked = useRef(false)
  const actions = useRef(null)
  const publicRoot = useRef(null)
  const { go: openAbout, leaving: publicLeaving } = usePublicNavigation(publicRoot, { direction: 'up', to: '/about', enabled: !loginMode && !authScreen && !portalOpen })
  useEffect(() => {
    if (loginMode || typeof document === 'undefined') return
    const previousTitle = document.title
    document.title = t('home.nemo.pageTitle')
    return () => { document.title = previousTitle }
  }, [loginMode, t])
  const changeScreen = useCallback((next) => {
    if (locked.current) return false
    locked.current = true
    if (loginMode) { setPortalOpen(false); navigate('/') }
    else setPortalOpen(next)
    return true
  }, [loginMode, navigate])

  useEffect(() => {
    if (authScreen) locked.current = true
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => {
      locked.current = false
      if (portalOpen && !loginMode && !authScreen) actions.current?.querySelector('button')?.focus({ preventScroll: true })
    }, reduced ? 0 : 780)
    return () => window.clearTimeout(timer)
  }, [portalOpen, loginMode, authScreen])

  useEffect(() => {
    if (!authLeaving) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => {
      setAuthScreen(null); setAuthLeaving(false)
    }, reduced ? 0 : 780)
    return () => window.clearTimeout(timer)
  }, [authLeaving])

  const returnHome = useCallback(() => {
    if (authLeaving || locked.current) return false
    if (authScreen) {
      setPortalOpen(false)
      setAuthLeaving(true)
      return true
    } else return changeScreen(false)
  }, [authScreen, authLeaving, changeScreen])
  const swipeUp = useCallback(() => changeScreen(true), [changeScreen])
  useNemoGestures({
    mode: loginMode || authLeaving || aboutOpen ? 'disabled' : authScreen ? 'auth' : portalOpen ? 'portals' : 'disabled',
    onUp: swipeUp,
    onDown: returnHome,
  })

  return <div ref={publicRoot} className={`nomu-home${publicLeaving ? ' public-home--leaving' : ''}${loginMode ? ' nomu-home--login' : ' nemo-landing'}${!SHOW_ABOUT_BUTTON ? ' nemo-landing--without-about' : ''}${portalOpen ? ' nemo-landing--ready' : ''}${authScreen ? ' nemo-landing--auth' : ''}`} lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'}>
    {!loginMode && <div className="nemo-atmosphere" aria-hidden="true"><i /><i /><i /></div>}
    <header className="nomu-home__header">
      <Link className="nomu-home__brand" to="/" onClick={() => { if (!loginMode) { setAuthScreen(null); setAuthLeaving(false); setPortalOpen(false) } }} aria-label={t('home.brandHome')}><img src={nomuLogo} alt="nomu | نمو" /></Link>
      <div className="nemo-header-actions">
        <LanguageSwitcher />
      </div>
    </header>
    {loginMode ? <main className="nomu-home__stage"><div className="nomu-home__login">
      <button type="button" className="nomu-home__back" onClick={() => changeScreen(false)}><ArrowLeft aria-hidden="true" />{t('home.backWelcome')}</button>
      <UnifiedLoginForm />
    </div></main> : <main className="nemo-main" inert={Boolean(authScreen)} aria-hidden={Boolean(authScreen)}>
      <div className="nemo-hero" inert={portalOpen} aria-hidden={portalOpen}>
        <div className="nemo-copy">
          <span className="nemo-eyebrow"><span aria-hidden="true" />{t('home.nemo.eyebrow')}</span>
          <h1>{t('home.nemo.heading')}<br /><span>{t('home.nemo.headingAccent')}<svg viewBox="0 0 340 18" preserveAspectRatio="none" aria-hidden="true"><path d="M5 13Q160 0 335 10" /></svg></span></h1>
          <div className="nemo-highlights"><span><Activity aria-hidden="true" />{t('home.growth')}</span><span><HeartPulse aria-hidden="true" />{t('home.nemo.milestones')}</span></div>
          <div className="nemo-care-note"><span className="nemo-care-note__icon"><Sparkles aria-hidden="true" /></span><span>{t('home.nemo.careNote')}</span></div>
          <div className="nomu-home-role-entry"><p>{t('publicNavigation.choose')}</p><div className="nomu-home-role-links"><Link to="/login" state={{ audience: 'doctor' }} className="nomu-home-role-link nomu-home-role-link--doctor"><Stethoscope aria-hidden="true"/>{t('publicNavigation.staff')}<ArrowRight className="nomu-home-role-arrow" aria-hidden="true"/></Link><Link to="/login" state={{ audience: 'parent' }} className="nomu-home-role-link nomu-home-role-link--parent"><Users aria-hidden="true"/>{t('publicNavigation.parent')}<ArrowRight className="nomu-home-role-arrow" aria-hidden="true"/></Link></div></div>
        </div>
        <div className="nemo-visual">
          <span className="nemo-orbit nemo-orbit--blue" aria-hidden="true" /><span className="nemo-orbit nemo-orbit--orange" aria-hidden="true" />
          <figure className="nemo-family"><img src={`${import.meta.env.BASE_URL}images/home/${familyIllustration}`} alt={t('home.nemo.imageAlt')} width="2170" height="725" draggable={false} fetchPriority="high" /></figure>
          <span className="nemo-plus" aria-hidden="true">+</span><span className="nemo-dot" aria-hidden="true" />
          <aside className="nemo-chat" aria-label={t('home.nemo.track')}>
            <div className="nemo-chat__label"><span className="nemo-chat__spark" aria-hidden="true"><Activity /></span>{t('home.nemo.track')}</div>
            <div className="nemo-chat__bubble" aria-hidden="true"><i /><i /><i /></div>
          </aside>
          <div className="nemo-photo-note"><span aria-hidden="true"><HeartPulse /></span><span>{t('home.nemo.together')}</span></div>
        </div>
      </div>
      <div className="nemo-entry">
        <div className="nemo-swipe" inert={portalOpen} aria-hidden={portalOpen}>
          <button className="nomu-home__continue" type="button" onClick={openAbout}><span className="nemo-swipe__arrows" aria-hidden="true"><ArrowUp /><ArrowUp /></span><span>{t('publicNavigation.upAbout')}</span></button>
        </div>
        <div id="nemo-portal-actions" ref={actions} className="nemo-portal-actions" inert={!portalOpen} aria-hidden={!portalOpen}>
          <p>{t('home.nemo.choose')}</p>
          <div><button type="button" className="nemo-parent" onClick={() => setAuthScreen('parent')}><Users aria-hidden="true" />{t('home.nemo.parent')}<ArrowRight aria-hidden="true" /></button><button type="button" className="nemo-doctor" onClick={() => setAuthScreen('doctor')}><Stethoscope aria-hidden="true" />{t('home.nemo.doctor')}<ArrowRight aria-hidden="true" /></button></div>
          <button type="button" className="nemo-entry-back" onClick={() => changeScreen(false)}>{t('common.back')}</button>
        </div>
      </div>
    </main>}
    {!loginMode && authScreen && <NemoAuthScreen key={authScreen} audience={authScreen} leaving={authLeaving} onBack={returnHome} />}
    {!loginMode && <svg className="nemo-bottom-oval" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0Q720 250 1440 0V160H0Z" fill="#dbeafe" fillOpacity=".5" /><path d="M100 32Q300 92 490 108" fill="none" stroke="#f59e42" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>}
    {SHOW_ABOUT_BUTTON && !loginMode && <div className="nemo-about-anchor" inert={portalOpen || Boolean(authScreen)} aria-hidden={portalOpen || Boolean(authScreen)}>
      <div className="nemo-about-float">
        <button className="nemo-about-trigger" type="button" onClick={() => setAboutOpen(true)} aria-haspopup="dialog"><span className="nemo-about-tail" aria-hidden="true" /><Info aria-hidden="true" /><span>{t('home.about.button')}</span></button>
      </div>
    </div>}
    {aboutOpen && <NemoAboutModal onClose={closeAbout} />}
  </div>
}
