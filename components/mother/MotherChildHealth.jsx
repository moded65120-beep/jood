import { useMotherMilestoneNavigation } from '../../hooks/useMotherNavigation.js'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { useMotherMedicalRecords } from '../../contexts/MedicalRecordContext.jsx'
import { canonicalChildId, demoMotherId } from '../../services/demoChildAccess.js'
import { ageFromBirthDate } from '../doctor/medicalRecordData.js'
import VaccinationSchedule from '../child-health/VaccinationSchedule.jsx'
import DevelopmentalMilestones from '../child-health/DevelopmentalMilestones.jsx'
import MotherGrowthChart from '../../pages/mother/MotherGrowthChart.jsx'
import { growthSex, whoMeasurements } from '../../services/growthMeasurementAdapter.js'

export default function MotherChildHealth({ childId: routeChildId, section }) {
  const { language, t } = useLanguage()
  const navigation = useMotherMilestoneNavigation(section === 'milestones')
  const { children, getMedicalRecord } = useMotherMedicalRecords(demoMotherId)
  const id = canonicalChildId(routeChildId)
  const profile = children.find(child => child.id === id)
  if (!profile) return <p className="child-not-found">{t('mother.childNotFound')}</p>
  const child = { ...profile, name: language === 'ar' ? profile.nameAr || profile.name : profile.name }
  const age = ageFromBirthDate(child.dateOfBirth)
  const currentAge = age ? age.years * 12 + age.months : undefined
  const ageText = age ? new Intl.NumberFormat(language, { style: 'unit', unit: 'month', unitDisplay: 'long' }).format(currentAge) : t('portal.notProvided')
  return <>
    <header className="child-profile">
      <span className="child-profile-avatar" aria-hidden="true">{child.name.trim().split(/\s+/u).map(part => Array.from(part)[0]).slice(0, 2).join('')}</span>
      <div><h1>{child.name}</h1><p>{ageText} · {t(child.gender === 'Female' ? 'doctor.female' : 'doctor.male')}</p></div>
    </header>
    <div className="child-health-section">
      {section === 'growth-chart' && <MotherGrowthChart key={id} child={{ ...child, sex: growthSex(child) }} measurements={whoMeasurements(id, getMedicalRecord(id)?.growthMeasurements || [])} />}
      {section === 'vaccinations' && <VaccinationSchedule key={id} role="mother" child={child} currentAge={currentAge} />}
      {section === 'milestones' && <DevelopmentalMilestones key={id} role="mother" motherId={demoMotherId} child={child} currentAge={currentAge} navigation={navigation} onBack={() => navigation.backToChild('/mother/children/' + routeChildId)} stickyOffset={0} />}
    </div>
  </>
}
