import { useLanguage } from '../../contexts/LanguageContext.jsx'
import Icon from './Icon.jsx'
import { recordSections } from './medicalRecordData.js'

export default function MedicalRecordNav({ activeSection, onSelect }) {
  const { t } = useLanguage()
  return (
    <nav className="dmr-navigation" aria-label={t('doctor.medicalRecord.navigation')}>
      {recordSections.map(section => (
        <button
          type="button"
          key={section.id}
          aria-current={activeSection === section.id ? 'page' : undefined}
          aria-controls="dmr-section-content"
          onClick={() => onSelect(section.id)}
        >
          <Icon name={section.icon} />
          <span><strong>{t(`doctor.medicalRecord.${section.title}`)}</strong><small>{t(`doctor.medicalRecord.${section.subtitle}`)}</small></span>
        </button>
      ))}
    </nav>
  )
}
