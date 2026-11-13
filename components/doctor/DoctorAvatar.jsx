import DoctorPortrait from '../common/DoctorPortrait.jsx'
export default function DoctorAvatar({ doctorId }) {
  return doctorId ? <span className="dd-doctor-avatar"><DoctorPortrait doctorId={doctorId}/></span> : <span className="dd-doctor-avatar" aria-hidden="true" dir="ltr">SA</span>
}
