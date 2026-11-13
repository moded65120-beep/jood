import useUnifiedDemoUser from '../../hooks/useUnifiedDemoUser.js'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { initials, motherProfile } from '../../pages/mother/motherPortalData.js'
import useMotherLogout from '../../hooks/useMotherLogout.js'
import PortalIcon from './PortalIcon.jsx'

export default function MotherProfileDropdown() {
  const { t } = useLanguage()
  const authenticatedUser = useUnifiedDemoUser()
  const handleLogout = useMotherLogout()
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  const logout = useRef(null)
  const name = authenticatedUser?.name || t('mother.' + motherProfile.nameKey)
  useEffect(() => {
    if (!open) return
    logout.current?.focus()
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  function closeWithFocus() { setOpen(false); trigger.current?.focus() }
  return <div className="mother-profile-dropdown" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); closeWithFocus() }
    if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); logout.current?.focus() }
  }}>
    <button type="button" className="mother-account" ref={trigger} aria-label={t('parentingTips.accountMenu') + ': ' + name} aria-expanded={open} aria-controls="mother-profile-menu" aria-haspopup="menu" onClick={() => setOpen(previous => !previous)} onKeyDown={event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true) } }}><span className="mother-account-avatar" aria-hidden="true">{initials(name)}</span><span className="mother-account-copy"><strong>{name}</strong><span>{authenticatedUser ? t('unifiedLogin.roles.' + authenticatedUser.role) : t('mother.portal')}</span></span><PortalIcon name="down"/></button>
    {open && <div id="mother-profile-menu" className="mother-profile-menu" role="menu" aria-label={t('parentingTips.accountMenu')}><p role="presentation">{name}</p><Link ref={logout} role="menuitem" to="/mother/login" replace onClick={event => { setOpen(false); handleLogout(event) }}><PortalIcon name="logout"/>{t('mother.logout')}</Link></div>}
  </div>
}
