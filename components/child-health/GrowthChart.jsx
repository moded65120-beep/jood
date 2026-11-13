import { useEffect, useId, useMemo, useState } from 'react'
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { formatGrowthDate } from '../../utils/growthDates.js'
import { buildGrowthChartData, GROWTH_METRICS, WHO_DAYS_PER_MONTH } from '../../utils/growthChartData.js'
import { loadWhoReference } from '../../utils/whoReferenceLoader.js'
import './GrowthChart.css'

const METRICS = Object.keys(GROWTH_METRICS)
const CURVES = [
  { score: -3, label: 'sdMinus3', color: '#85659c', dash: '6 4' },
  { score: -2, label: 'sdMinus2', color: '#4b82a8', dash: '3 3' },
  { score: 0, label: 'sdMedian', color: '#397f78' },
  { score: 2, label: 'sdPlus2', color: '#4b82a8', dash: '9 3' },
  { score: 3, label: 'sdPlus3', color: '#85659c', dash: '2 4' },
]
// Tooltip presentation only; preserve the plotted series and legend order.
const TOOLTIP_CURVES = [...CURVES].reverse()

function GrowthTooltip({ active, payload, points, metric }) {
  const { t, language } = useLanguage()
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  const format = new Intl.NumberFormat(language, { maximumSignificantDigits: 21, useGrouping: false })
  const adjustedFormat = new Intl.NumberFormat(language, { maximumSignificantDigits: 15 })
  const ageFormat = new Intl.NumberFormat(language, { maximumFractionDigits: 3 })
  const unit = t('growth.' + GROWTH_METRICS[metric].unitKey)
  const matchingPoints = points.filter((point) => point.ageDays === row.ageDays)
  return (
    <div className="growth-chart__tooltip" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <p><strong>{t('growth.age')}: {format.format(row.ageDays)} {t('growth.days')}</strong></p>
      <p>{ageFormat.format(row.ageDays / WHO_DAYS_PER_MONTH)} {t('growth.months')}</p>
      {matchingPoints.map((point, index) => <div key={index} className="growth-chart__tooltip-point">
        <p><strong>{t('growth.childMeasurements')}</strong></p>
        <p>{t('growth.measurementDate')}: {formatGrowthDate(point.measurementDate, language)}</p>
        <p>{t('growth.measuredValue')}: {format.format(point.rawValue)} {unit}</p>
        {metric === 'heightCm' && <p>{t('growth.measurementMethod')}: {t('growth.' + point.measurementMethod)}</p>}
        {point.adjustmentCm !== 0 && <>
          <p>{t('growth.plottedValue')}: {adjustedFormat.format(point.value)} {unit}</p>
          <p>{t('growth.whoAdjustment')}: {point.adjustmentCm > 0 ? '+' : '−'}{format.format(Math.abs(point.adjustmentCm))} {unit}</p>
        </>}
      </div>)}
      <p><strong>{t('growth.whoReference')}</strong></p>
      {TOOLTIP_CURVES.map((curve) => <p key={curve.score}>{t('growth.' + curve.label)}: {format.format(row['sd' + curve.score])} {unit}</p>)}
    </div>
  )
}

