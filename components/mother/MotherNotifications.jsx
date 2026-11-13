import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { getBookingMother } from '../../services/motherBookingRequests.js'
import { syncMotherNotifications, markMotherNotificationsRead, motherNotificationEvents } from '../../services/motherNotifications.js'
import './MotherNotifications.css'

// Presentation-only helpers; notification events and read state remain in the existing service.
function relativeCreationTime(value, locale) {
  const seconds = Math.min(0, Math.round((Date.parse(value) - Date.now()) / 1000))
  const [unit, divisor] = Math.abs(seconds) < 60 ? ['second', 1] : Math.abs(seconds) < 3600 ? ['minute', 60] : Math.abs(seconds) < 86400 ? ['hour', 3600] : ['day', 86400]
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(Math.round(seconds / divisor), unit)
}
function NotificationTypeIcon({ type }) {
  // Inline Lucide Calendar, CalendarClock, and Clock geometry.
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type.startsWith('reminder') ? <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></> : <><path d="M8 2v4m8-4v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/>{type.startsWith('reschedule') ? <><circle cx="15" cy="16" r="4"/><path d="M15 14v2l1 1"/></> : <path d="m9 16 2 2 4-4"/>}</>}
  </svg>
}

export default function MotherNotifications() {
  const { language, t } = useLanguage()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [mother] = useState(() => getBookingMother())
  const [records, setRecords] = useState([])
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const root = useRef(null)
  const bell = useRef(null)
  const panel = useRef(null)
  const nt = key => t('mother.notifications.' + key)
  const locale = language === 'ar' ? 'ar-JO' : 'en-US'
  const direction = language === 'ar' ? 'rtl' : 'ltr'
  const format = value => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value))
  const unread = records.filter(item => !item.read).length
  useEffect(() => {
    const refresh = () => {
      try { setRecords(syncMotherNotifications(mother)); setFailed(false) } catch { setFailed(true) }
    }
    const visible = () => { if (document.visibilityState === 'visible') refresh() }
    refresh()
    const timer = setInterval(visible, 30000)
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', visible)
    return () => { clearInterval(timer); window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visible) }
  }, [mother, pathname, search])
  useEffect(() => {
    if (!open) return
    panel.current?.querySelector('button')?.focus()
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  function markRead(id) {
    try { setRecords(markMotherNotificationsRead(mother, id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))); setFailed(false); return true } catch { setFailed(true); return false }
  }
  return <div className="mother-notifications" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); bell.current?.focus() } }}>
    <button type="button" className="mother-notifications__bell" ref={bell} onClick={() => setOpen(previous => !previous)} aria-label={nt('bell') + ' — ' + new Intl.NumberFormat(locale).format(unread) + ' ' + nt('unread')} aria-expanded={open} aria-controls="mother-notification-panel" aria-haspopup="dialog">
      {/* Lucide Bell icon, inline to match the existing SVG icon approach. */}
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .738-1.674C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>
      {unread > 0 && <span className="mother-notifications__badge" aria-hidden="true">{new Intl.NumberFormat(locale).format(unread)}</span>}
    </button>
    {open && <section className="mother-notifications__panel" lang={language} dir={direction} ref={panel} id="mother-notification-panel" role="dialog" aria-modal="false" aria-labelledby="mother-notification-title">
      <header><h2 id="mother-notification-title">{nt('title')}</h2><button type="button" onClick={() => { setOpen(false); bell.current?.focus() }} aria-label={nt('close')}>×</button></header>
      <button type="button" className="mother-notifications__mark" disabled={!unread} onClick={() => markRead()}>{nt('markAll')}</button>
      {failed && <p role="alert">{nt('storageError')}</p>}
      <p className="mother-notifications__note">{nt('timingNote')}</p>
      {records.length === 0 ? <p role="status">{nt('empty')}</p> : <ul>{records.map(item => <li key={item.id}><button type="button" className={'mother-notifications__item' + (!item.read ? ' is-unread' : '')} data-kind={item.type.startsWith('reschedule') ? 'reschedule' : 'booking'} onClick={() => { if (markRead(item.id)) { setOpen(false); navigate('/mother/appointments?tab=' + motherNotificationEvents[item.type].tab) } }}>
        <span className="mother-notifications__type-icon"><NotificationTypeIcon type={item.type}/></span>
        <span className="mother-notifications__content" dir={direction}>
          <span className="mother-notifications__title"><strong dir={direction}>{nt(item.type + 'Title')}</strong>{!item.read && <span className="mother-notifications__unread-dot" aria-hidden="true"/>}</span>
          <span className="mother-notifications__description" dir={direction}><bdi className="mother-notifications__child" dir="auto">{t('mother.' + item.childId)}</bdi>{' '}&middot;{' '}<bdi dir={direction}>{nt(item.type + 'Description')}</bdi></span>
          <span className="mother-notifications__appointment"><time dateTime={item.dateTime} aria-label={nt('appointmentTime')}><bdi dir={direction}>{format(item.dateTime)}</bdi></time></span>
          {item.originalDateTime && <small className="mother-notifications__original" dir={direction}><bdi dir={direction}>{t('mother.reschedule.originalTime')}:</bdi>{' '}<bdi dir={direction}>{format(item.originalDateTime)}</bdi></small>}
          <time className="mother-notifications__created" dir={direction} dateTime={item.createdAt} title={nt('created') + ': ' + format(item.createdAt)}><bdi dir={direction}>{relativeCreationTime(item.createdAt, locale)}</bdi></time>
          <span className="mother-notifications__sr-only">{nt(item.read ? 'read' : 'unread')}</span>
        </span>
      </button></li>)}</ul>}
    </section>}
  </div>
}
