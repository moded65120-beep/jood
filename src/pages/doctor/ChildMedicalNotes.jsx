import { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import Icon from '../../components/doctor/Icon.jsx'
import DoctorModal from '../../components/doctor/DoctorModal.jsx'
import NewMedicalNoteModal from '../../components/doctor/NewMedicalNoteModal.jsx'
import MedicalNoteDetails from '../../components/doctor/MedicalNoteDetails.jsx'
import { clinicalNotesFor } from '../../components/doctor/clinicalNotesData.js'
import { formatDate } from '../../components/doctor/patientData.js'
import '../../components/doctor/MedicalNotes.css'

export default function ChildMedicalNotes({ patient, onSaveNote, onUpdateNote }) {
  const { language, t } = useLanguage()
  const n = key => t(`doctor.notesDiagnosis.${key}`)
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [saved, setSaved] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const allNotes = clinicalNotesFor(patient)
  const notes = clinicalNotesFor(patient, filter)
  const selected = allNotes.find(note => note.id === selectedId)
  const editingNote = allNotes.find(note => note.id === editingId && note.source === 'standalone')
  function save(patientId, draft) {
    if (!(editingNote ? onUpdateNote?.(patientId, editingNote.id, draft) : onSaveNote?.(patientId, draft))) return false
    setAdding(false); setEditingId(null); setSaved(editingNote ? 'updatedSuccess' : 'success'); setFilter('all')
    return true
  }
  return (
    <section className="dmr-panel dmn-page" aria-labelledby="dmn-page-title">
      <header className="dmn-page-header"><div><h3 id="dmn-page-title"><Icon name="notes" />{n('title')}</h3><p>{n('description')}</p></div><button className="dd-record-button dmn-add" onClick={() => setAdding(true)}>{n('add')}</button></header>
      {saved && <div className="dd-success" role="status">{n(saved)}<button aria-label={t('doctor.dismissMessage')} onClick={() => setSaved(false)}>×</button></div>}
      <div className="dmn-filters" role="group" aria-label={n('filters')}>{['all', 'diagnosis', 'observation', 'followup'].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{n(`filtersLabel.${value}`)}</button>)}</div>
      {!notes.length ? <div className="dmn-empty"><Icon name="notes" /><h4>{n(allNotes.length ? 'emptyFilter' : 'emptyTitle')}</h4><p>{n('emptyDescription')}</p></div> : <ul className="dmn-list">{notes.map(note => (
        <li key={note.id}>
          <header><time dateTime={note.date}><bdi>{formatDate(note.date, language)}</bdi></time><span className={`dmn-type dmn-type-${note.type}`}>{n(`types.${note.type}`)}</span><span className="dmn-source">{n(note.source === 'visit' ? 'visitSource' : 'standaloneSource')}</span></header>
          <small dir="auto"><bdi>{note.doctor || n('notRecorded')}</bdi></small>
          {note.diagnosis && <h4 dir="auto">{note.diagnosis}</h4>}
          <p className="dmn-preview" dir="auto">{note.observations || note.plan || n('noObservations')}</p>
          <button className="dd-record-button" aria-haspopup="dialog" onClick={() => setSelectedId(note.id)}>{n('viewDetails')}<span className="dd-sr-only"> · <bdi>{formatDate(note.date, language)}</bdi> · {n(`types.${note.type}`)}</span></button>
          {note.source === 'standalone' && <button className="dd-record-button dmn-edit" aria-haspopup="dialog" onClick={() => setEditingId(note.id)}>{n('edit')}<span className="dd-sr-only"> · <bdi>{formatDate(note.date, language)}</bdi></span></button>}
        </li>
      ))}</ul>}
      <p className="dnv-demo">{n('mockNotice')}</p>
      {(adding || editingNote) && <NewMedicalNoteModal key={editingNote?.id || 'new'} patient={patient} note={editingNote || null} onSave={save} onClose={() => { setAdding(false); setEditingId(null) }} />}
      {selected && <DoctorModal title={n('detailsTitle')} className="dmn-details-modal" onClose={() => setSelectedId(null)}><dl className="dnv-child"><div><dt>{t('doctor.childName')}</dt><dd><bdi>{patient.name}</bdi></dd></div><div><dt>{t('doctor.medicalFile')}</dt><dd><bdi>{patient.file}</bdi></dd></div></dl><MedicalNoteDetails note={selected} patient={patient} /></DoctorModal>}
    </section>
  )
}