/** Shared, read-only visualization; records contain raw values and actual method. */
export default function GrowthChart({ child, measurements = [], headingRef, selectedMetric, onMetricChange }) {
  const { t, language } = useLanguage()
  const [internalMetric, setInternalMetric] = useState('weightKg')
  // Existing callers keep local tabs; a parent can own the selection for insights.
  const metric = selectedMetric ?? internalMetric
  function setMetric(next) {
    if (selectedMetric === undefined) setInternalMetric(next)
    onMetricChange?.(next)
  }
  const [loaded, setLoaded] = useState(null)
  const instanceId = useId()
  const config = GROWTH_METRICS[metric]
  const key = config.indicator + '-' + child?.sex
  const rtl = language === 'ar'
  useEffect(() => {
    let cancelled = false
    loadWhoReference(config.indicator, child?.sex).then(
      (dataset) => { if (!cancelled) setLoaded({ key, dataset }) },
      () => { if (!cancelled) setLoaded({ key, error: true }) },
    )
    return () => { cancelled = true }
  }, [key, config.indicator, child?.sex])
  const dataset = loaded?.key === key ? loaded.dataset : null
  const graph = useMemo(() => buildGrowthChartData(dataset, child ?? {}, measurements, metric), [dataset, child, measurements, metric])
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 2 })
  const titleId = instanceId + '-title'
  const panelId = instanceId + '-panel'
  const isLength = metric === 'heightCm'
  const ticks = graph ? [0, 6, 12, 18, 24, 30].map((months) => months * WHO_DAYS_PER_MONTH).concat(graph.maxAgeDays) : []

  function handleTabKey(event, index) {
    let next
    if (event.key === 'ArrowRight') next = (index + (rtl ? -1 : 1) + METRICS.length) % METRICS.length
    if (event.key === 'ArrowLeft') next = (index + (rtl ? 1 : -1) + METRICS.length) % METRICS.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = METRICS.length - 1
    if (next === undefined) return
    event.preventDefault()
    setMetric(METRICS[next])
    event.currentTarget.parentElement.children[next].focus()
  }

  return (
    <section className="growth-chart" aria-labelledby={titleId} dir={rtl ? 'rtl' : 'ltr'}>
      <h2 id={titleId} ref={headingRef} tabIndex={-1}>{t('growth.chartTitle')}</h2>
      <div className="growth-chart__tabs" role="tablist" aria-label={t('growth.chartTitle')}>
        {METRICS.map((item, index) => <button key={item} type="button" role="tab" id={instanceId + '-' + item} aria-controls={panelId} aria-selected={metric === item} tabIndex={metric === item ? 0 : -1} onClick={() => setMetric(item)} onKeyDown={(event) => handleTabKey(event, index)}>{t('growth.' + item + 'Tab')}</button>)}
      </div>
      <div role="tabpanel" id={panelId} aria-labelledby={instanceId + '-' + metric} tabIndex={0} aria-busy={loaded?.key !== key}>
        {loaded?.key !== key ? <p role="status">{t('common.loading')}</p> : loaded.error || !graph ? <p role="status">{t('growth.referenceUnavailable')}</p> : <>
          <p className="growth-chart__caption">{t('growth.whoReference')} · {t('growth.' + child.sex)}</p>
          <ul className="growth-chart__legend" aria-label={t('growth.curveLegend')}>
            {CURVES.map((curve) => <li key={curve.score}><svg width="28" height="12" aria-hidden="true"><line x1="0" y1="6" x2="28" y2="6" stroke={curve.color} strokeWidth="2" strokeDasharray={curve.dash} /></svg>{t('growth.' + curve.label)}</li>)}
            <li><span className="growth-chart__point-key" aria-hidden="true" />{t('growth.childMeasurements')}</li>
          </ul>
          <p className="growth-chart__axis-title">{t('growth.' + metric)}</p>
          <div className="growth-chart__canvas" dir="ltr" aria-label={t('growth.' + metric + 'Tab') + ' — ' + t('growth.whoReference')}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <ComposedChart data={graph.rows} margin={{ top: 12, right: 18, bottom: 8, left: 0 }} accessibilityLayer>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 5" />
                <XAxis type="number" dataKey="ageDays" domain={[0, graph.maxAgeDays]} ticks={ticks} tickFormatter={(day) => number.format(day / WHO_DAYS_PER_MONTH)} tick={{ fontSize: 12 }} />
                <YAxis type="number" domain={['auto', 'auto']} tickFormatter={(value) => number.format(value)} tick={{ fontSize: 12 }} width={54} />
                <Tooltip isAnimationActive={false} content={<GrowthTooltip points={graph.points} metric={metric} />} />
                {CURVES.flatMap((curve) => (isLength ? ['Length', 'Height'] : ['']).map((suffix) => <Line key={curve.score + suffix} dataKey={'sd' + curve.score + suffix} name={t('growth.' + curve.label)} type="linear" stroke={curve.color} strokeWidth={curve.score === 0 ? 2.5 : 1.5} strokeDasharray={curve.dash} dot={false} activeDot={false} connectNulls={false} isAnimationActive={false} />))}
                {(isLength ? ['childLength', 'childHeight'] : ['childValue']).map((dataKey) => <Line key={dataKey} dataKey={dataKey} name={t('growth.childMeasurements')} type="linear" stroke="#b34478" strokeWidth={3} dot={{ r: 5, fill: '#b34478', stroke: 'white', strokeWidth: 2 }} activeDot={{ r: 7 }} connectNulls isAnimationActive={false} />)}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="growth-chart__axis-title growth-chart__axis-title--x">{t('growth.ageMonths')}</p>
          <p className="growth-chart__caption">{t('growth.thirdBirthdayEnd')}</p>
          {isLength && <p className="growth-chart__caption">{t('growth.lengthConvention')}</p>}
          {graph.points.length === 0 && <p className="growth-chart__empty">{t('growth.noMeasurements')}</p>}
          {isLength && measurements.some((measurement) => measurement.childId === child.id && !['recumbent_length', 'standing_height'].includes(measurement.measurementMethod)) && <p className="growth-chart__caption">{t('growth.missingMethod')}</p>}
          {graph.points.length > 0 && <details className="growth-chart__records">
            <summary>{t('growth.measurementDetails')}</summary>
            <ul>{graph.points.map((point, index) => <li key={index}>
              {formatGrowthDate(point.measurementDate, language)} · {number.format(point.ageDays)} {t('growth.days')} · {new Intl.NumberFormat(language, { maximumSignificantDigits: 21 }).format(point.rawValue)} {t('growth.' + config.unitKey)}
              {isLength && <> · {t('growth.' + point.measurementMethod)}</>}
            </li>)}</ul>
          </details>}
        </>}
      </div>
    </section>
  )
}

