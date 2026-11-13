import Card from '../common/Card.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { formatGrowthDate, dateOrdinal, localDateString } from '../../utils/growthDates.js'
import './GrowthDoctorNotes.css'

export default function GrowthDoctorNotes({ child, measurements = [] }) {
  const { t, language } = useLanguage()
  const notes = measurements.filter(record => child?.id && record.childId === child.id && typeof record.doctorNote === 'string' && record.doctorNote.trim() && dateOrdinal(record.measurementDate) !== null && record.measurementDate <= localDateString()).slice().sort((a, b) => b.measurementDate.localeCompare(a.measurementDate))
  if (!notes.length) return null
  return <Card className="growth-doctor-notes">
    <h2>{t('growthNotes.title')}</h2>
    {notes.map((record, index) => <article className="growth-doctor-notes__entry" key={record.id || record.measurementDate + ':' + index}>
      <h3><time dateTime={record.measurementDate}>{formatGrowthDate(record.measurementDate, language)}</time></h3>
      <p dir="auto">{record.doctorNote}</p>
    </article>)}
  </Card>
}
