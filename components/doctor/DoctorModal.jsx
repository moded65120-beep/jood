import { useEffect, useId, useRef } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'

export default function DoctorModal({ title, children, onClose, className = '' }) {
  const { language, t } = useLanguage()
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const previous = document.activeElement
    const dialog = ref.current
    dialog.showModal()
    return () => { dialog.close(); previous?.focus() }
  }, [])
  return <dialog ref={ref} className={`dd-modal ${className}`.trim()} lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === ref.current) { const rect = ref.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose() } }}><header><h2 id={titleId}>{title}</h2><button className="dd-icon-button" onClick={onClose} aria-label={t('doctor.closeDialog')}>×</button></header>{children}</dialog>
}
