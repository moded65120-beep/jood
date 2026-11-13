import { useLanguage } from '../../contexts/LanguageContext.jsx'
import Icon from './Icon.jsx'
import { Star } from 'lucide-react'

// The original record actions now live in the existing dashboard sidebar.
export default function MedicalRecordQuickActions({ onSelect, activeSection = 'overview' }) {
  const { t } = useLanguage()
  return <nav className="dd-patient-nav" aria-labelledby="dd-patient-nav-title"><h2 id="dd-patient-nav-title">{t('doctor.patientRecordNav.title')}</h2>{[['visits','calendar'],['clinical','stethoscope'],['notes','notes'],['prescriptions','pill'],['followup','followup'],['growth','growth'],['vaccinations','syringe'],['milestones','star']].map(([id,icon]) => <button key={id} type="button" className={activeSection === id ? 'dd-nav-active' : undefined} aria-current={activeSection === id ? 'location' : undefined} aria-controls="dmr-section-content" onClick={() => onSelect(id)}>{id === 'milestones' ? <Star size={24} strokeWidth={1.65} aria-hidden="true" /> : <Icon name={icon} />}{t('doctor.patientRecordNav.' + id)}</button>)}</nav>
}
