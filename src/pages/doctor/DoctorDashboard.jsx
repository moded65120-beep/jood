import { getDoctorProfile } from '../../services/doctorDirectory.js'
import { currentDoctorProfile } from '../../services/currentDoctorProfile.js'
import DoctorProfile from './DoctorProfile.jsx'
import useUnifiedDemoUser from '../../hooks/useUnifiedDemoUser.js'
import PatientRecordNavigation from '../../components/doctor/MedicalRecordQuickActions.jsx'
import { matchesAgeGroup } from '../../components/doctor/ageGroupFilter.js'
import nomuLogo from '../../assets/mother/nomu-logo-transparent-test.png'
import { useNavigate } from 'react-router-dom'
import { logoutDoctorDemo } from '../../services/doctorDemoAuth.js'
import DoctorCalendar, { RequestInformation } from './DoctorCalendar.jsx'
import useDoctorBookings from '../../components/doctor/useDoctorBookings.js'
import { DEFAULT_DOCTOR_ID } from '../../components/doctor/appointmentsData.js'
import { useRef, useState } from 'react'
import { useDoctorMedicalRecords } from '../../contexts/MedicalRecordContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import LanguageSwitcher from '../../components/common/LanguageSwitcher.jsx'
import Card from '../../components/common/Card.jsx'
import Icon from '../../components/doctor/Icon.jsx'
import DoctorAvatar from '../../components/doctor/DoctorAvatar.jsx'
import DoctorModal from '../../components/doctor/DoctorModal.jsx'
import AddPatientModal from '../../components/doctor/AddPatientModal.jsx'
import PatientTable from '../../components/doctor/PatientTable.jsx'
import ChildMedicalRecord from './ChildMedicalRecord.jsx'
import { today, followUpStatus, patientName } from '../../components/doctor/patientData.js'
import './DoctorDashboard.css'
import './DoctorTypography.css'

