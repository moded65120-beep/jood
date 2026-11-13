import { useRef, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import DoctorModal from './DoctorModal.jsx'
import { currentAppointment, followUpToday, validateFollowUp } from './followUpData.js'
import { followUpStatus, formatDate } from './patientData.js'
import './NewMedicalVisit.css'
import './FollowUp.css'

export default function FollowUpModal({ patient, onSave, onClose, appointment = currentAppointment(patient) }) {
  const { language, t } = useLanguage()
  const f = key => t(`doctor.followUp.${key}`)
  const [draft, setDraft] = useState(() => ({
    id: appointment?.id || `${patient.id}:${crypto.randomUUID()}`,
    date: appointment?.date || '', time: appointment?.time || '',
    reason: appointment?.reason || '', instructions: appointment?.instructions || '',
  }))
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(false)
  const [saving, setSaving] = useState(false)
  const submitted = useRef(false)
  const formRef = useRef(null)
  const statuses = { Upcoming: 'doctor.upcoming', Overdue: 'doctor.overdue', 'No Follow-up': 'doctor.noFollowUp' }
  function change(event) {
    const { name, value } = event.target
    setDraft(previous => ({ ...previous, [name]: value }))
    setErrors(previous => ({ ...previous, [name]: undefined }))
    setSaveError(false)
  }
  function submit(event) {
    event.preventDefault()
    if (submitted.current) return
    const nextErrors = validateFollowUp(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      formRef.current?.elements.namedItem(Object.keys(nextErrors)[0])?.focus()
      return
    }
    submitted.current = true
    setSaving(true)
    if (!onSave(patient.id, draft)) {
      submitted.current = false
      setSaving(false)
      setSaveError(true)
    }
  }
  const fieldProps = name => ({
    name, id: `follow-up-${name}`, value: draft[name], onChange: change,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `follow-up-${name}-error` : undefined,
  })
  const error = name => errors[name] && <small className="dnv-field-error" id={`follow-up-${name}-error`} role="alert">{f(errors[name])}</small>

  return (
    <DoctorModal title={f('title')} onClose={onClose} className="dnv-modal dfu-modal">
      <form ref={formRef} className="dnv-form" onSubmit={submit} noValidate>
        <div className="dnv-form-body">
          <dl className="dnv-child"><div><dt>{t('doctor.childName')}</dt><dd><bdi>{patient.name}</bdi></dd></div><div><dt>{t('doctor.medicalFile')}</dt><dd><bdi>{patient.file}</bdi></dd></div></dl>
          <p className="dfu-current"><strong>{f('current')}:</strong> {patient.nextFollowUp ? formatDate(patient.nextFollowUp, language) : t('doctor.medicalRecord.notScheduled')} · {t(statuses[followUpStatus(patient)])}</p>
          <div className="dnv-grid">
            <label htmlFor="follow-up-date">{`${f('date')} *`}<input {...fieldProps('date')} type="date" min={followUpToday()} required autoFocus />{error('date')}</label>
            <label htmlFor="follow-up-time">{f('time')}<input {...fieldProps('time')} type="time" />{error('time')}</label>
            <label className="dnv-full" htmlFor="follow-up-reason">{f('reason')}<textarea {...fieldProps('reason')} rows="2" maxLength="4000" placeholder={f('reasonPlaceholder')} dir="auto" /></label>
            <label className="dnv-full" htmlFor="follow-up-instructions">{f('instructions')}<textarea {...fieldProps('instructions')} rows="2" maxLength="4000" placeholder={f('instructionsPlaceholder')} dir="auto" /></label>
          </div>
          <p className="dnv-demo">{f('mockNotice')}</p>
          {saveError && <p role="alert" className="dd-error">{f('saveError')}</p>}
        </div>
        <footer className="dd-modal-actions dnv-footer"><button className="dd-button" type="button" onClick={onClose}>{t('common.cancel')}</button><button className="dd-record-button" type="submit" disabled={saving}>{f(saving ? 'saving' : 'save')}</button></footer>
      </form>
    </DoctorModal>
  )
}
