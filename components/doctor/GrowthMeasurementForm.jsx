import { useEffect, useState } from 'react'
import Input from '../common/Input.jsx'
import Button from '../common/Button.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { calendarAge, formatCalendarAge, dateOrdinal, localDateString, thirdBirthday } from '../../utils/growthDates.js'
import { GROWTH_METRICS } from '../../utils/growthChartData.js'
import { loadWhoReference } from '../../utils/whoReferenceLoader.js'
import { evaluateGrowthMeasurement } from '../../utils/growthWarnings.js'
import './GrowthMeasurementForm.css'

const metrics = ['weightKg', 'heightCm', 'headCircumferenceCm']

function measurementNumber(value) {
  const normalized = value.trim().replace(',', '.')
  // Accept decimal notation only; reject exponents, hex, mixed separators and text.
  return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized) ? Number(normalized) : NaN
}

export default function GrowthMeasurementForm({ child, onSave }) {
  const { t, language } = useLanguage()
  const [values, setValues] = useState(() => ({ measurementDate: localDateString(), weightKg: '', heightCm: '', headCircumferenceCm: '', measurementMethod: '' }))
  const [errors, setErrors] = useState({})
  const [references, setReferences] = useState(null)
  const [confirmations, setConfirmations] = useState({})
  useEffect(() => {
    let cancelled = false
    Promise.all(metrics.map(async (metric) => {
      try { return [metric, await loadWhoReference(GROWTH_METRICS[metric].indicator, child.sex)] }
      catch { return [metric, null] }
    })).then((entries) => { if (!cancelled) setReferences({ sex: child.sex, datasets: Object.fromEntries(entries) }) })
    return () => { cancelled = true }
  }, [child.sex])
  const lastSupportedDate = thirdBirthday(child.dateOfBirth)
  const measurementAge = calendarAge(child.dateOfBirth, values.measurementDate)
  const record = { childId: child.id, measurementDate: values.measurementDate, measurementMethod: values.measurementMethod, ...Object.fromEntries(metrics.map((metric) => [metric, measurementNumber(values[metric])])) }
  const assessments = Object.fromEntries(metrics.map((metric) => [metric, evaluateGrowthMeasurement(references?.sex === child.sex ? references.datasets[metric] : null, child, record, metric, t)]))
  const confirmationKey = (metric) => JSON.stringify([child.id, child.sex, child.dateOfBirth, values.measurementDate, metric === 'heightCm' ? values.measurementMethod : null, values[metric], assessments[metric].warning?.ruleId])

  function handleChange(event) {
    const { name, value } = event.target
    setValues((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: undefined }))
    setConfirmations((previous) => name === 'measurementDate' ? {} : { ...previous, [name === 'measurementMethod' ? 'heightCm' : name]: undefined })
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (dateOrdinal(values.measurementDate) === null) {
      nextErrors.measurementDate = 'dateRequired'
    } else if (values.measurementDate < child.dateOfBirth) {
      nextErrors.measurementDate = 'dateBeforeBirth'
    } else if (values.measurementDate > localDateString()) {
      nextErrors.measurementDate = 'dateFuture'
    } else if (values.measurementDate > lastSupportedDate) {
      nextErrors.measurementDate = 'ageRange'
    }
    for (const metric of metrics) {
      if (!values[metric].trim()) nextErrors[metric] = 'required'
      else if (!Number.isFinite(measurementNumber(values[metric])) || measurementNumber(values[metric]) <= 0) nextErrors[metric] = 'positiveNumber'
    }
    if (!['recumbent_length', 'standing_height'].includes(values.measurementMethod)) nextErrors.measurementMethod = 'methodRequired'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      event.currentTarget.elements.namedItem(Object.keys(nextErrors)[0])?.focus()
      return
    }
    const unconfirmed = metrics.find((metric) => assessments[metric].warning && confirmations[metric] !== confirmationKey(metric))
    if (unconfirmed) {
      setErrors({ [unconfirmed]: 'warningConfirmationRequired' })
      event.currentTarget.elements.namedItem(`review-${unconfirmed}`)?.focus()
      return
    }
    onSave(record)
  }

  function field(name, type, extra = {}) {
    const errorId = `growth-${name}-error`
    const warning = assessments[name]?.warning
    const warningId = `growth-${name}-warning`
    return (
      <div className="growth-measurement-form__field" key={name}>
        <Input id={`growth-${name}`} name={name} label={t(`growth.${name}`)} type={type} value={values[name]} onChange={handleChange} required aria-invalid={Boolean(errors[name])} aria-describedby={[errors[name] && errorId, warning && warningId, name === 'measurementDate' && measurementAge && 'growth-measurement-age'].filter(Boolean).join(' ') || undefined} {...extra} />
        {name === 'measurementDate' && measurementAge && <p id="growth-measurement-age" className="growth-measurement-form__age" aria-live="polite">{t('growth.ageAtMeasurement')}: {formatCalendarAge(measurementAge, language)}</p>}
        {warning && <div className="growth-measurement-form__warning">
          <p id={warningId} role="status">{warning.message}</p>
          <label className="growth-measurement-form__review">
            <input type="checkbox" name={`review-${name}`} checked={confirmations[name] === confirmationKey(name)} onChange={(event) => {
              setConfirmations((previous) => ({ ...previous, [name]: event.target.checked ? confirmationKey(name) : undefined }))
              setErrors((previous) => ({ ...previous, [name]: undefined }))
            }} aria-describedby={warningId} />
            {t('growth.warningConfirmation')}
          </label>
        </div>}
        {errors[name] && <p id={errorId} className="growth-measurement-form__error">{t(`growth.${errors[name]}`)}</p>}
      </div>
    )
  }

  return (
    <form className="growth-measurement-form" onSubmit={handleSubmit} noValidate>
      {field('measurementDate', 'date', { min: child.dateOfBirth, max: [localDateString(), lastSupportedDate].sort()[0] })}
      <div className="growth-measurement-form__metrics">
        {metrics.map((metric) => field(metric, 'text', { inputMode: 'decimal', autoComplete: 'off' }))}
      </div>
      <div className="growth-measurement-form__field">
        <label className="nomu-field__label" htmlFor="growth-measurementMethod">{t('growth.measurementMethod')}</label>
        <select className="nomu-input" id="growth-measurementMethod" name="measurementMethod" value={values.measurementMethod} onChange={handleChange} required aria-invalid={Boolean(errors.measurementMethod)} aria-describedby={errors.measurementMethod ? 'growth-method-error' : undefined}>
          <option value="">{t('growth.selectMethod')}</option>
          <option value="recumbent_length">{t('growth.recumbent_length')}</option>
          <option value="standing_height">{t('growth.standing_height')}</option>
        </select>
        {errors.measurementMethod && <p className="growth-measurement-form__error" id="growth-method-error">{t(`growth.${errors.measurementMethod}`)}</p>}
      </div>
      {metrics.some((metric) => values[metric].trim() && assessments[metric].status === 'unavailable') && <p className="growth-measurement-form__neutral" role="status">{t('growth.warningUnavailable')}</p>}
      <Button className="growth-measurement-form__save" type="submit">{t('growth.saveAndView')}</Button>
    </form>
  )
}
