import { useId, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { formatDate } from './patientData.js'
import { formatMeasurement, measurementSeries, measurementTypes } from './medicalRecordData.js'
import Icon from './Icon.jsx'

export default function GrowthMeasurementChart({ measurements = [] }) {
  const { language, t } = useLanguage()
  const [type, setType] = useState('weight')
  const chartId = useId()
  const series = measurementSeries(measurements, type)
  const label = t(`doctor.medicalRecord.${measurementTypes[type].label}`)
  const unit = t(`doctor.medicalRecord.${type === 'weight' ? 'kg' : 'cm'}`)
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  // Each chart has a single unit. The scale is purely numerical, with no clinical classifications.
  const max = Math.max(...series.map(point => point.value), 1) * 1.15
  const start = series.length ? Date.parse(series[0].date) : 0
  const duration = series.length > 1 ? Date.parse(series.at(-1).date) - start : 1
  const x = point => 56 + ((Date.parse(point.date) - start) / duration) * 460
  const y = point => 222 - (point.value / max) * 180

  return (
    <section className="dmr-panel dmr-growth" aria-labelledby={`${chartId}-heading`}>
      <header className="dmr-panel-header">
        <h3 id={`${chartId}-heading`}><Icon name="growth" />{t('doctor.medicalRecord.growthChart')}</h3>
        <label className="dmr-chart-select">
          <span className="dd-sr-only">{t('doctor.medicalRecord.measurementType')}</span>
          <select value={type} onChange={event => setType(event.target.value)}>
            {Object.entries(measurementTypes).map(([key, info]) => <option key={key} value={key}>{t(`doctor.medicalRecord.${info.label}`)} ({t(`doctor.medicalRecord.${key === 'weight' ? 'kg' : 'cm'}`)})</option>)}
          </select>
        </label>
      </header>
      {series.length < 2 ? (
        <div className="dmr-chart-empty" role="status">
          <span className="dmr-empty-icon"><Icon name="growth" /></span>
          <strong>{t('doctor.medicalRecord.noGrowthTitle')}</strong>
          <p>{t('doctor.medicalRecord.noGrowthDescription')}</p>
          {series.length === 1 && <small>{formatDate(series[0].date, language)} · {formatMeasurement(series[0].value, type, language)}</small>}
        </div>
      ) : (
        <>
          <svg className="dmr-chart" viewBox="0 0 560 280" role="img" aria-labelledby={`${chartId}-title ${chartId}-description`}>
            <title id={`${chartId}-title`}>{`${label} (${unit})`}</title>
            <desc id={`${chartId}-description`}>{t('doctor.medicalRecord.chartDescription')}</desc>
            <defs><linearGradient id={`${chartId}-fill`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#74bdff" stopOpacity=".28" /><stop offset="100%" stopColor="#74bdff" stopOpacity=".02" /></linearGradient></defs>
            {[0, 1, 2, 3, 4].map(index => <g key={index}><line x1="56" x2="516" y1={222 - index * 45} y2={222 - index * 45} stroke="#e5eef8" /><text x="44" y={227 - index * 45} textAnchor="end">{number.format(index * max / 4)}</text></g>)}
            <text x="56" y="24">{unit}</text>
            <path d={`M56,222 ${series.map(point => `L${x(point)},${y(point)}`).join(' ')} L516,222 Z`} fill={`url(#${chartId}-fill)`} />
            <polyline points={series.map(point => `${x(point)},${y(point)}`).join(' ')} fill="none" stroke="#4ba7ee" strokeWidth="2.5" />
            {series.map(point => <circle key={point.date} cx={x(point)} cy={y(point)} r="4" fill="#5bb7f8"><title>{`${formatDate(point.date, language)}: ${formatMeasurement(point.value, type, language)}`}</title></circle>)}
            {[series[0], series.at(-1)].map((point, index) => <text key={point.date} x={x(point)} y="250" textAnchor={index === 0 ? 'start' : 'end'}>{formatDate(point.date, language)}</text>)}
          </svg>
          <details className="dmr-chart-data"><summary>{t('doctor.medicalRecord.measurementData')}</summary><table><caption className="dd-sr-only">{label} ({unit})</caption><thead><tr><th scope="col">{t('doctor.medicalRecord.date')}</th><th scope="col">{label} ({unit})</th></tr></thead><tbody>{series.map(point => <tr key={point.date}><td>{formatDate(point.date, language)}</td><td>{formatMeasurement(point.value, type, language)}</td></tr>)}</tbody></table></details>
        </>
      )}
    </section>
  )
}
