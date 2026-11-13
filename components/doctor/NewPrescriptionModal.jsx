import { useRef, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import DoctorModal from './DoctorModal.jsx'
import { prescriptionFields, prescriptionRequiredFields, prescriptionRoutes, validatePrescription } from './prescriptionData.js'
import './NewMedicalVisit.css'
import './Prescriptions.css'

export default function NewPrescriptionModal({ patient, onSave, onClose }) {
  const { t } = useLanguage()
  const p = key => t(`doctor.prescription.${key}`)
  const [draft, setDraft] = useState(() => ({
    id: crypto.randomUUID(), ...Object.fromEntries(prescriptionFields.map(field => [field, ''])),
  }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
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
    const nextErrors = validatePrescription(draft)
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

  return (
    <DoctorModal title={p('add')} onClose={onClose} className="dnv-modal drx-modal">
      <form ref={formRef} className="dnv-form" onSubmit={submit} noValidate>
        <div className="dnv-form-body">
          <dl className="dnv-child">
            <div><dt>{t('doctor.childName')}</dt><dd><bdi>{patient.name}</bdi></dd></div>
            <div><dt>{t('doctor.medicalFile')}</dt><dd><bdi>{patient.file}</bdi></dd></div>
          </dl>
          <div className="dnv-grid">
            {prescriptionFields.map(field => {
              const required = prescriptionRequiredFields.includes(field)
              const props = {
                id: `prescription-${field}`, name: field, value: draft[field], onChange: change, required,
                'aria-invalid': errors[field] ? true : undefined,
                'aria-describedby': [field === 'dosage' && 'prescription-dosage-help', errors[field] && `prescription-${field}-error`].filter(Boolean).join(' ') || undefined,
              }
              return (
                <label key={field} htmlFor={props.id} className={['medication', 'route', 'instructions'].includes(field) ? 'dnv-full' : ''}>
                  {`${p(field)}${required ? ' *' : ''}`}
                  {field === 'route' ? <select {...props}><option value="">{p('chooseRoute')}</option>{prescriptionRoutes.map(route => <option key={route} value={route}>{p(`routes.${route}`)}</option>)}</select>
                    : field === 'instructions' ? <textarea {...props} rows="2" maxLength="4000" placeholder={p(`${field}Placeholder`)} dir="auto" />
                      : <input {...props} maxLength="300" placeholder={p(`${field}Placeholder`)} dir="auto" autoFocus={field === 'medication'} />}
                  {field === 'dosage' && <small id="prescription-dosage-help">{p('dosageHelp')}</small>}
                  {errors[field] && <small className="dnv-field-error" id={`prescription-${field}-error`} role="alert">{p(errors[field] === 'required' ? `requiredFields.${field}` : errors[field])}</small>}
                </label>
              )
            })}
          </div>
          <p className="dnv-demo">{p('mockNotice')}</p>
          {saveError && <p className="dd-error" role="alert">{p('saveError')}</p>}
        </div>
        <footer className="dd-modal-actions dnv-footer"><button type="button" className="dd-button" onClick={onClose}>{t('common.cancel')}</button><button type="submit" className="dd-record-button" disabled={saving}>{p(saving ? 'saving' : 'save')}</button></footer>
      </form>
    </DoctorModal>
  )
}
