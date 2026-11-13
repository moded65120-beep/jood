import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import './NemoAboutModal.css'

export default function NemoAboutModal({ onClose }) {
  const { language, t } = useLanguage()
  const dialog = useRef(null)
  const timer = useRef(null)
  const pending = useRef(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => {
      window.clearTimeout(timer.current)
      if (element.open) element.close()
    }
  }, [])

  const requestClose = useCallback(() => {
    if (pending.current) return
    pending.current = true
    setClosing(true)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    timer.current = window.setTimeout(() => {
      dialog.current?.close()
      onClose()
    }, reduced ? 0 : 240)
  }, [onClose])

  return <dialog ref={dialog} className={`nemo-about${closing ? ' nemo-about--closing' : ''}`}
    lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'} aria-labelledby="nemo-about-title" aria-describedby="nemo-about-content"
    onCancel={event => { event.preventDefault(); requestClose() }}
    onClick={event => { if (event.target === event.currentTarget) requestClose() }}>
    <section className="nemo-about__panel">
      <header className="nemo-about__header">
        <h2 id="nemo-about-title" dir="auto">{t('home.about.title')}</h2>
        <button className="nemo-about__close" type="button" onClick={requestClose} aria-label={t('home.about.close')} autoFocus><X aria-hidden="true" /></button>
      </header>
      <div id="nemo-about-content" className="nemo-about__content" tabIndex={0}>
        <p>{t('home.about.description')}</p>
      </div>
    </section>
  </dialog>
}
