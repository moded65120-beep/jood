import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { formatDate } from './patientData.js'

export default function MedicalNoteDetails({ note, patient }) {
  const { language, t } = useLanguage()
  const n = key => t(`doctor.notesDiagnosis.${key}`)
  const visit = note.visitId && (patient.medicalVisits || []).find(item => item.id === note.visitId)
  return <dl className="dmn-details">
    <div><dt>{n('type')}</dt><dd>{n(`types.${note.type}`)}</dd></div>
    <div><dt>{n('date')}</dt><dd><bdi>{formatDate(note.date, language)}</bdi></dd></div>
    <div><dt>{n('doctor')}</dt><dd dir="auto"><bdi>{note.doctor || n('notRecorded')}</bdi></dd></div>
    {['diagnosis', 'observations', 'plan'].filter(field => note[field]).map(field => <div className="dmn-full" key={field}><dt>{n(field)}</dt><dd dir="auto">{note[field]}</dd></div>)}
    <div className="dmn-full"><dt>{n('linkedVisit')}</dt><dd>{note.visitId ? <><bdi>{note.visitId}</bdi> · {visit ? formatDate(visit.date, language) : n('visitUnavailable')}</> : n('noVisitLink')}</dd></div>
  </dl>
}
