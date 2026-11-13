import './PatientInitials.css'

export default function PatientInitials({ name = '', gender, className = '' }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join('').toLocaleUpperCase()
  return <span className={`doctor-patient-initials ${gender === 'Female' ? 'doctor-patient-initials--pink' : ''} ${className}`} aria-hidden="true" dir="auto">{initials}</span>
}