// A future authentication integration can supply the logged-in doctor here.
export default function DoctorDashboard({ doctor: suppliedDoctor, profilePage = false } = {}) {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const authenticatedUser = useUnifiedDemoUser()
  const activeProfile = currentDoctorProfile()
  const doctor = activeProfile || suppliedDoctor || getDoctorProfile(DEFAULT_DOCTOR_ID)
  const canEditMedical = !authenticatedUser || authenticatedUser.clinicalEditing === true
  function logout() {
    logoutDoctorDemo()
    navigate('/doctor/login', { replace: true })
  }
  const number = new Intl.NumberFormat(language)
  const bookings = useDoctorBookings(doctor.id || DEFAULT_DOCTOR_ID)
  const [calendarTarget, setCalendarTarget] = useState(null)
  const pendingBookings = bookings.state.requests.filter(item => item.status === 'pending')
  function openCalendar(tab = 'availability', requestId = null) {
    if (!canEditMedical) { setModal('permissions'); return }
    setCalendarTarget({ tab, requestId, key: crypto.randomUUID() }); setMenuOpen(false); setModal(null)
    if (profilePage) navigate('/doctor')
  }
  const doctorName = authenticatedUser?.role === 'nurse' ? authenticatedUser.name : (language === 'ar' ? doctor.nameAr || doctor.name : doctor.name)
  const welcomeName = doctorName
  const specialty = authenticatedUser?.role === 'nurse' ? t('unifiedLogin.roles.nurse') : language === 'ar' ? doctor.specialtyAr : doctor.specialty
  const medical = useDoctorMedicalRecords({ ...doctor, id: doctor.id || DEFAULT_DOCTOR_ID })
  const { patients } = medical
  const [search, setSearch] = useState('')
  const [age, setAge] = useState('all')
  const [gender, setGender] = useState('all')
  const [followUp, setFollowUp] = useState('all')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const recordNavigation = useRef(null)
  const [recordSection, setRecordSection] = useState('overview')
  const [notice, setNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const selectedPatient = patients.find(patient => patient.id === selectedPatientId)
  const filtered = patients.filter(patient => {
    const matchesSearch = `${patient.name} ${patient.nameAr || ''} ${patient.nationalId} ${patient.file}`.toLowerCase().includes(search.trim().toLowerCase())
    const matchesAge = matchesAgeGroup(patient, age)
    return matchesSearch && matchesAge && (gender === 'all' || patient.gender === gender) && (followUp === 'all' || followUpStatus(patient) === followUp)
  })
  function updateFilter(setter, value) { setter(value); setPage(1) }
  function viewRecord(patient) { if (!canEditMedical) { setModal('permissions'); return } setRecordSection('overview'); setSelectedPatientId(patient.id); setMenuOpen(false) }
  function backToPatients() { setSelectedPatientId(null); setCalendarTarget(null); if (profilePage) navigate('/doctor') }
  function addVisit(patientId, draft) { return canEditMedical && patientId === selectedPatientId && medical.act(patientId, 'visit', draft) }
  function addPatient(patient) {
    if (!canEditMedical) return false
    if (!medical.assignChild(patient.id)) return false
    setNotice(patient); setModal(null)
    return true
  }
  function addPrescription(patientId, draft) { return canEditMedical && patientId === selectedPatientId && medical.act(patientId, 'prescription', draft) }
  function updateFollowUp(patientId, draft) { return canEditMedical && patientId === selectedPatientId && medical.act(patientId, 'followUp', draft) }
  function cancelAppointment(patientId, appointmentId) { return canEditMedical && patientId === selectedPatientId && medical.act(patientId, 'cancelFollowUp', appointmentId) }
  function voidChildAssessment(patientId, assessmentId, reason) { return canEditMedical && patientId === selectedPatientId && medical.act(patientId, 'voidAssessment', assessmentId, reason) }
  function storeAssessment(patientId, draft, editing) { return canEditMedical && patientId === selectedPatientId && medical.act(patientId, 'assessment', draft, editing) }
  function updateGrowthNote(patientId, draft) { return canEditMedical && patientId === selectedPatientId && medical.act(patientId, 'updateGrowthNote', draft) }
  function addGrowthMeasurement(patientId, draft) { return canEditMedical && patientId === selectedPatientId && medical.act(patientId, 'addGrowthMeasurement', draft) }
  function addNote(patientId, draft) { return canEditMedical && patientId === selectedPatientId && medical.act(patientId, 'note', draft) }
  function editNote(patientId, noteId, draft) { return canEditMedical && patientId === selectedPatientId && medical.act(patientId, 'editNote', noteId, draft) }
  return (
    <div className="doctor-dashboard" lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <aside className={`dd-sidebar ${menuOpen ? 'dd-sidebar-open' : ''}`} aria-label={t('doctor.sidebar')}>
        <a className="dd-brand" href="/doctor" aria-label={t('doctor.brandLabel')}><img src={nomuLogo} alt="nomu | نمو" /></a>
        <div className="dd-sidebar-scroll"><nav aria-label={t('doctor.dashboardNavigation')}>
          <button className={calendarTarget || profilePage ? undefined : "dd-nav-active"} aria-current={calendarTarget || profilePage ? undefined : "page"} onClick={() => { backToPatients(); setMenuOpen(false) }}><Icon name="patients" />{t('doctor.patients')}</button>
          <button className={calendarTarget && !profilePage ? 'dd-nav-active' : undefined} aria-current={calendarTarget && !profilePage ? 'page' : undefined} onClick={() => openCalendar()}><Icon name="calendar" />{t('doctor.calendar')}</button>
          <button className={profilePage ? 'dd-nav-active' : undefined} aria-current={profilePage ? 'page' : undefined} onClick={() => { if (!activeProfile) { setModal('permissions'); return } navigate('/doctor/profile'); setModal(null); setMenuOpen(false) }}><Icon name="user" />{t('doctor.profile')}</button>
        </nav>
        {selectedPatient && !calendarTarget && !profilePage && <PatientRecordNavigation activeSection={recordSection} onSelect={id => { recordNavigation.current?.navigate(id); setMenuOpen(false) }} />}</div>
        <div className="dd-botanical" aria-hidden="true"><span /><span /><span /></div>
        <button className="dd-logout" onClick={() => setModal('logout')}><Icon name="logout" />{t('common.logout')}</button>
      </aside>
      <div className="dd-workspace">
        <header className="dd-topbar">
          <button className="dd-menu dd-icon-button" aria-label={t('doctor.toggleSidebar')} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" /></button>
          <h1>{t(profilePage ? 'doctorProfilePage.title' : calendarTarget ? 'doctor.booking.title' : selectedPatient ? 'navigation.medicalRecord' : 'navigation.doctorDashboard')}</h1>
          <button className="dd-notification dd-icon-button" aria-label={t('doctor.viewNotifications')} onClick={() => setModal('notifications')}><Icon name="bell" />{pendingBookings.length > 0 && <span className="dc-notification-count">{number.format(pendingBookings.length)}</span>}</button>
          <div className="dd-doctor"><DoctorAvatar doctorId={activeProfile?.id} /><div><strong>{doctorName}</strong><small>{specialty}</small></div></div>
          <LanguageSwitcher />
        </header>
        {medical.warning && <p className="dd-error" role="alert">{t('doctor.notesDiagnosis.' + medical.warning)}</p>}
        {profilePage ? activeProfile ? <DoctorProfile key={activeProfile.id} doctor={activeProfile} /> : <p className="dd-error" role="alert">{t('unifiedLogin.nurseLimited')}</p> : calendarTarget ? <DoctorCalendar key={calendarTarget.key} bookings={bookings} initialTab={calendarTarget.tab} initialRequestId={calendarTarget.requestId} /> : selectedPatient ? <ChildMedicalRecord navigationRef={recordNavigation} onSectionChange={setRecordSection} onUpdateGrowthNote={updateGrowthNote} onAddGrowthMeasurement={addGrowthMeasurement} onVoidAssessment={voidChildAssessment} onSaveAssessment={storeAssessment} key={selectedPatient.id} patient={selectedPatient} onBack={backToPatients} onSaveVisit={addVisit} onSavePrescription={addPrescription} onSaveFollowUp={updateFollowUp} onCancelFollowUp={cancelAppointment} onSaveNote={addNote} onUpdateNote={editNote} /> : <div className="dd-content">
          <section className="dd-welcome" aria-labelledby="dd-welcome-title"><h2 id="dd-welcome-title">{t('doctor.welcome').replace('{name}', welcomeName)} <span>👋</span></h2><p>{t('doctor.welcomeSubtitle')}</p></section>
          <section className="dd-summary" aria-label={t('doctor.patientSummary')}>
            {[[t('doctor.totalPatients'), patients.length, 'patients'], [t('doctor.todayVisits'), patients.filter(p => p.visits.includes(today)).length, 'calendar'], [t('doctor.upcomingFollowUps'), patients.filter(p => followUpStatus(p) === 'Upcoming').length, 'followup']].map(([label, value, icon], index) => <Card className={`dd-stat ${index === 1 ? 'dd-pink' : ''}`} key={label}><span className="dd-stat-icon"><Icon name={icon} /></span><div><p>{label}</p><strong>{number.format(value)}</strong></div></Card>)}
            <button className="dd-stat dd-pink dd-add" disabled={!canEditMedical} onClick={() => setModal('add')}><span className="dd-stat-icon"><Icon name="add" /></span><span><strong>{t('doctor.addExistingPatient')}</strong><small>{t('doctor.addCardSubtitle')}</small></span><Icon name="right" /></button>
          </section>
          {notice && <div className="dd-success" role="status">{t('doctor.patientAdded').replace('{name}', patientName(notice, language))}<button aria-label={t('doctor.dismissMessage')} onClick={() => setNotice('')}>×</button></div>}
          <section className="dd-filters" aria-label={t('doctor.searchAndFilter')}>
            <label className="dd-search"><span className="dd-sr-only">{t('doctor.searchPatients')}</span><Icon name="search" /><input value={search} onChange={e => updateFilter(setSearch, e.target.value)} placeholder={t('doctor.searchPlaceholder')} /></label>
            <label>{t('doctor.ageGroup')}<select value={age} onChange={e => updateFilter(setAge, e.target.value)}><option value="all">{t('doctor.all')}</option><option value="infant">{t('doctor.infant')}</option><option value="toddler">{t('doctor.toddler')}</option><option value="child">{t('doctor.child')}</option></select></label>
            <label>{t('doctor.gender')}<select value={gender} onChange={e => updateFilter(setGender, e.target.value)}><option value="all">{t('doctor.all')}</option><option value="Female">{t('doctor.female')}</option><option value="Male">{t('doctor.male')}</option></select></label>
            <label>{t('doctor.nextFollowUp')}<select value={followUp} onChange={e => updateFilter(setFollowUp, e.target.value)}><option value="all">{t('doctor.all')}</option><option value="Upcoming">{t('doctor.upcoming')}</option><option value="Overdue">{t('doctor.overdue')}</option><option value="No Follow-up">{t('doctor.noFollowUp')}</option></select></label>
            <button className="dd-button dd-clear" onClick={() => { setSearch(''); setAge('all'); setGender('all'); setFollowUp('all'); setPage(1) }}><Icon name="reset" />{t('doctor.clearFilters')}</button>
          </section>
          <PatientTable patients={filtered} page={page} onPageChange={setPage} onViewRecord={viewRecord} />
          <p className="dd-demo-note">{t('doctor.demoNote')}</p>
        </div>}
      </div>
      {modal === 'add' && <AddPatientModal patients={patients} onAdd={addPatient} onClose={() => setModal(null)} />}
      {modal && modal !== 'add' && <DoctorModal title={{ permissions: t('unifiedLogin.permissionsTitle'), logout: t('doctor.logoutTitle'), notifications: t('doctor.notifications') }[modal]} onClose={() => setModal(null)}>
        {modal === 'permissions' && <p>{t('unifiedLogin.nurseLimited')}</p>}
        {modal === 'logout' && <><p>{t('doctorAuth.logoutConfirm')}</p><button className="dd-button" onClick={logout}>{t('common.logout')}</button></>}
        {modal === 'notifications' && <div className="dc-notifications"><p>{t('doctor.booking.demoNotice')}</p><strong>{t('doctor.booking.pendingCount')}: {number.format(pendingBookings.length)}</strong>{pendingBookings.length ? pendingBookings.map(request => <article key={request.id}><p>{t('doctor.booking.notification')}</p><RequestInformation request={request} /><button className="dd-record-button" onClick={() => openCalendar('requests', request.id)}>{t('doctor.booking.openRequest')}</button></article>) : <p>{t('doctor.noNotifications')}</p>}</div>}
      </DoctorModal>}
    </div>
  )
}

