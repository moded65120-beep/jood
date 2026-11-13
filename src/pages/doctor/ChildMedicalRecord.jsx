import DoctorPatientGrowth from '../../components/doctor/DoctorPatientGrowth.jsx'
import PatientInitials from '../../components/doctor/PatientInitials.jsx'
import DoctorChildHealth from '../../components/doctor/DoctorChildHealth.jsx'
import ChildClinicalAssessment from './ChildClinicalAssessment.jsx'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import Icon from '../../components/doctor/Icon.jsx'
import MedicalRecordPlaceholder from '../../components/doctor/MedicalRecordPlaceholder.jsx'
import GrowthMeasurementChart from '../../components/doctor/GrowthMeasurementChart.jsx'
import NewMedicalVisitModal from '../../components/doctor/NewMedicalVisitModal.jsx'
import MedicalVisitHistory from '../../components/doctor/MedicalVisitHistory.jsx'
import ChildPrescriptions from './ChildPrescriptions.jsx'
import ChildMedicalNotes from './ChildMedicalNotes.jsx'
import { clinicalNotesFor } from '../../components/doctor/clinicalNotesData.js'
import FollowUpModal from '../../components/doctor/FollowUpModal.jsx'
import { formatFollowUpTime } from '../../components/doctor/followUpData.js'
import FollowUpAppointments from '../../components/doctor/FollowUpAppointments.jsx'
import { ageFromBirthDate, formatMeasurement, measurementSeries, measurementTypes, parseRecordDate, recordSections } from '../../components/doctor/medicalRecordData.js'
import { formatAge, formatDate, patientName } from '../../components/doctor/patientData.js'
import './ChildMedicalRecord.css'

