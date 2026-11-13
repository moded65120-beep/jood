import VoidAssessmentModal from '../../components/doctor/VoidAssessmentModal.jsx'
import { useRef, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import Icon from '../../components/doctor/Icon.jsx'
import DoctorModal from '../../components/doctor/DoctorModal.jsx'
import { assessmentStatus, assessmentsFor, assessmentTypes, validateAssessment } from '../../components/doctor/clinicalAssessmentData.js'
import { localVisitDate } from '../../components/doctor/medicalVisitData.js'
import { formatDate } from '../../components/doctor/patientData.js'
import './ChildClinicalAssessment.css'

export default function ChildClinicalAssessment({ patient, onSaveAssessment, onVoidAssessment, onCancel }) {
  const { language, t } = useLanguage()
  const a = key => t('doctor.clinicalAssessment.' + key)
  const blank = () => ({ id: crypto.randomUUID(), date: localVisitDate(), type: '', findings: '', diagnosis: '', plan: '' })
  const [draft, setDraft] = useState(blank)
  const [editing, setEditing] = useState(false)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [voidingId, setVoidingId] = useState(null)
  const submitting = useRef(false), formRef = useRef(null)
  const records = assessmentsFor(patient)
  const selected = records.find(record => record.id === selectedId)
  const voiding = records.find(record => record.id === voidingId && assessmentStatus(record) === 'active')
  function confirmVoid(patientId, assessmentId, reason) {
    if (!onVoidAssessment?.(patientId, assessmentId, reason)) return false
    if (editing && draft.id === assessmentId) reset()
    setVoidingId(null); setNotice('voidSuccess')
    return true
  }
  function reset() { setDraft(blank()); setEditing(false); setErrors({}); submitting.current = false }
  function submit(event) {
    event.preventDefault()
    if (submitting.current) return
    const validation = validateAssessment(draft, patient)
    setErrors(validation)
    if (Object.keys(validation).length) { formRef.current?.querySelector('[aria-invalid="true"]')?.focus(); return }
    submitting.current = true
    if (!onSaveAssessment?.(patient.id, draft, editing)) { submitting.current = false; setNotice('saveError'); return }
    setNotice(editing ? 'updated' : 'saved'); reset()
  }
  function edit(record) { if (assessmentStatus(record) !== 'active') return; setDraft({ ...record }); setEditing(true); setErrors({}); setNotice(''); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); formRef.current?.querySelector('input')?.focus() }
  const textFields = ['findings','diagnosis','plan']
  return <div className="dca-page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
    <section className="dmr-panel dca-form-panel">
      <h3><Icon name="stethoscope" />{a(editing ? 'editTitle' : 'title')}</h3><p>{a('description')}</p>
      {notice && <p className={notice === 'saveError' ? 'dd-error' : 'dd-success'} role={notice === 'saveError' ? 'alert' : 'status'}>{a(notice)}</p>}
      <form ref={formRef} onSubmit={submit} noValidate>
        <div className="dca-grid">
          <label>{a('date')} *<input type="date" required max={localVisitDate()} min={patient.dateOfBirth || undefined} value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'dca-date-error' : undefined} />{errors.date && <small id="dca-date-error" role="alert">{a(errors.date)}</small>}</label>
          <label>{a('type')}<select value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value })}><option value="">{a('selectType')}</option>{assessmentTypes.map(type => <option key={type} value={type}>{a('types.' + type)}</option>)}</select></label>
          {textFields.map(field => <label className="dca-full" key={field}>{a(field)}{field !== 'plan' && ' *'}<textarea dir="auto" rows={field === 'diagnosis' ? 2 : 3} required={field !== 'plan'} value={draft[field]} onChange={event => setDraft({ ...draft, [field]: event.target.value })} placeholder={a(field + 'Placeholder')} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? 'dca-' + field + '-error' : undefined} />{errors[field] && <small id={'dca-' + field + '-error'} role="alert">{a(errors[field])}</small>}</label>)}
        </div>
        <div className="dca-actions"><button type="button" className="dd-button" onClick={() => { reset(); setNotice(''); if (!editing) onCancel?.() }}>{t('common.cancel')}</button><button className="dd-record-button dca-save" type="submit">{a(editing ? 'update' : 'save')}</button></div>
      </form>
    </section>
    <section className="dmr-panel dca-history"><h3><Icon name="calendar" />{a('history')}</h3><p>{a('historyDescription')}</p>
      {!records.length ? <p className="dca-empty">{a('empty')}</p> : <div className="dca-table-wrap"><table><thead><tr>{['date','type',...textFields,'actions'].map(field => <th scope="col" key={field}>{a(field)}</th>)}</tr></thead><tbody>{records.map(record => <tr key={record.id}><td><time dateTime={record.date}><bdi>{formatDate(record.date, language)}</bdi></time></td><td>{record.type ? a('types.' + record.type) : a('notRecorded')}<span className={'dca-status dca-status-' + assessmentStatus(record)}>{a(assessmentStatus(record))}</span></td>{textFields.map(field => <td key={field}><span className="dca-preview" dir="auto">{record[field] || a('notRecorded')}</span></td>)}<td><div className="dca-row-actions"><button className="dd-record-button" onClick={() => setSelectedId(record.id)}>{a('view')}</button>{assessmentStatus(record) === 'active' && <><button className="dd-button" onClick={() => edit(record)}>{a('edit')}</button><button className="dd-button dca-void-button" aria-haspopup="dialog" onClick={() => setVoidingId(record.id)}>{a('voidAction')}</button></>}</div></td></tr>)}</tbody></table></div>}
    </section>
    {voiding && <VoidAssessmentModal patient={patient} assessment={voiding} onConfirm={confirmVoid} onClose={() => setVoidingId(null)} />}
    <p className="dca-demo">{a('demo')}</p>
    {selected && <DoctorModal title={a('details')} onClose={() => setSelectedId(null)}><dl className="dca-details">{[[t('doctor.childName'),patient.name],[t('doctor.medicalFile'),patient.file],[a('date'),formatDate(selected.date,language)],[a('type'),selected.type ? a('types.' + selected.type) : a('notRecorded')],[a('doctor'),selected.doctor],[a('status'),a(assessmentStatus(selected))],...(assessmentStatus(selected) === 'voided' ? [[a('voidReason'),selected.voidReason],[a('voidedAt'),new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selected.voidedAt))],[a('voidedBy'),selected.voidedBy]] : []),...textFields.map(field => [a(field),selected[field] || a('notRecorded')])].map(([label,value]) => <div key={label}><dt>{label}</dt><dd dir="auto">{value}</dd></div>)}</dl><button className="dd-button" onClick={() => setSelectedId(null)}>{a('close')}</button></DoctorModal>}
  </div>
}
