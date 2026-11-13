import { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import Icon from '../../components/doctor/Icon.jsx'
import DoctorModal from '../../components/doctor/DoctorModal.jsx'
import NewPrescriptionModal from '../../components/doctor/NewPrescriptionModal.jsx'
import PrescriptionDetails from '../../components/doctor/PrescriptionDetails.jsx'
import '../../components/doctor/Prescriptions.css'

export default function ChildPrescriptions({ patient, onSavePrescription }) {
  const { t } = useLanguage()
  const p = key => t(`doctor.prescription.${key}`)
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [saved, setSaved] = useState(false)
  const prescriptions = [...(patient.prescriptions || [])].reverse()
  const selected = prescriptions.find(item => item.id === selectedId)
  function save(patientId, draft) {
    if (!onSavePrescription?.(patientId, draft)) return false
    setAdding(false)
    setSaved(true)
    return true
  }

  return (
    <section className="dmr-panel drx-page" aria-labelledby="drx-heading">
      <header className="drx-page-header"><div><h3 id="drx-heading"><Icon name="pill" />{p('title')}</h3><p>{p('subtitle')}</p></div><button className="dd-record-button drx-add" onClick={() => setAdding(true)}><Icon name="add" />{p('add')}</button></header>
      {saved && <div className="dd-success" role="status">{p('success')}<button aria-label={t('doctor.dismissMessage')} onClick={() => setSaved(false)}>×</button></div>}
      {!prescriptions.length ? <div className="drx-empty"><span className="dmr-empty-icon"><Icon name="pill" /></span><h4>{p('emptyTitle')}</h4><p>{p('emptyDescription')}</p></div>
        : <ul className="drx-list">{prescriptions.map(prescription => (
          <li className="drx-card" key={prescription.id}>
            <header><span className="drx-medication-icon"><Icon name="pill" /></span><div><h4 dir="auto">{prescription.medication}</h4>{prescription.strength && <p><span>{p('strengthLabel')}: </span><bdi>{prescription.strength}</bdi></p>}</div><button className="dd-record-button" aria-haspopup="dialog" onClick={() => setSelectedId(prescription.id)}>{p('viewDetails')}<span className="dd-sr-only">: <bdi>{prescription.medication}</bdi></span></button></header>
            <PrescriptionDetails prescription={prescription} />
          </li>
        ))}</ul>}
      <p className="dnv-demo">{p('mockNotice')}</p>
      {adding && <NewPrescriptionModal patient={patient} onSave={save} onClose={() => setAdding(false)} />}
      {selected && <DoctorModal title={p('detailsTitle')} className="drx-details-modal" onClose={() => setSelectedId(null)}><dl className="dnv-child"><div><dt>{t('doctor.childName')}</dt><dd><bdi>{patient.name}</bdi></dd></div><div><dt>{t('doctor.medicalFile')}</dt><dd><bdi>{patient.file}</bdi></dd></div></dl><PrescriptionDetails prescription={selected} includeMedication /></DoctorModal>}
    </section>
  )
}
