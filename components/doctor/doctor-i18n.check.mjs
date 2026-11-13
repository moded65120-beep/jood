import assert from 'node:assert/strict'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import en from '../../locales/en/translations.js'
import ar from '../../locales/ar/translations.js'
import { ageFromBirthDate, measurementSeries, recordSections } from './medicalRecordData.js'
import { followUpDraft, saveFollowUp } from './followUpData.js'

// Birthday boundaries, leap days, invalid dates and absent measurements.
assert.deepEqual(ageFromBirthDate('2024-03-15', new Date(2026, 2, 14)), { years: 1, months: 11 })
assert.deepEqual(ageFromBirthDate('2024-03-15', new Date(2026, 2, 15)), { years: 2, months: 0 })
assert.deepEqual(ageFromBirthDate('2024-02-29', new Date(2025, 1, 28)), { years: 1, months: 0 })
assert.equal(ageFromBirthDate('2027-01-01', new Date(2026, 0, 1)), null)
assert.equal(ageFromBirthDate('2024-02-31'), null)
assert.equal(ageFromBirthDate(undefined), null)
assert.deepEqual(measurementSeries([], 'weight'), [])
const chartFixture = [
  { date: '2025-03-01', weight: 8.4 }, { date: '2025-01-01', weight: 7.2 },
  { date: 'invalid', weight: 9 }, { date: '2025-04-01', weight: -1 },
  { date: '2025-03-01', weight: 8.5 }, { date: '2025-06-01', height: 72 },
]
assert.deepEqual(measurementSeries(chartFixture, 'weight'), [{ date: '2025-01-01', value: 7.2 }, { date: '2025-03-01', value: 8.5 }])
assert.deepEqual(recordSections.map(section => section.id), ['overview', 'growth', 'vaccinations', 'milestones', 'clinical', 'notes', 'prescriptions', 'followup'])

