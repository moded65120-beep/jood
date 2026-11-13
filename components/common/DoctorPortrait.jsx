import useDoctorPhoto from '../../hooks/useDoctorPhoto.js'
import { getDoctorProfile } from '../../services/doctorDirectory.js'
export default function DoctorPortrait({ doctorId, className = '', alt = '' }) {
  const src=useDoctorPhoto(doctorId)
  return <img className={className} src={src} alt={alt} onError={event=>{ const fallback=getDoctorProfile(doctorId)?.defaultImage; if(fallback && !event.currentTarget.src.endsWith(fallback))event.currentTarget.src=fallback }}/>
}
