import { useRef, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import DoctorModal from './DoctorModal.jsx'
import { clinicalVisitFields, localVisitDate, validateMedicalVisit, visitTypes } from './medicalVisitData.js'
import './NewMedicalVisit.css'

export default function NewMedicalVisitModal({ patient, onSave, onClose }) {
  const { t } = useLanguage()
  const v = key => t(`doctor.newVisit.${key}`)
  const [draft, setDraft] = useState(() => ({
    id: crypto.randomUUID(), date: localVisitDate(), type: '',
    chiefComplaint: '', diagnosis: '', observations: '', treatment: '', nextFollowUp: '',
  }))
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(false)
  const [saving, setSaving] = useState(false)
  const submitted = useRef(false)
  const formRef = useRef(null)
  function change(event) {
    const { name, value } = event.target
    setDraft(previous => ({ ...previous, [name]: value }))
    setErrors(previous => ({ ...previous, [name]: undefined }))
    setSaveError(false)
  }
  function submit(event) {
    event.preventDefault()
    if (submitted.current) return
    const nextErrors = validateMedicalVisit(draft, patient)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      formRef.current?.elements.namedItem(Object.keys(nextErrors)[0])?.focus()
      return
    }
    submitted.current = true
    setSaving(true)
    // Synchronous mock save; the ref blocks repeated submissions before React rerenders.
    if (!onSave(patient.id, draft)) {
      submitted.current = false
      setSaving(false)
      setSaveError(true)
    }
  }
  const fieldProps = name => ({
    name, id: `new-visit-${name}`, value: draft[name], onChange: change,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `new-visit-${name}-error` : undefined,
  })
  const error = name => errors[name] && <small className="dnv-field-error" id={`new-visit-${name}-error`} role="alert">{v(errors[name])}</small>

  return (
    <DoctorModal title={v('title')} onClose={onClose} className="dnv-modal">
      <form className="dnv-form" ref={formRef} onSubmit={submit} noValidate>
        <div className="dnv-form-body">
        <dl className="dnv-child">
          <div><dt>{t('doctor.childName')}</dt><dd><bdi>{patient.name}</bdi></dd></div>
          <div><dt>{t('doctor.medicalFile')}</dt><dd><bdi>{patient.file}</bdi></dd></div>
        </dl>
        <div className="dnv-grid">
          <label htmlFor="new-visit-date">{`${v('date')} *`}<input {...fieldProps('date')} type="date" required max={localVisitDate()} min={patient.dateOfBirth} autoFocus />{error('date')}</label>
          <label htmlFor="new-visit-type">{`${v('type')} *`}<select {...fieldProps('type')} required><option value="">{v('chooseType')}</option>{visitTypes.map(type => <option key={type} value={type}>{v(`types.${type}`)}</option>)}</select>{error('type')}</label>
          {clinicalVisitFields.map(field => <label className={field === 'chiefComplaint' ? 'dnv-full' : ''} key={field} htmlFor={`new-visit-${field}`}>{v(field)}<textarea {...fieldProps(field)} placeholder={v(`${field}Placeholder`)} rows="2" maxLength="4000" dir="auto" /></label>)}
          <label htmlFor="new-visit-nextFollowUp">{v('nextFollowUp')}<input {...fieldProps('nextFollowUp')} type="date" min={draft.date || undefined} />{error('nextFollowUp')}<small>{v('optional')}</small></label>
        </div>
        <p className="dnv-demo">{v('mockNotice')}</p>
        {saveError && <p role="alert" className="dd-error">{v('saveError')}</p>}
        </div>
        <footer className="dd-modal-actions dnv-footer"><button type="button" className="dd-button" onClick={onClose}>{t('common.cancel')}</button><button className="dd-record-button" type="submit" disabled={saving}>{v(saving ? 'saving' : 'save')}</button></footer>
      </form>
    </DoctorModal>
  )
}
