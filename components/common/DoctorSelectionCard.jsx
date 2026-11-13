import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { Eye, HeartPulse, Brain, Stethoscope, Baby } from 'lucide-react'
import DoctorPortrait from './DoctorPortrait.jsx'
import './DoctorSelectionCard.css'
export default function DoctorSelectionCard({ doctor, selected, disabled, onSelect }) {
  const {language,t}=useLanguage()
  const name=language==='ar'?doctor.nameAr:doctor.name
  const specialty=language==='ar'?doctor.specialtyAr:doctor.specialty
  const icons={ahmad:Eye,rania:Stethoscope,omar:HeartPulse,'demo-doctor-sarah-ahmad':Brain,yazan:Stethoscope,fadi:Baby}
  const Icon=icons[doctor.id]
  return <article className={'nomu-doctor-card'+(selected?' is-selected':'')}>
    <DoctorPortrait className="nomu-doctor-card__portrait" doctorId={doctor.id} alt={name}/>
    <div className="nomu-doctor-card__details"><h3>{name}</h3><p className={'nomu-doctor-card__specialty tone-'+doctor.accent}><Icon size={24} aria-hidden="true"/><span>{specialty}</span></p></div>
    <button type="button" disabled={disabled} aria-pressed={Boolean(selected)} onClick={onSelect}>{t(selected?'doctorProfiles.selectedDoctor':'doctorProfiles.selectDoctor')}</button>
  </article>
}
