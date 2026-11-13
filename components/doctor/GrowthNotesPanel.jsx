import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { dateOrdinal, formatGrowthDate } from '../../utils/growthDates.js'
import Button from '../common/Button.jsx'
import GrowthDoctorNotes from '../child-health/GrowthDoctorNotes.jsx'

export default function GrowthNotesPanel({ child, measurements, onSave, onClose }) {
  const { t, language } = useLanguage()
  const [selected, setSelected] = useState('')
  const [draft, setDraft] = useState(null)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const selector = useRef(null), textarea = useRef(null)
  const records = measurements.filter(record => record.childId === child.id && dateOrdinal(record.measurementDate) !== null)
  const keyOf = (record, index) => record.noteKey || (record.id ? 'id:' + record.id : 'legacy:' + index)
  useEffect(() => { (selected ? textarea.current : selector.current)?.focus() }, [selected])
  function select(key) {
    setSelected(key); setStatus('')
    const index = records.findIndex((record, index) => keyOf(record, index) === key)
    const record = records[index]
    const originalNote = typeof record?.doctorNote === 'string' ? record.doctorNote : ''
    setNote(originalNote)
    setDraft(record ? { measurementId: record.id, measurementIndex: record.noteIndex ?? index, expectedRecord: record.noteVersion || JSON.stringify(record), originalNote } : null)
  }
  async function save(event) {
    event.preventDefault()
    if (!draft || !note.trim() || note === draft.originalNote || busy) return
    setBusy(true); setStatus('saving')
    try {
      const { originalNote: _originalNote, ...baseline } = draft
      if (await onSave({ ...baseline, doctorNote: note }) !== true) throw Error('failed')
      // After success, reselecting takes a fresh version for a subsequent edit.
      setDraft(null); setSelected(''); setNote(''); setStatus('saved')
    } catch { setStatus('failed') }
    finally { setBusy(false) }
  }
  return <aside className="growth-notes-panel" aria-labelledby="growth-notes-title" dir={language === 'ar' ? 'rtl' : 'ltr'} onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.preventDefault(); onClose() } }}>
    <header><h2 id="growth-notes-title">{t('growthNotes.button')}</h2><button type="button" className="growth-notes-panel__close" onClick={onClose} disabled={busy} aria-label={t('common.cancel')}><X size={20} /></button></header>
    <form onSubmit={save}>
      <label htmlFor="growth-note-measurement">{t('growthNotes.selectMeasurement')}</label>
      <select id="growth-note-measurement" ref={selector} value={selected} onChange={event => select(event.target.value)} disabled={busy} required>
        <option value="">{t('growthNotes.chooseMeasurement')}</option>
        {records.map((record, index) => <option key={keyOf(record, index)} value={keyOf(record, index)}>{new Intl.NumberFormat(language).format(index + 1)} · {formatGrowthDate(record.measurementDate, language)} · {record.weightKg ?? '—'} kg / {record.heightCm ?? '—'} cm</option>)}
      </select>
      {!records.length && <p role="status">{t('growthNotes.noMeasurements')}</p>}
      <label htmlFor="growth-note-text">{t('growthNotes.button')}</label>
      <textarea id="growth-note-text" ref={textarea} rows={7} value={note} onChange={event => { setNote(event.target.value); setStatus('') }} disabled={!draft || busy} />
      <Button type="submit" className="growth-notes-panel__save" disabled={!draft || !note.trim() || note === draft.originalNote || busy}>{t(busy ? 'growthNotes.saving' : 'growthNotes.save')}</Button>
      {status && <p role={status === 'failed' ? 'alert' : 'status'} aria-live="polite">{t('growthNotes.' + status)}</p>}
    </form>
    <GrowthDoctorNotes child={child} measurements={measurements} />
  </aside>
}
