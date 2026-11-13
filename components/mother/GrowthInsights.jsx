import { useEffect, useId, useState } from 'react'
import Card from '../common/Card.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { GROWTH_METRICS } from '../../utils/growthChartData.js'
import { formatGrowthDate } from '../../utils/growthDates.js'
import { buildGrowthInsight } from '../../utils/growthInsights.js'
import { loadWhoReference } from '../../utils/whoReferenceLoader.js'
import './GrowthInsights.css'

export default function GrowthInsights({ child, measurements = [], metric = 'weightKg' }) {
  const { t, language } = useLanguage()
  const titleId = useId()
  const [loaded, setLoaded] = useState(null)
  const indicator = GROWTH_METRICS[metric]?.indicator
  const sex = child?.sex
  const key = `${indicator}-${sex}`
  useEffect(() => {
    let cancelled = false
    loadWhoReference(indicator, sex).then(
      (dataset) => { if (!cancelled) setLoaded({ key, dataset }) },
      () => { if (!cancelled) setLoaded({ key, dataset: null }) },
    )
    return () => { cancelled = true }
  }, [key, indicator, sex])
  const result = buildGrowthInsight(loaded?.key === key ? loaded.dataset : null, child, measurements, metric)
  const loading = loaded?.key !== key && result.status === 'unavailable'
  const number = new Intl.NumberFormat(language, { maximumSignificantDigits: 21 })
  const adjustedNumber = new Intl.NumberFormat(language, { maximumSignificantDigits: 15 })

  return (
    <Card className="growth-insights" role="region" aria-labelledby={titleId} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <h2 id={titleId}>{t('motherGrowth.insightsTitle')}</h2>
      <div aria-live="polite" aria-busy={loading}>
        <h3>{t(`growth.${metric}Tab`)}</h3>
        {loading ? <p role="status">{t('common.loading')}</p> : result.status !== 'ready' ? <p role="status">{t(`motherGrowth.${result.status}`)}</p> : <>
          <p className="growth-insights__record">{t('growth.measurementDate')}: {formatGrowthDate(result.latest.measurementDate, language)} · {t('growth.measuredValue')}: {number.format(result.assessment.rawValue)} {t(`growth.${GROWTH_METRICS[metric].unitKey}`)}</p>
          <p className={result.position === 'review' ? 'growth-insights__review' : 'growth-insights__position'}>{t(`motherGrowth.${metric}.${result.position}`)}</p>
          {result.assessment.adjustmentCm !== 0 && <p className="growth-insights__note">{t('motherGrowth.adjustedHeight')} {adjustedNumber.format(result.assessment.value)} {t('growth.cm')}</p>}
          {result.hasExcludedRecords && <p className="growth-insights__note">{t('motherGrowth.excluded')}</p>}
        </>}
      </div>
      <p className="growth-insights__disclaimer">{t('motherGrowth.disclaimer')}</p>
    </Card>
  )
}
