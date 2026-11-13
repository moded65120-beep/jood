import { useRef, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import DoctorModal from './DoctorModal.jsx'
import { clinicalNoteFields, clinicalNoteTypes, validateClinicalNote } from './clinicalNotesData.js'
import { localVisitDate } from './medicalVisitData.js'
import { formatDate } from './patientData.js'
import './NewMedicalVisit.css'
import './MedicalNotes.css'

export default function NewMedicalNoteModal({ patient, onSave, onClose, note = null }) {
  const { language, t } = useLanguage()
  const n = key => t(`doctor.notesDiagnosis.${key}`)
  const editing = Boolean(note)
  const [draft, setDraft] = useState(() => ({ id: note?.id || `${patient.id}:${crypto.randomUUID()}`, type: note?.type || '', date: note?.date || localVisitDate(), diagnosis: note?.diagnosis || '', observations: note?.observations || '', plan: note?.plan || '', visitId: note?.visitId || '' }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const submitted = useRef(false)
  const formRef = useRef(null)
  function change(event) {
    const { name, value } = event.target
    setDraft(previous => ({ ...previous, [name]: value }))
    setErrors(previous => ({ ...previous, [name]: undefined, ...(name === 'type' ? { diagnosis: undefined, observations: undefined } : {}) }))
    setSaveError(false)
  }
  function submit(event) {
    event.preventDefault()
    if (submitted.current) return
    const nextErrors = validateClinicalNote(draft, patient)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) { formRef.current?.elements.namedItem(Object.keys(nextErrors)[0])?.focus(); return }
    submitted.current = true
    setSaving(true)
    if (!onSave(patient.id, draft)) { submitted.current = false; setSaving(false); setSaveError(true) }
  }
  const props = name => ({ id: `clinical-note-${name}`, name, value: draft[name], onChange: change, 'aria-invalid': errors[name] ? true : undefined, 'aria-describedby': errors[name] ? `clinical-note-${name}-error` : undefined })
  const error = name => errors[name] && <small id={`clinical-note-${name}-error`} className="dnv-field-error" role="alert">{n(errors[name])}</small>
  return (
    <DoctorModal title={n(editing ? 'edit' : 'add')} className="dnv-modal dmn-modal" onClose={onClose}>
      <form ref={formRef} className="dnv-form" onSubmit={submit} noValidate>
        <div className="dnv-form-body">
          <dl className="dnv-child"><div><dt>{t('doctor.childName')}</dt><dd><bdi>{patient.name}</bdi></dd></div><div><dt>{t('doctor.medicalFile')}</dt><dd><bdi>{patient.file}</bdi></dd></div></dl>
          <div className="dnv-grid">
            <label htmlFor="clinical-note-type">{n('type')} *<select {...props('type')} required><option value="">{n('chooseType')}</option>{clinicalNoteTypes.map(type => <option key={type} value={type}>{n(`types.${type}`)}</option>)}</select>{error('type')}</label>
            <label htmlFor="clinical-note-date">{n('date')} *<input {...props('date')} type="date" required readOnly={editing} min={patient.dateOfBirth} max={localVisitDate()} />{error('date')}</label>
            {clinicalNoteFields.map(field => {
              const required = field === 'diagnosis' && draft.type === 'diagnosis' || field === 'observations' && draft.type === 'observation'
              return <label className="dnv-full" htmlFor={`clinical-note-${field}`} key={field}>{n(field)}{required ? ' *' : ` (${n('optional')})`}<textarea {...props(field)} required={required} rows="2" dir="auto" maxLength="4000" placeholder={n(`${field}Placeholder`)} />{error(field)}</label>
            })}
            <label className="dnv-full" htmlFor="clinical-note-visitId">{n('linkedVisit')} ({n('optional')})<select {...props('visitId')} disabled={editing}><option value="">{n('noVisitLink')}</option>{editing && draft.visitId && !(patient.medicalVisits || []).some(visit => visit.id === draft.visitId) && <option value={draft.visitId}>{draft.visitId} — {n('visitUnavailable')}</option>}{(patient.medicalVisits || []).map(visit => <option value={visit.id} key={visit.id}>{formatDate(visit.date, language)} — {t(`doctor.newVisit.types.${visit.type}`)}</option>)}</select>{error('visitId')}</label>
          </div>
          <p className="dnv-demo">{n('mockNotice')}</p>
          {saveError && <p className="dd-error" role="alert">{n('saveError')}</p>}
        </div>
        <footer className="dd-modal-actions dnv-footer"><button className="dd-button" type="button" onClick={onClose}>{t('common.cancel')}</button><button className="dd-record-button" type="submit" disabled={saving}>{n(saving ? 'saving' : editing ? 'update' : 'save')}</button></footer>
      </form>
    </DoctorModal>
  )
}
