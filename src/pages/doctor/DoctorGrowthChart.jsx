import { NotebookPen } from 'lucide-react'
import GrowthNotesPanel from '../../components/doctor/GrowthNotesPanel.jsx'
import { useRef, useState } from 'react'
import Card from '../../components/common/Card.jsx'
import GrowthMeasurementForm from '../../components/doctor/GrowthMeasurementForm.jsx'
import GrowthChart from '../../components/child-health/GrowthChart.jsx'
import { calendarAge, dateOrdinal, localDateString, formatGrowthDate } from '../../utils/growthDates.js'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import './DoctorGrowthChart.css'

// Standalone preview only. DoctorPatientGrowth always supplies a canonical profile.
const SAMPLE_CHILD = { id: 'sample-child-001', name: { en: 'Lina Ahmad', ar: 'لينا أحمد' }, sex: 'female', dateOfBirth: '2024-06-15' }
const METRICS = ['weightKg', 'heightCm', 'headCircumferenceCm']

function calculateAge(dateOfBirth, today = new Date()) {
  const [year, month, day] = dateOfBirth.split('-').map(Number)
  let months = (today.getFullYear() - year) * 12 + today.getMonth() - (month - 1)
  if (today.getDate() < day) months -= 1
  months = Math.max(0, months)
  return { years: Math.floor(months / 12), months: months % 12 }
}

export default function DoctorGrowthChart({ child: suppliedChild, measurements: suppliedMeasurements, onSave, onSaveNote } = {}) {
  const { t, language } = useLanguage()
  const child = suppliedChild ?? SAMPLE_CHILD
  const [localMeasurements, setMeasurements] = useState([])
  const measurements = suppliedMeasurements ?? localMeasurements
  const [saveStatus, setSaveStatus] = useState('')
  const [notesOpen, setNotesOpen] = useState(false)
  const notesButton = useRef(null)
  function closeNotes() { setNotesOpen(false); notesButton.current?.focus() }
  function saveNote(draft) {
    if (integrated) return onSaveNote?.(draft) === true
    const index = localMeasurements.findIndex((record, index) => record.id ? record.id === draft.measurementId : index === draft.measurementIndex)
    if (index < 0 || JSON.stringify(localMeasurements[index]) !== draft.expectedRecord) return false
    setMeasurements(previous => previous.map((record, position) => position === index ? { ...record, doctorNote: draft.doctorNote } : record))
    return true
  }
  const integrated = suppliedChild !== undefined
  const ready = !integrated || Boolean(child.id && ['male', 'female'].includes(child.sex) && dateOrdinal(child.dateOfBirth) !== null && child.dateOfBirth <= localDateString())
  const chartRef = useRef(null)
  const latest = measurements.at(-1)
  const age = integrated ? calendarAge(child.dateOfBirth, localDateString()) : calculateAge(child.dateOfBirth)
  const number = new Intl.NumberFormat(language)
  const measurementNumber = new Intl.NumberFormat(language, { maximumSignificantDigits: 21, useGrouping: false })
  const date = (value) => formatGrowthDate(value, language)

  function saveMeasurement(measurement) {
    // Append complete records here; a persistence service can replace this boundary.
    if (integrated) {
      if (!onSave || onSave(measurement) !== true) { setSaveStatus('failed'); return false }
      setSaveStatus('saved')
    } else setMeasurements((previous) => [...previous, measurement])
    chartRef.current?.focus()
    chartRef.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' })
  }

  return (
    <div className="doctor-growth" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="doctor-growth__header"><h1>{t('growth.pageTitle')}</h1></header>
      <div className="doctor-growth__actions"><button type="button" className="doctor-growth__notes-button" ref={notesButton} aria-expanded={notesOpen} aria-controls="growth-notes-panel" onClick={() => setNotesOpen(!notesOpen)}><NotebookPen size={18} />{t('growthNotes.button')}</button></div>
      <div className={`doctor-growth__workspace${notesOpen ? ' doctor-growth__workspace--notes' : ''}`}><div className="doctor-growth__body" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Card className="doctor-growth__child">
        <h2>{t('growth.childInfo')}</h2>
        {!integrated && <p className="doctor-growth__sample">{t('growth.sampleNotice')}</p>}
        <dl className="doctor-growth__details">
          <div><dt>{t('growth.childName')}</dt><dd>{typeof child.name === 'string' ? child.name : child.name?.[language] || t('motherGrowth.notAvailable')}</dd></div>
          <div><dt>{t('growth.sex')}</dt><dd>{['male', 'female'].includes(child.sex) ? t(`growth.${child.sex}`) : t('motherGrowth.notAvailable')}</dd></div>
          <div><dt>{t('childHealth.dateOfBirth')}</dt><dd>{date(child.dateOfBirth) || t('motherGrowth.notAvailable')}</dd></div>
          <div><dt>{t('growth.age')}</dt><dd>{age ? <>{number.format(age.years)} {t('growth.years')} / {number.format(age.months)} {t('growth.months')}</> : t('motherGrowth.notAvailable')}</dd></div>
        </dl>
      </Card>
      <Card>
        <h2>{t('growth.addMeasurements')}</h2>
        <p className="doctor-growth__muted">{t(integrated ? 'growthIntegration.persistenceNotice' : 'growth.sessionNotice')}</p>
        {ready ? <GrowthMeasurementForm key={child.id} child={child} onSave={saveMeasurement} /> : <p role="status">{t('growthIntegration.missingProfile')}</p>}
      </Card>
      <div role="status" aria-live="polite" aria-atomic="true">
        {(!integrated ? latest : saveStatus === 'saved') && <p className="doctor-growth__confirmation" key={measurements.length}>{t('growth.saved')} ({number.format(measurements.length)})</p>}
      </div>
      {saveStatus === 'failed' && <p role="alert">{t('growthIntegration.saveFailed')}</p>}
      {latest && <Card>
        <h2>{t('growth.latestEntry')}</h2>
        <dl className="doctor-growth__details">
          <div><dt>{t('growth.measurementDate')}</dt><dd>{date(latest.measurementDate)}</dd></div>
          {METRICS.map((metric) => <div key={metric}><dt>{t(`growth.${metric}`)}</dt><dd>{typeof latest[metric] === 'number' && Number.isFinite(latest[metric]) ? measurementNumber.format(latest[metric]) : t('motherGrowth.notAvailable')}</dd></div>)}
          <div><dt>{t('growth.measurementMethod')}</dt><dd>{['recumbent_length', 'standing_height'].includes(latest.measurementMethod) ? t(`growth.${latest.measurementMethod}`) : t('motherGrowth.notAvailable')}</dd></div>
        </dl>
      </Card>}
      <Card>
        <GrowthChart child={child} measurements={measurements} headingRef={chartRef} />
      </Card>
      </div>
      {notesOpen && <div id="growth-notes-panel"><GrowthNotesPanel child={child} measurements={measurements} onSave={saveNote} onClose={closeNotes} /></div>}
      </div>
    </div>
  )
}
