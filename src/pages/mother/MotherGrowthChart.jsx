import { useMotherPageState } from '../../hooks/useMotherNavigation.js'
import Card from '../../components/common/Card.jsx'
import LanguageSwitcher from '../../components/common/LanguageSwitcher.jsx'
import GrowthChart from '../../components/child-health/GrowthChart.jsx'
import GrowthInsights from '../../components/mother/GrowthInsights.jsx'
import GrowthDoctorNotes from '../../components/child-health/GrowthDoctorNotes.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { calendarAge, formatCalendarAge, formatGrowthDate, localDateString } from '../../utils/growthDates.js'
import { GROWTH_METRICS } from '../../utils/growthChartData.js'
import { childMeasurements, datedMeasurements, latestMeasurement } from '../../utils/growthInsights.js'
import './MotherGrowthChart.css'

// Read-only boundary: pass the same child/measurement objects as the doctor page.
export default function MotherGrowthChart({ child, measurements = [] }) {
  const { t, language } = useLanguage()
  const [metric, setMetric] = useMotherPageState('growth.metric', 'weightKg')
  const number = new Intl.NumberFormat(language, { maximumSignificantDigits: 21 })
  const missing = t('motherGrowth.notAvailable')
  const age = child && calendarAge(child.dateOfBirth, localDateString())
  const latest = latestMeasurement(child, measurements)
  const recordedAge = latest && calendarAge(child.dateOfBirth, latest.measurementDate)
  const records = datedMeasurements(child, measurements)
  const name = typeof child?.name === 'string' ? child.name : child?.name?.[language] ?? child?.name?.en

  return (
    <main className="mother-growth" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="mother-growth__header"><h1>{t('motherGrowth.pageTitle')}</h1><LanguageSwitcher /></header>
      {!child ? <Card><p role="status">{t('motherGrowth.childUnavailable')}</p></Card> : <>
        <Card className="mother-growth__child">
          <h2>{t('growth.childInfo')}</h2>
          <dl className="mother-growth__details">
            <div><dt>{t('growth.childName')}</dt><dd>{name || missing}</dd></div>
            <div><dt>{t('growth.sex')}</dt><dd>{['male', 'female'].includes(child.sex) ? t(`growth.${child.sex}`) : missing}</dd></div>
            <div><dt>{t('childHealth.dateOfBirth')}</dt><dd>{formatGrowthDate(child.dateOfBirth, language) || missing}</dd></div>
            <div><dt>{t('motherGrowth.currentAge')}</dt><dd>{age ? formatCalendarAge(age, language) : missing}</dd></div>
          </dl>
        </Card>
        <Card>
          <h2>{t('motherGrowth.latestMeasurements')}</h2>
          {!latest ? <p role="status">{t(childMeasurements(child, measurements).length ? 'motherGrowth.invalidMeasurements' : 'motherGrowth.empty')}</p> : <>
            <dl className="mother-growth__details mother-growth__details--date">
              <div><dt>{t('growth.measurementDate')}</dt><dd>{formatGrowthDate(latest.measurementDate, language)}</dd></div>
              <div><dt>{t('growth.ageAtMeasurement')}</dt><dd>{formatCalendarAge(recordedAge, language)}</dd></div>
            </dl>
            <dl className="mother-growth__measurements">
              {Object.entries(GROWTH_METRICS).map(([item, config]) => <div key={item} className="mother-growth__measurement">
                <dt>{t(`growth.${item}`)}</dt>
                <dd>{typeof latest[item] === 'number' && Number.isFinite(latest[item]) && latest[item] > 0 ? <>{number.format(latest[item])} <span>{t(`growth.${config.unitKey}`)}</span></> : missing}</dd>
              </div>)}
            </dl>
          </>}
        </Card>
        <div className="mother-growth__chart-layout">
          <Card><GrowthChart child={child} measurements={records} selectedMetric={metric} onMetricChange={setMetric} /></Card>
          <GrowthInsights child={child} measurements={measurements} metric={metric} />
        </div>
        <GrowthDoctorNotes child={child} measurements={measurements} />
      </>}
    </main>
  )
}