export default function ChildMedicalRecord({ patient, onBack, onSaveVisit, onSavePrescription, onSaveFollowUp, onCancelFollowUp, onSaveNote, onUpdateNote, onSaveAssessment, onVoidAssessment, onAddGrowthMeasurement, onUpdateGrowthNote, navigationRef, onSectionChange }) {
  const { language, t } = useLanguage()
  const [activeSection, setActiveSection] = useState('overview')
  const [visitFormOpen, setVisitFormOpen] = useState(false)
  const [visitSaved, setVisitSaved] = useState(false)
  const [followUpOpen, setFollowUpOpen] = useState(false)
  const [followUpSaved, setFollowUpSaved] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState(null)
  const headingRef = useRef(null)
  const sectionRef = useRef(null)
  const m = key => t(`doctor.medicalRecord.${key}`)
  const missing = m('notRecorded')
  const age = ageFromBirthDate(patient.dateOfBirth)
  const ageText = !age ? missing : [
    age.years > 0 && formatAge(age.years, 'year', language),
    (age.months > 0 || age.years === 0) && formatAge(age.months, 'month', language),
  ].filter(Boolean).join(language === 'ar' ? '، ' : ', ')
  const date = value => parseRecordDate(value) ? formatDate(value, language) : missing
  const gender = patient.gender === 'Female' ? t('doctor.female') : patient.gender === 'Male' ? t('doctor.male') : missing
  const basicInfo = [
    [t('auth.fullName'), patient.name], [t('doctor.gender'), gender],
    [m('dateOfBirth'), date(patient.dateOfBirth)], [t('doctor.age'), ageText],
    [t('doctor.medicalFile'), <bdi key="file">{patient.file}</bdi>],
    [t('auth.nationalId'), <bdi key="id">{patient.nationalId}</bdi>],
  ]
  const notes = clinicalNotesFor(patient).slice(0, 3).map(note => ({ ...note, text: note.observations || note.diagnosis || note.plan }))
  const active = recordSections.find(section => section.id === activeSection)
  const latestMeasurements = Object.entries(measurementTypes).map(([type, info]) => {
    const latest = measurementSeries(patient.growthMeasurements, type).at(-1)
    return { label: `${m(info.label)} (${m(type === 'weight' ? 'kg' : 'cm')})`, icon: info.icon, value: latest ? formatMeasurement(latest.value, type, language) : missing, detail: latest ? `${m('lastUpdated')} ${date(latest.date)}` : m('noMeasurement') }
  })
  const summaries = [
    ...latestMeasurements,
    { label: t('doctor.lastVisit'), icon: 'calendar', value: date(patient.lastVisit), detail: patient.lastVisitDoctor || m('doctorNotRecorded') },
    { label: m('missedVisits'), icon: 'alert', value: Number.isInteger(patient.missedVisits) && patient.missedVisits >= 0 ? new Intl.NumberFormat(language).format(patient.missedVisits) : missing, detail: patient.missedVisits === 0 ? m('noMissedVisits') : Number.isInteger(patient.missedVisits) && patient.missedVisits > 0 ? m('visitHistory') : m('noVisitHistory') },
    { label: t('doctor.nextFollowUp'), icon: 'followup', value: patient.nextFollowUp ? date(patient.nextFollowUp) : m('notScheduled'), detail: [m('followupDetail'), formatFollowUpTime(patient.nextFollowUpTime, language)].filter(Boolean).join(' · ') },
  ]

  useEffect(() => { headingRef.current?.focus() }, [patient.id])
  function selectSection(id) {
    setActiveSection(id)
    onSectionChange?.(id)
    sectionRef.current?.focus({ preventScroll: true })
  }
  useImperativeHandle(navigationRef, () => ({ navigate: selectSection }))
  function openFollowUp(appointment) { setEditingAppointment(appointment); setFollowUpOpen(true) }
  function cancelAppointment(id) {
    setFollowUpSaved(onCancelFollowUp?.(patient.id, id) ? 'cancelledSuccess' : 'actionError')
  }
  function updateFollowUp(patientId, draft) {
    if (!onSaveFollowUp?.(patientId, draft)) return false
    setFollowUpOpen(false)
    setFollowUpSaved('success')
    return true
  }
  function saveVisit(patientId, draft) {
    if (!onSaveVisit?.(patientId, draft)) return false
    setVisitFormOpen(false)
    selectSection('visits')
    setVisitSaved(true)
    return true
  }

  return (
    <div className={`dmr-page${activeSection === 'growth' ? ' dmr-page--growth' : ''}`} lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="dmr-record-toolbar">
        <button className="dd-button dmr-back" onClick={onBack}><Icon name="right" />{m('backToPatients')}</button>
        {activeSection !== 'overview' && <button className="dd-button" onClick={() => selectSection('overview')}>{m('backToRecord')}</button>}
      </div>
      <section className="dmr-profile" aria-labelledby="dmr-child-name">
        <PatientInitials name={patientName(patient, language)} gender={patient.gender} className="dmr-avatar" />
        <div className="dmr-profile-content">
          <div className="dmr-name"><h2 id="dmr-child-name" ref={headingRef} tabIndex="-1"><bdi>{patient.name}</bdi></h2><span className="dmr-gender">{gender}</span></div>
          <dl className="dmr-profile-facts">{basicInfo.slice(2).map(([label, value]) => <div key={label}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}</dl>
        </div>
      </section>
      {visitSaved && <div className="dd-success dmr-visit-success" role="status"><span>{t('doctor.newVisit.success')} <small>{t('doctor.newVisit.mockNotice')}</small></span><button aria-label={t('doctor.dismissMessage')} onClick={() => setVisitSaved(false)}>×</button></div>}
      {followUpSaved && <div className={followUpSaved === 'actionError' ? 'dd-success dd-error' : 'dd-success'} role={followUpSaved === 'actionError' ? 'alert' : 'status'}>{t(`doctor.followUp.${followUpSaved}`)}<button aria-label={t('doctor.dismissMessage')} onClick={() => setFollowUpSaved(false)}>×</button></div>}
      <div className="dmr-layout">
        <div id="dmr-section-content" className="dmr-section-content" ref={sectionRef} tabIndex="-1">
          {activeSection === 'overview' ? (
            <div className="dmr-overview">
              <div className="dmr-medical-column">
                <section className="dmr-summaries" aria-label={m('medicalSummary')}>
                  {summaries.map((summary, index) => <article className={`dmr-summary${index % 2 === 0 ? ' dmr-summary-pink' : ''}`} key={summary.label}><span className="dmr-summary-icon"><Icon name={summary.icon} /></span><div><h3>{summary.label}</h3><strong><bdi>{summary.value}</bdi></strong><small>{summary.detail}</small></div></article>)}
                </section>
                <GrowthMeasurementChart measurements={patient.growthMeasurements} />
              </div>
              <div className="dmr-information-column">
                <section className="dmr-panel" aria-labelledby="dmr-basic-info"><header className="dmr-panel-header"><h3 id="dmr-basic-info"><Icon name="user" />{m('basicInformation')}</h3></header><dl className="dmr-basic-info">{basicInfo.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
                <section className="dmr-panel" aria-labelledby="dmr-recent-notes"><header className="dmr-panel-header"><h3 id="dmr-recent-notes"><Icon name="notes" />{m('recentNotes')}</h3></header>{notes.length ? <ul className="dmr-notes">{notes.map((note, index) => <li key={note.id || `${note.date}-${index}`}><time dateTime={note.date}><bdi>{date(note.date)}</bdi></time><p dir="auto">{note.text}</p>{note.doctor && <small dir="auto">{note.doctor}</small>}</li>)}</ul> : <div className="dmr-notes-empty"><strong>{m('noNotesTitle')}</strong><p>{m('noNotesDescription')}</p></div>}</section>
              </div>
            </div>
          ) : activeSection === 'visits' ? (
            <MedicalVisitHistory visits={patient.medicalVisits} onAdd={() => setVisitFormOpen(true)} />
          ) : activeSection === 'followup' ? (
            <FollowUpAppointments patient={patient} onEdit={openFollowUp} onCancel={cancelAppointment} />
          ) : activeSection === 'prescriptions' ? (
            <ChildPrescriptions key={patient.id} patient={patient} onSavePrescription={onSavePrescription} />
          ) : activeSection === 'clinical' ? (
            <ChildClinicalAssessment onVoidAssessment={onVoidAssessment} key={patient.id} patient={patient} onSaveAssessment={onSaveAssessment} onCancel={() => selectSection('overview')} />
          ) : activeSection === 'notes' ? (
            <ChildMedicalNotes key={patient.id} patient={patient} onSaveNote={onSaveNote} onUpdateNote={onUpdateNote} />
          ) : activeSection === 'growth' ? (
            <DoctorPatientGrowth key={patient.id} patient={patient} onSave={onAddGrowthMeasurement} onSaveNote={onUpdateGrowthNote} />
          ) : ['vaccinations', 'milestones'].includes(activeSection) ? (
            <DoctorChildHealth key={patient.id} patient={patient} section={activeSection} onBack={() => selectSection('overview')} />
          ) : (
            <MedicalRecordPlaceholder section={active} onBack={() => selectSection('overview')} />
          )}
        </div>
      </div>
      {visitFormOpen && <NewMedicalVisitModal patient={patient} onSave={saveVisit} onClose={() => setVisitFormOpen(false)} />}
      {followUpOpen && <FollowUpModal patient={patient} appointment={editingAppointment} onSave={updateFollowUp} onClose={() => setFollowUpOpen(false)} />}
    </div>
  )
}