// Exercise the actual shared provider and dashboard components without adding test dependencies.
// This verifies rendering, not browser clicks or visual layout.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const previousWindow = globalThis.window
try {
  const { MedicalRecordProvider } = await server.ssrLoadModule('/src/contexts/MedicalRecordContext.jsx')
  const { LanguageProvider } = await server.ssrLoadModule('/src/contexts/LanguageContext.jsx')
  const { default: Dashboard } = await server.ssrLoadModule('/src/pages/doctor/DoctorDashboard.jsx')
  const { default: AddModal } = await server.ssrLoadModule('/src/components/doctor/AddPatientModal.jsx')
  const { default: Table } = await server.ssrLoadModule('/src/components/doctor/PatientTable.jsx')
  const { default: Record } = await server.ssrLoadModule('/src/pages/doctor/ChildMedicalRecord.jsx')
  const { default: QuickActions } = await server.ssrLoadModule('/src/components/doctor/MedicalRecordQuickActions.jsx')
  const { default: Placeholder } = await server.ssrLoadModule('/src/components/doctor/MedicalRecordPlaceholder.jsx')
  const { default: Chart } = await server.ssrLoadModule('/src/components/doctor/GrowthMeasurementChart.jsx')
  const { default: VisitForm } = await server.ssrLoadModule('/src/components/doctor/NewMedicalVisitModal.jsx')
  const { default: VisitHistory } = await server.ssrLoadModule('/src/components/doctor/MedicalVisitHistory.jsx')
  const { default: PrescriptionPage } = await server.ssrLoadModule('/src/pages/doctor/ChildPrescriptions.jsx')
  const { default: PrescriptionForm } = await server.ssrLoadModule('/src/components/doctor/NewPrescriptionModal.jsx')
  const { default: PrescriptionDetails } = await server.ssrLoadModule('/src/components/doctor/PrescriptionDetails.jsx')
  const { default: FollowUpForm } = await server.ssrLoadModule('/src/components/doctor/FollowUpModal.jsx')
  const { default: FollowUpList } = await server.ssrLoadModule('/src/components/doctor/FollowUpAppointments.jsx')
  const { default: NotesPage } = await server.ssrLoadModule('/src/pages/doctor/ChildMedicalNotes.jsx')
  const { default: NoteForm } = await server.ssrLoadModule('/src/components/doctor/NewMedicalNoteModal.jsx')
  const { default: NoteDetails } = await server.ssrLoadModule('/src/components/doctor/MedicalNoteDetails.jsx')
  const data = await server.ssrLoadModule('/src/components/doctor/patientData.js')
  const sources = [
    '../../pages/doctor/DoctorDashboard.jsx', './PatientTable.jsx', './AddPatientModal.jsx', './DoctorModal.jsx',
    '../../pages/doctor/ChildMedicalRecord.jsx', './MedicalRecordQuickActions.jsx', './MedicalRecordPlaceholder.jsx', './GrowthMeasurementChart.jsx',
    './NewMedicalVisitModal.jsx', './MedicalVisitHistory.jsx',
    '../../pages/doctor/ChildPrescriptions.jsx', './NewPrescriptionModal.jsx', './PrescriptionDetails.jsx',
    './FollowUpModal.jsx', './FollowUpAppointments.jsx',
    '../../pages/doctor/ChildMedicalNotes.jsx', './NewMedicalNoteModal.jsx', './MedicalNoteDetails.jsx',
  ].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n')
  const keys = [...sources.matchAll(/\bt\(['"]([^'"]+)['"]\)/g)].map(match => match[1])
  const lookup = (dictionary, key) => key.split('.').reduce((value, part) => value?.[part], dictionary)
  const escapeText = text => renderToStaticMarkup(createElement('span', null, text)).slice(6, -7)
  assert.deepEqual(Object.keys(ar.doctor).sort(), Object.keys(en.doctor).sort())
  for (const dictionary of [en, ar]) {
    for (const key of keys) assert.equal(typeof lookup(dictionary, key), 'string', `Missing ${key}`)
    const checkValues = values => {
      for (const value of Object.values(values)) {
        if (typeof value === 'object') checkValues(value)
        else assert.ok(!value.includes('???'))
      }
    }
    checkValues(dictionary.doctor)
    assert.deepEqual(Object.keys(ar.doctor.medicalRecord).sort(), Object.keys(en.doctor.medicalRecord).sort())
    for (const section of recordSections) {
      assert.equal(typeof dictionary.doctor.medicalRecord[section.title], 'string')
      assert.equal(typeof dictionary.doctor.medicalRecord[section.subtitle], 'string')
    }
  }

  for (const language of ['en', 'ar']) {
    globalThis.window = { localStorage: { getItem: key => key === 'nomu.language' ? language : null } }
    const dictionary = language === 'ar' ? ar : en
    const render = (Component, props = {}) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(LanguageProvider, null, createElement(MedicalRecordProvider, null, createElement(Component, props)))))
    const dashboard = render(Dashboard)
    assert.ok(dashboard.includes(`dir="${language === 'ar' ? 'rtl' : 'ltr'}"`))
    for (const key of ['totalPatients', 'todayVisits', 'upcomingFollowUps', 'searchPlaceholder', 'viewRecord']) {
      assert.ok(dashboard.includes(escapeText(dictionary.doctor[key])), `${language}: ${key}`)
    }
    assert.ok(dashboard.includes(language === 'ar' ? 'حنين خليل' : 'Haneen Khalil'))
    assert.ok(!dashboard.includes('images/female-doctor.png'))
    assert.ok(!dashboard.includes('child_girl_avatar.png'))
    assert.ok(!dashboard.includes('child_boy_avatar.png'))
    assert.ok(dashboard.includes('>SA</span>'))
    assert.ok(dashboard.includes('alt="nomu | نمو"'))
    assert.ok(dashboard.includes(`lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}"`))
    assert.equal((dashboard.match(/class="language-switcher"/g) || []).length, 1)
    const modal = render(AddModal, { patients: data.initialPatients, onAdd: () => true, onClose: () => {} })
    for (const key of ['addPatient', 'alreadyAdded', 'searchRegistered']) assert.ok(modal.includes(dictionary.doctor[key]))
    assert.ok(!modal.includes('NOMU2026'))
    const empty = render(Table, { patients: [], page: 1, onPageChange: () => {}, onViewRecord: () => {} })
    assert.ok(empty.includes(dictionary.doctor.noPatients))
    const lastPage = render(Table, { patients: data.initialPatients, page: 2, onPageChange: () => {}, onViewRecord: () => {} })
    assert.ok(lastPage.includes(data.patientName(data.initialPatients[7], language)))
    assert.ok(!lastPage.includes(data.patientName(data.initialPatients[0], language)))
    for (const patient of data.registeredPatients) assert.ok(data.formatDate(patient.lastVisit, language))
    for (const patient of data.registeredPatients) {
      const record = render(Record, { patient, onBack: () => {} })
      assert.ok(record.includes(patient.name), 'Personal names remain as stored')
      assert.ok(record.includes(patient.file))
      assert.ok(record.includes(patient.nationalId))
      assert.equal((record.match(/class="dmr-summary(?: dmr-summary-pink)?"/g) || []).length, 6)
      assert.equal((record.match(/aria-controls="dmr-section-content"/g) || []).length, 0)
      for (const key of ['backToPatients', 'noGrowthTitle', 'noNotesTitle', 'basicInformation']) assert.ok(record.includes(escapeText(dictionary.doctor.medicalRecord[key])))
      assert.ok(record.includes(`dir="${language === 'ar' ? 'rtl' : 'ltr'}"`))
      assert.equal((record.match(/class="dmr-panel dmr-quick-actions"/g) || []).length, 0)
      assert.ok(!record.includes('<dialog'), 'The overview does not open medical forms automatically')
      assert.ok(!record.includes('class="dmr-navigation"'))
    }
    const actions = render(QuickActions, { onSelect: () => {}, activeSection: 'clinical' })
    assert.ok(actions.includes(escapeText(dictionary.doctor.patientRecordNav.title)))
    assert.equal((actions.match(/aria-current="location"/g) || []).length, 1)
    assert.ok(actions.includes(escapeText(dictionary.doctor.patientRecordNav.visits)))
    assert.equal((actions.match(/<button/g) || []).length, 8)
    for (const section of recordSections.filter(item => item.id !== 'overview')) {
      assert.ok(actions.includes(escapeText(dictionary.doctor.patientRecordNav[section.id])))
      const placeholder = render(Placeholder, { section, onBack: () => {} })
      assert.ok(placeholder.includes(escapeText(dictionary.doctor.medicalRecord[section.title])))
      assert.ok(placeholder.includes(escapeText(dictionary.doctor.medicalRecord.backToRecord)))
      assert.ok(!placeholder.includes('dmr-quick-actions-grid'))
    }
    const chart = render(Chart, { measurements: chartFixture })
    assert.ok(chart.includes('<polyline'))
    assert.ok(!chart.includes('NaN'))
    assert.ok(!chart.includes('Infinity'))
    const noteText = 'Original note — do not translate this clinical text.'
    const recordWithNotes = render(Record, { patient: { ...data.initialPatients[0], medicalNotes: [{ date: '2025-01-02', text: noteText, doctor: 'Original doctor name' }] }, onBack: () => {} })
    assert.ok(recordWithNotes.includes(noteText))
    assert.deepEqual(Object.keys(ar.doctor.newVisit).sort(), Object.keys(en.doctor.newVisit).sort())
    for (const patient of data.initialPatients.slice(0, 2)) {
      const form = render(VisitForm, { patient, onSave: () => true, onClose: () => {} })
      assert.ok(form.includes(`<bdi>${patient.name}</bdi>`))
      assert.ok(form.includes(`<bdi>${patient.file}</bdi>`))
      assert.equal((form.match(/readOnly=""/g) || []).length, 0)
      assert.ok(form.includes('class="dnv-child"'))
      assert.ok(form.includes('class="dnv-form-body"'))
      assert.ok(form.includes('<footer class="dd-modal-actions dnv-footer"'))
      assert.ok(!form.includes('class="dnv-back"'))
      assert.equal((form.match(/dir="auto"/g) || []).length, 4)
      for (const key of ['title', 'date', 'type', 'chiefComplaint', 'diagnosis', 'observations', 'treatment', 'nextFollowUp', 'save', 'mockNotice']) assert.ok(form.includes(escapeText(dictionary.doctor.newVisit[key])))
      for (const type of ['routine', 'followup', 'sick', 'other']) assert.ok(form.includes(escapeText(dictionary.doctor.newVisit.types[type])))
      assert.ok(form.includes(`dir="${language === 'ar' ? 'rtl' : 'ltr'}"`))
    }
    const history = render(VisitHistory, { onAdd: () => {}, visits: [{ id: 'test-visit', date: '2026-01-02', type: 'sick', doctor: 'Doctor Original Name', chiefComplaint: 'Raw reason text', diagnosis: '', observations: noteText, treatment: '', nextFollowUp: '2026-02-02' }] })
    assert.ok(history.includes(escapeText(dictionary.doctor.newVisit.types.sick)))
    assert.ok(history.includes(noteText))
    assert.ok(history.includes('Raw reason text'))
    assert.ok(history.includes('Doctor Original Name'))
    assert.ok(history.includes(escapeText(dictionary.doctor.newVisit.doctorLabel)))
    assert.ok(history.includes('class="dnv-history-meta"'))
    assert.ok(history.includes('class="dnv-history-details"'))
    for (const text of ['ملاحظات سريرية بالعربية دون ترجمة.', 'Clinical notes in English.']) {
      const mixedHistory = render(VisitHistory, { visits: [{ id: 'direction-test', date: '2026-01-02', type: 'routine', doctor: 'Doctor', observations: text }] })
      assert.ok(mixedHistory.includes(`<p dir="auto">${text}</p>`), 'Free-text direction is independent of interface language')
    }
    assert.ok(history.includes(escapeText(dictionary.doctor.newVisit.add)))
    console.log(`${language}: visit form child identity, translated fields/types, direction and history passed`)
    const prescriptionDictionary = dictionary.doctor.prescription
    assert.deepEqual(Object.keys(ar.doctor.prescription).sort(), Object.keys(en.doctor.prescription).sort())
    const rxPatient = data.initialPatients[0]
    const emptyPrescriptions = render(PrescriptionPage, { patient: rxPatient, onSavePrescription: () => true })
    assert.ok(emptyPrescriptions.includes(escapeText(prescriptionDictionary.emptyTitle)))
    assert.ok(!emptyPrescriptions.includes('dmr-quick-actions'))
    assert.ok(!emptyPrescriptions.includes('dmr-navigation'))
    const prescriptionForm = render(PrescriptionForm, { patient: rxPatient, onSave: () => true, onClose: () => {} })
    assert.ok(prescriptionForm.includes(`<bdi>${rxPatient.name}</bdi>`))
    assert.ok(prescriptionForm.includes(`<bdi>${rxPatient.file}</bdi>`))
    assert.ok(prescriptionForm.includes(`dir="${language === 'ar' ? 'rtl' : 'ltr'}"`))
    assert.ok(prescriptionForm.includes('dnv-footer'))
    for (const field of ['medication', 'strength', 'dosage', 'frequency', 'duration', 'route', 'instructions']) {
      assert.ok(prescriptionForm.includes(escapeText(prescriptionDictionary[field])))
      assert.ok(prescriptionForm.includes(`name="${field}"`))
    }
    assert.equal((prescriptionForm.match(/dir="auto"/g) || []).length, 6)
    assert.equal((prescriptionForm.match(/required=""/g) || []).length, 5)
    for (const input of prescriptionForm.match(/<input\b[^>]*>/g) || []) assert.ok(input.includes('value=""'), 'No medication details are prefilled')
    assert.ok(prescriptionForm.includes('<option value="" selected="">'))
    assert.ok(!prescriptionForm.includes('type="number"'), 'No arbitrary numerical dose limits')
    assert.ok(prescriptionForm.indexOf('name="strength"') < prescriptionForm.indexOf('name="dosage"'))
    assert.ok(prescriptionForm.indexOf('name="frequency"') < prescriptionForm.indexOf('name="duration"'))
    for (const field of ['medication', 'dosage', 'frequency', 'duration', 'route']) assert.equal(typeof prescriptionDictionary.requiredFields[field], 'string')
    for (const text of ['Original entered medication text', 'اسم دواء كما أدخله الطبيب']) {
      const rx = { id: 'rx-test', patientId: rxPatient.id, medication: text, strength: 'Original concentration', dosage: 'Original dosage and units', frequency: 'Original frequency', duration: 'Original duration', route: 'oral', instructions: noteText, doctor: 'Original doctor name', datePrescribed: '2026-10-20' }
      const prescriptionPage = render(PrescriptionPage, { patient: { ...rxPatient, prescriptions: [rx] }, onSavePrescription: () => true })
      const details = render(PrescriptionDetails, { prescription: rx, includeMedication: true })
      for (const markup of [prescriptionPage, details]) {
        for (const value of [text, rx.strength, rx.dosage, rx.frequency, rx.duration, rx.instructions, rx.doctor]) assert.ok(markup.includes(escapeText(value)))
        assert.ok(markup.includes(escapeText(prescriptionDictionary.routes.oral)))
        assert.ok(!markup.includes('doctor.prescription.'))
      }
      assert.ok(prescriptionPage.includes(escapeText(prescriptionDictionary.viewDetails)))
      assert.ok(prescriptionPage.includes('dir="auto"'))
    }
    console.log(`${language}: prescription page, empty state, selected child, required fields, details, raw clinical text and direction passed`)
    assert.deepEqual(Object.keys(ar.doctor.followUp).sort(), Object.keys(en.doctor.followUp).sort())
    const futureDate = '2099-11-01'
    const scheduled = saveFollowUp(data.initialPatients, rxPatient.id, { date: futureDate, time: '10:30', reason: 'سبب المتابعة الأصلي', instructions: 'Original instructions' })
    const scheduledChild = scheduled[0]
    const followupForm = render(FollowUpForm, { patient: scheduledChild, onSave: () => true, onClose: () => {} })
    for (const key of ['title', 'date', 'time', 'reason', 'instructions', 'save', 'mockNotice']) assert.ok(followupForm.includes(escapeText(dictionary.doctor.followUp[key])))
    assert.ok(followupForm.includes(`<bdi>${rxPatient.name}</bdi>`))
    assert.ok(followupForm.includes(`<bdi>${rxPatient.file}</bdi>`))
    assert.ok(followupForm.includes(`value="${futureDate}"`))
    assert.ok(followupForm.includes('value="10:30"'))
    assert.ok(followupForm.includes('سبب المتابعة الأصلي'))
    assert.ok(followupForm.includes('Original instructions'))
    assert.ok(followupForm.includes(`dir="${language === 'ar' ? 'rtl' : 'ltr'}"`))
    assert.equal((followupForm.match(/dir="auto"/g) || []).length, 2)
    assert.ok(followupForm.includes('dnv-footer'))
    const updatedTable = render(Table, { patients: scheduled, page: 1, onPageChange: () => {}, onViewRecord: () => {} })
    const updatedRecord = render(Record, { patient: scheduledChild, onBack: () => {} })
    for (const markup of [updatedTable, updatedRecord]) assert.ok(markup.includes(data.formatDate(futureDate, language)))
    assert.equal(followUpDraft(scheduledChild).time, '10:30')
    const appointmentList = render(FollowUpList, { patient: scheduledChild, onEdit: () => {}, onCancel: () => {} })
    for (const key of ['appointments', 'upcoming', 'editReschedule', 'cancelAppointment', 'reasonLabel', 'instructionsLabel']) assert.ok(appointmentList.includes(escapeText(dictionary.doctor.followUp[key])))
    assert.ok(appointmentList.includes('سبب المتابعة الأصلي'))
    assert.ok(appointmentList.includes('Original instructions'))
    const historyAppointment = { id: 'past-test', patientId: rxPatient.id, date: '2020-01-01', time: '', reason: '', instructions: '', status: 'scheduled', visitId: null }
    const pastOnly = render(FollowUpList, { patient: { ...rxPatient, followUpAppointments: [historyAppointment] }, onEdit: () => {}, onCancel: () => {} })
    assert.ok(pastOnly.includes(escapeText(dictionary.doctor.followUp.past)))
    assert.ok(!pastOnly.includes(escapeText(dictionary.doctor.followUp.missed)))
    assert.ok(!pastOnly.includes(escapeText(dictionary.doctor.followUp.cancelAppointment)))
    const recordedMissed = render(FollowUpList, { patient: { ...rxPatient, followUpAppointments: [{ ...historyAppointment, status: 'missed' }] }, onEdit: () => {}, onCancel: () => {} })
    assert.ok(recordedMissed.includes(escapeText(dictionary.doctor.followUp.missed)))
    console.log(`${language}: follow-up form, saved values, record/list date consistency and direction passed`)
    assert.deepEqual(Object.keys(ar.doctor.notesDiagnosis).sort(), Object.keys(en.doctor.notesDiagnosis).sort())
    const nd = dictionary.doctor.notesDiagnosis
    const emptyNotes = render(NotesPage, { patient: rxPatient, onSaveNote: () => true })
    assert.ok(emptyNotes.includes(escapeText(nd.emptyTitle)))
    assert.ok(!emptyNotes.includes('dmr-quick-actions'))
    for (const key of ['all', 'diagnosis', 'observation', 'followup']) assert.ok(emptyNotes.includes(escapeText(nd.filtersLabel[key])))
    const noteForm = render(NoteForm, { patient: rxPatient, onSave: () => true, onClose: () => {} })
    assert.ok(noteForm.includes(`<bdi>${rxPatient.name}</bdi>`))
    assert.ok(noteForm.includes(`<bdi>${rxPatient.file}</bdi>`))
    assert.ok(noteForm.includes('dnv-footer'))
    assert.ok(noteForm.includes(`dir="${language === 'ar' ? 'rtl' : 'ltr'}"`))
    assert.equal((noteForm.match(/dir="auto"/g) || []).length, 3)
    for (const field of ['diagnosis', 'observations', 'plan']) assert.ok(noteForm.includes(escapeText(nd[`${field}Placeholder`])))
    const clinicalFixture = { id: 'note-fixture', patientId: rxPatient.id, date: '2026-01-02', type: 'diagnosis', doctor: 'Original Doctor', diagnosis: 'Entered diagnostic text', observations: '  ملاحظات أصلية\nOriginal English observations  ', plan: 'Original plan', visitId: 'visit-fixture' }
    const notePatient = { ...rxPatient, standaloneNotes: [clinicalFixture], medicalVisits: [{ id: 'visit-fixture', patientId: rxPatient.id, date: '2026-01-01', type: 'routine' }] }
    const notesPage = render(NotesPage, { patient: notePatient, onSaveNote: () => true })
    const noteDetails = render(NoteDetails, { note: clinicalFixture, patient: notePatient })
    for (const markup of [notesPage, noteDetails]) {
      assert.ok(markup.includes('Entered diagnostic text'))
      assert.ok(markup.includes(escapeText(clinicalFixture.observations)))
      assert.ok(markup.includes('Original Doctor'))
      assert.ok(!markup.includes('doctor.notesDiagnosis.'))
    }
    assert.ok(noteDetails.includes('Original plan'))
    assert.ok(noteDetails.includes('visit-fixture'))
    const editForm = render(NoteForm, { patient: notePatient, note: clinicalFixture, onSave: () => true, onClose: () => {} })
    assert.ok(editForm.includes(escapeText(nd.edit)))
    assert.ok(editForm.includes(escapeText(nd.update)))
    for (const field of ['diagnosis', 'observations', 'plan']) assert.ok(editForm.includes(escapeText(clinicalFixture[field])))
    assert.equal((notesPage.match(/class="dd-record-button dmn-edit"/g) || []).length, 1)
    const visitOnlyPatient = { ...rxPatient, medicalVisits: [{ id: 'readonly-visit', patientId: rxPatient.id, date: '2026-01-01', type: 'routine', diagnosis: 'Original visit diagnosis', observations: 'Original visit text', doctor: 'Doctor' }], medicalNotes: [], standaloneNotes: [] }
    const readOnlyVisitNotes = render(NotesPage, { patient: visitOnlyPatient, onSaveNote: () => true })
    assert.ok(!readOnlyVisitNotes.includes('dmn-edit'))
    const arabicEditNote = { ...clinicalFixture, diagnosis: 'تشخيص محفوظ', observations: '  ملاحظات عربية محفوظة  ', plan: 'خطة محفوظة' }
    const arabicEditForm = render(NoteForm, { patient: { ...notePatient, standaloneNotes: [arabicEditNote] }, note: arabicEditNote, onSave: () => true, onClose: () => {} })
    for (const field of ['diagnosis', 'observations', 'plan']) assert.ok(arabicEditForm.includes(escapeText(arabicEditNote[field])))
    const directionFixtures = [
      { ...clinicalFixture, id: 'english-note', diagnosis: 'Original English diagnosis', observations: 'Original English notes.', plan: 'Original English plan.', doctor: 'Original Doctor' },
      { ...clinicalFixture, id: 'arabic-note', diagnosis: 'تشخيص أدخله الطبيب', observations: 'ملاحظات عربية كما حُفظت.', plan: 'خطة متابعة عربية.', doctor: 'د. سارة أحمد' },
      { ...clinicalFixture, id: 'mixed-note', diagnosis: 'تشخيص مع English text', observations: 'ملاحظات عربية\nOriginal English line.', plan: 'Original plan مع نص عربي', doctor: 'د. سارة Ahmad' },
    ]
    const directionPatient = { ...rxPatient, standaloneNotes: directionFixtures }
    const beforeDirectionCheck = JSON.stringify(directionPatient)
    const multipleNotes = render(NotesPage, { patient: directionPatient, onSaveNote: () => true })
    assert.equal((multipleNotes.match(/<li>/g) || []).length, 3)
    assert.equal((multipleNotes.match(/class="dmn-list"/g) || []).length, 1)
    for (const note of directionFixtures) {
      assert.ok(multipleNotes.includes(`<h4 dir="auto">${escapeText(note.diagnosis)}</h4>`))
      assert.ok(multipleNotes.includes(`<p class="dmn-preview" dir="auto">${escapeText(note.observations)}</p>`))
      const completeNote = render(NoteDetails, { note, patient: directionPatient })
      for (const field of ['diagnosis', 'observations', 'plan']) assert.ok(completeNote.includes(`<dd dir="auto">${escapeText(note[field])}</dd>`))
      assert.ok(completeNote.includes(`<dd dir="auto"><bdi>${escapeText(note.doctor)}</bdi></dd>`))
    }
    assert.equal(JSON.stringify(directionPatient), beforeDirectionCheck, 'Rendering never modifies saved notes')
    const notesCss = readFileSync(new URL('./MedicalNotes.css', import.meta.url), 'utf8')
    assert.match(notesCss, /\.dmn-list\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
    assert.match(notesCss, /@media\s*\(max-width:\s*850px\)\s*\{\s*\.dmn-list\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    console.log(`${language}: three mixed-direction note cards, complete details, unchanged data and existing responsive grid rules passed`)
    console.log(`${language}: medical notes page, filters, empty state, modal, raw clinical text, direction and full details passed`)
    console.log(`${language}: standalone edit control, prefilled edit modal, original Arabic text and read-only visit-derived cards passed`)
    console.log(`${language}: provider, dashboard, modal, empty state, pagination, images and translations passed`)
    console.log(`${language}: child records, six summaries, sidebar-ready record without bottom quick actions, placeholders with back button, raw notes and measured chart passed`)
  }
} finally {
  if (previousWindow === undefined) delete globalThis.window
  else globalThis.window = previousWindow
  await server.close()
}
