import { canonicalChildId } from '../../services/demoChildAccess.js'
import { growthSex, whoMeasurements } from '../../services/growthMeasurementAdapter.js'
import DoctorGrowthChart from '../../pages/doctor/DoctorGrowthChart.jsx'

export default function DoctorPatientGrowth({ patient, onSave, onSaveNote }) {
  const id = canonicalChildId(patient.id)
  const child = { id, name: { en: patient.name, ar: patient.nameAr || patient.name }, dateOfBirth: patient.dateOfBirth, sex: growthSex(patient) }
  const measurements = (patient.growthMeasurements || []).flatMap((record, index) => whoMeasurements(id, [record]).map(value => ({ ...value, noteKey: record.id ? 'id:' + record.id : 'legacy:' + index, noteIndex: index, noteVersion: JSON.stringify(record) })))
  return <DoctorGrowthChart key={id || patient.id} child={child} measurements={measurements} onSave={record => Boolean(id && onSave?.(id, record))} onSaveNote={draft => Boolean(id && onSaveNote?.(id, draft))} />
}
