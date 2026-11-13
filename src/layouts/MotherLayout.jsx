import useUnifiedDemoUser from '../hooks/useUnifiedDemoUser.js'
import { demoMotherId, parentFamilyScope, parentCanViewChild } from '../services/demoChildAccess.js'
import MotherNotifications from '../components/mother/MotherNotifications.jsx'
import { useLanguage } from '../contexts/LanguageContext.jsx'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigationType } from 'react-router-dom'
import PortalIcon from '../components/mother/PortalIcon.jsx'
import MotherProfileDropdown from '../components/mother/MotherProfileDropdown.jsx'
import { beginParentingTipVisit } from '../services/motherParentingTips.js'
import useMotherLogout from '../hooks/useMotherLogout.js'
import nomuLogo from '../assets/mother/nomu-logo-transparent-test.png'
import '../pages/mother/MotherDashboard.css'
import './MotherPortal.css'
import { useMotherScrollRestoration } from '../hooks/useMotherNavigation.js'
import { childSections, getDemoChild } from '../pages/mother/childDemoData.js'
import { UserRound, ClipboardList, Pill, CalendarDays, Syringe, ChartNoAxesColumn, Star, Bot } from 'lucide-react'

const childIcons = { user: UserRound, record: ClipboardList, prescription: Pill, calendar: CalendarDays, vaccine: Syringe, growth: ChartNoAxesColumn, star: Star, assistant: Bot }

export function MotherIcon(props) { return <PortalIcon {...props}/> }
export default function MotherLayout() {
 const main = useMotherScrollRestoration()
 const handleLogout = useMotherLogout()
 const authenticatedUser = useUnifiedDemoUser()
 // Only the legacy family can mount pages/notifications still backed by its fixtures.
 const hasDemoFamily = parentFamilyScope(authenticatedUser) === demoMotherId
 const { pathname, key } = useLocation()
 const childRoute = pathname.match(/^\/mother\/children\/([^/]+)/)
 let deniedChild = false
 if (childRoute) {
   try { deniedChild = !parentCanViewChild(authenticatedUser, decodeURIComponent(childRoute[1])) } catch { deniedChild = true }
 }
 const navigationType = useNavigationType()
 // Run once per portal mount, not when the nested sidebar destination changes.
 useState(() => beginParentingTipVisit(navigationType, key))
 const sections = [['home', 'common.home', '/mother'], ['children', 'mother.myChildren', '/mother/children'], ['calendar', 'navigation.appointments', '/mother/appointments'], ['user', 'mother.profile', '/mother/profile'], ['settings', 'mother.settings', '/mother/settings']]
 const { language, setLanguage, t } = useLanguage()
 const selectedChild = hasDemoFamily && childRoute && !deniedChild ? getDemoChild(decodeURIComponent(childRoute[1])) : undefined
 return <div className="mother-portal" lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'}>
 <aside className="mother-sidebar"><Link className="mother-logo" to="/mother" dir="ltr"><img src={nomuLogo} alt="nomu | نمو"/></Link>
 <nav aria-label={t('mother.navigationLabel')}>{sections.map(([icon, key, to]) => <NavLink key={to} className={({ isActive }) => 'mother-nav-item' + (isActive ? ' is-active' : '')} to={to} end={to === '/mother'}><MotherIcon name={icon}/>{t(key)}</NavLink>)}</nav>
 {selectedChild && <section className="mother-selected-child" aria-labelledby="mother-selected-child-name"><p className="mother-selected-child-label">{t('mother.selectedChild')}</p><h2 id="mother-selected-child-name">{t('mother.' + selectedChild.id)}</h2><nav aria-label={t('mother.medicalNavigation')}>{childSections.map(([id, key, icon]) => {
   const Icon = childIcons[icon]
   const root = '/mother/children/' + selectedChild.id
   return <NavLink key={id} className={({ isActive }) => 'mother-nav-item' + (isActive ? ' is-active' : '')} to={id === 'overview' ? root : root + '/' + id} end><Icon size={21} strokeWidth={1.7} aria-hidden="true"/><span>{t(key)}</span></NavLink>
 })}</nav></section>}
 <Link className="mother-nav-item mother-logout" to="/mother/login" replace onClick={handleLogout}><MotherIcon name="logout"/>{t('mother.logout')}</Link></aside>
 <header className="mother-topbar">{hasDemoFamily && <MotherNotifications/>}<div className="mother-language"><span className="mother-globe"><MotherIcon name="globe"/></span><div className="mother-language-switch" role="group" aria-label={t('common.language')}><button type="button" className={language === 'en' ? 'selected' : ''} lang="en" dir="ltr" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button><button type="button" className={language === 'ar' ? 'selected' : ''} lang="ar" dir="rtl" aria-pressed={language === 'ar'} onClick={() => setLanguage('ar')}>&#1575;&#1604;&#1593;&#1585;&#1576;&#1610;&#1577;</button></div></div><MotherProfileDropdown/></header>
 <main ref={main} className="mother-main" key={key}>{deniedChild || (!hasDemoFamily && pathname.replace(/\/$/, '') !== '/mother') ? <section className="portal-page"><h1>{t('unifiedLogin.parentDashboard')}</h1><p dir="auto">{authenticatedUser?.name || t('mother.sara')}</p><p className="portal-empty">{t('mother.booking.noChildren')}</p></section> : authenticatedUser?.role === 'father' && ['/mother/profile', '/mother/settings'].includes(pathname.replace(/\/$/, '')) ? <section className="portal-page"><h1>{t('unifiedLogin.parentDashboard')}</h1><h2 dir="auto">{authenticatedUser.name}</h2><p>{t('unifiedLogin.fatherProfileLimited')}</p></section> : <Outlet />}</main></div>
}
