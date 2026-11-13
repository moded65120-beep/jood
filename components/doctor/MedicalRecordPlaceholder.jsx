import { useLanguage } from '../../contexts/LanguageContext.jsx'
import Icon from './Icon.jsx'

export default function MedicalRecordPlaceholder({ section, onBack }) {
  const { t } = useLanguage()
  const m = key => t(`doctor.medicalRecord.${key}`)
  return (
    <section className="dmr-panel dmr-coming-soon" aria-labelledby="dmr-coming-heading" role="status">
      <span className="dmr-empty-icon"><Icon name={section.icon} /></span>
      <h3 id="dmr-coming-heading">{m(section.title)}</h3>
      <strong>{m('comingSoon')}</strong>
      <p>{m('comingSoonDescription')}</p>
      <button type="button" className="dd-button dmr-back" onClick={onBack}><Icon name="right" />{m('backToRecord')}</button>
    </section>
  )
}
