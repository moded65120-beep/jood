import { useRef, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import DoctorModal from './DoctorModal.jsx'
import { formatDate } from './patientData.js'

export default function VoidAssessmentModal({ patient, assessment, onConfirm, onClose }) {
  const { language, t } = useLanguage()
  const a = key => t('doctor.clinicalAssessment.' + key)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const submitted = useRef(false)
  function submit(event) {
    event.preventDefault()
    if (submitted.current) return
    if (!reason.trim()) { setError('voidReasonRequired'); return }
    submitted.current = true
    if (!onConfirm(patient.id, assessment.id, reason)) { submitted.current = false; setError('voidError') }
  }
  return <DoctorModal title={a('voidTitle')} onClose={onClose} className="dca-void-modal">
    <dl className="dnv-child"><div><dt>{t('doctor.childName')}</dt><dd><bdi>{patient.name}</bdi></dd></div><div><dt>{a('date')}</dt><dd><bdi>{formatDate(assessment.date, language)}</bdi></dd></div></dl>
    <p>{a('voidWarning')}</p>
    <form onSubmit={submit} noValidate><label className="dca-void-reason">{a('voidReason')} *<textarea dir="auto" required rows="3" autoFocus value={reason} onChange={event => { setReason(event.target.value); setError('') }} aria-invalid={error === 'voidReasonRequired'} aria-describedby={error ? 'dca-void-error' : undefined} /></label>
    {error && <p id="dca-void-error" className="dd-error" role="alert">{a(error)}</p>}
    <div className="dca-actions"><button type="button" className="dd-button" onClick={onClose}>{t('common.cancel')}</button><button type="submit" className="dd-button dca-void-button">{a('confirmVoid')}</button></div></form>
  </DoctorModal>
}
