import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { canonicalChildId, motherChildIds } from '../../services/demoChildAccess.js'
import { ageFromBirthDate } from './medicalRecordData.js'
import VaccinationSchedule from '../child-health/VaccinationSchedule.jsx'
import DevelopmentalMilestones from '../child-health/DevelopmentalMilestones.jsx'

export default function DoctorChildHealth({ patient, section, onBack }) {
  const { language, t } = useLanguage()
  const id = canonicalChildId(patient.id)
  if (!id) return <p role="alert">{t('mother.childNotFound')}</p>
  const child = { ...patient, id, name: language === 'ar' ? patient.nameAr || patient.name : patient.name }
  const age = ageFromBirthDate(child.dateOfBirth)
  const currentAge = age ? age.years * 12 + age.months : undefined
  const motherId = Object.entries(motherChildIds).find(([, ids]) => ids.includes(id))?.[0] || null
  // The existing components subscribe to the shared repositories. Vaccination
  // save callbacks already persist the whole visit, including notes-only edits;
  // never pass the general medical onSaveFollowUp callback into this section.
  return <div className="doctor-child-health">
    {section === 'vaccinations' && <VaccinationSchedule key={id} role="doctor" child={child} currentAge={currentAge} />}
    {section === 'milestones' && <DevelopmentalMilestones key={id} role="doctor" child={child} motherId={motherId} currentAge={currentAge} onBack={onBack} />}
  </div>
}
