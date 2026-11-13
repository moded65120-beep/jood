import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { formatDate } from './patientData.js'
import { prescriptionFields } from './prescriptionData.js'

export default function PrescriptionDetails({ prescription, includeMedication = false }) {
  const { language, t } = useLanguage()
  const p = key => t(`doctor.prescription.${key}`)
  const fields = prescriptionFields.filter(field => field !== 'instructions' && (includeMedication || field !== 'medication') && (field !== 'strength' || includeMedication) && prescription[field])
  return (
    <dl className="drx-details">
      {fields.map(field => <div key={field} className={field === 'medication' ? 'drx-full' : ''}><dt>{p(field === 'strength' ? 'strengthLabel' : field)}</dt><dd dir="auto">{field === 'route' ? p(`routes.${prescription.route}`) : prescription[field]}</dd></div>)}
      <div><dt>{p('datePrescribed')}</dt><dd><bdi>{formatDate(prescription.datePrescribed, language)}</bdi></dd></div>
      <div><dt>{p('doctor')}</dt><dd><bdi>{prescription.doctor}</bdi></dd></div>
      {prescription.instructions && <div className="drx-full drx-instructions"><dt>{p('instructionsLabel')}</dt><dd dir="auto">{prescription.instructions}</dd></div>}
    </dl>
  )
}
