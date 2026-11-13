import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'
import { createVaccinationRepository, vaccinationDoseState } from '../src/services/vaccinationRepository.js'
import { vaccinationStages } from '../src/services/vaccinationScheduleData.js'

const actor = { id: 'demo-doctor-sarah-ahmad', name: 'Dr Sarah Ahmad', role: 'doctor', clinicalEditing: true }
const childId = 'demo-child-3'
const group = vaccinationStages.find(group => group.id === 'month2')
const service = group.doses[0]
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]
function storage() {
  const data = new Map()
  return { get length() { return data.size }, key: index => [...data.keys()][index] ?? null, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
}
const doseDraft = (doseId = 'combo1') => ({ childId, kind: 'vaccination-dose', stageId: 'month2', doseId, status: 'completed', administeredAt: '2026-01-02', administeredTime: '09:30', administrationLocation: 'internal', facilityName: 'Hospital', informationSource: '', notes: 'Original note' })
const scope = (repository, dose = service) => vaccinationDoseState(group, dose, repository.read('adam'), childId).related
function correction(repository, patch, options = {}) {
  return repository.correctDose('adam', { ...doseDraft(), ...patch }, { actor, expectedRecords: scope(repository), ...options })
}

test('date and evidence corrections persist with before/after values, responsible doctor and isolated sibling doses', () => {
  const db = storage(), repository = createVaccinationRepository({ storage: db })
  const first = repository.saveDose('adam', doseDraft(), { expectedRecords: [] })
  repository.saveDose('adam', doseDraft('rota1'), { expectedRecords: [] })
  const sibling = repository.read('adam').find(record => record.doseId === 'rota1')
  const updated = correction(repository, { administeredAt: '2026-01-04', administrationLocation: 'external', facilityName: 'مركز صحي Community Clinic', informationSource: 'parentReport', notes: 'Corrected from parent report' })
  assert.equal(updated.correctionHistory.length, 1)
  const history = updated.correctionHistory[0]
  assert.equal(history.previousValue.administeredAt, first.administeredAt)
  assert.equal(history.updatedValue.administeredAt, '2026-01-04')
  assert.equal(history.updatedValue.informationSource, 'parentReport')
  assert.equal(history.updatedValue.sourceVerified, false)
  assert.equal(history.doctor.id, actor.id)
  assert.ok(Number.isFinite(Date.parse(history.correctedAt)))
  const refreshed = createVaccinationRepository({ storage: db }).read(childId)
  assert.equal(refreshed.filter(record => record.doseId === 'combo1').length, 1)
  assert.deepEqual(refreshed.find(record => record.doseId === 'rota1'), sibling)
  assert.equal(refreshed.find(record => record.doseId === 'combo1').facilityName, 'مركز صحي Community Clinic')
  assert.deepEqual(repository.read('lina'), [])
})

test('reversing completion requires confirmation and keeps original administration evidence in its audit trail', () => {
  const repository = createVaccinationRepository({ storage: storage() })
  repository.saveDose('adam', doseDraft(), { expectedRecords: [] })
  assert.throws(() => correction(repository, { status: 'pending' }), /reversalConfirmationRequired/)
  const record = correction(repository, { status: 'pending', administrationLocation: '', informationSource: '', notes: '' }, { confirmReversal: true })
  assert.equal(record.status, 'pending')
  assert.equal(record.administeredAt, '')
  assert.equal(record.vaccinationDate, '')
  assert.equal(record.correctionHistory[0].previousValue.status, 'completed')
  assert.equal(record.correctionHistory[0].updatedValue.status, 'pending')
  assert.equal(record.correctionHistory[0].completionReversed, true)
  const restored = correction(repository, { administeredAt: '2026-01-03' })
  assert.equal(restored.status, 'completed')
  assert.equal(restored.correctionHistory.length, 2)
})

test('corrections validate dates, external evidence, actor permissions and stale snapshots before writing', () => {
  const db = storage(), repository = createVaccinationRepository({ storage: db })
  repository.saveDose('adam', doseDraft(), { expectedRecords: [] })
  const original = repository.read('adam')[0]
  const count = db.length
  for (const administeredAt of ['2999-01-01', '2020-01-01', '2026-02-30', '']) assert.throws(() => correction(repository, { administeredAt }), /required/)
  assert.throws(() => correction(repository, { administrationLocation: '' }), /locationRequired/)
  assert.throws(() => correction(repository, { administrationLocation: 'external', facilityName: ' ' }), /facilityRequired/)
  assert.throws(() => correction(repository, { administrationLocation: 'external', facilityName: 'Clinic' }), /sourceRequired/)
  for (const role of ['mother', 'father', 'nurse']) assert.throws(() => correction(repository, {}, { actor: { ...actor, role } }), /correctionForbidden/)
  assert.throws(() => correction(repository, {}, { actor: { ...actor, clinicalEditing: false } }), /correctionForbidden/)
  assert.equal(db.length, count)
  assert.deepEqual(repository.read('adam'), [original])
  const baseline = scope(repository)
  correction(repository, { notes: 'First correction' })
  assert.throws(() => correction(repository, { notes: 'Stale correction' }, { expectedRecords: baseline }), /recordConflict/)
  const beforeFailure = repository.read('adam')
  db.setItem = () => { throw Error('quota') }
  assert.throws(() => correction(repository, { notes: 'Write failure' }), /quota/)
  assert.deepEqual(repository.read('adam'), beforeFailure)
})

test('legacy completed visits remain intact and correcting one embedded administration leaves its siblings and appointments unchanged', () => {
  const repository = createVaccinationRepository({ storage: storage() })
  const visit = repository.saveVisit('adam', { childId, kind: 'vaccination-visit', visitId: group.id, stageId: group.id, doseIds: group.doses.map(dose => dose.id), status: 'completed', administeredAt: '2026-01-02', vaccinationDate: '2026-01-02', notes: 'Legacy visit', appointmentDate: '2026-01-02', appointmentTime: '10:30', appointmentHistory: [], administrations: group.doses.map(dose => ({ childId, doseId: dose.id, status: 'completed', administeredAt: '2026-01-02' })) }, { expectedRecords: [] })
  const corrected = correction(repository, { status: 'pending', notes: 'Not actually administered' }, { confirmReversal: true })
  const records = repository.read('adam')
  assert.deepEqual(records.find(record => record.kind === 'vaccination-visit'), visit)
  assert.equal(corrected.correctionHistory[0].previousValue.administeredAt, '2026-01-02')
  const sibling = vaccinationDoseState(group, group.doses[1], records, childId)
  assert.equal(sibling.record.status, 'completed')
  assert.equal(sibling.record.administeredAt, '2026-01-02')
  const ambiguous = createVaccinationRepository({ storage: storage() })
  ambiguous.importRecords('adam', [{ childId, kind: 'vaccination-visit', visitId: 'month2', status: 'completed', administeredAt: '2026-01-02', doseIds: ['combo1', 'rota1'] }])
  assert.throws(() => correction(ambiguous, {}), /historicalConflict/)
})

async function componentHost(language, options = {}) {
  const source = await readFile(new URL('../src/components/child-health/VaccinationSchedule.jsx', import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, 'VaccinationSchedule.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace(/export default /g, '')
  const states = []
  let cursor = 0
  const dictionary = language === 'ar' ? ar : en
  const bindings = { Date: options.Date || Date, useLanguage: () => ({ language }), Clock: 'clock-icon', createPortal: (children, target) => ({ type: 'portal', props: { children, target } }), vaccinationStages, vaccinationDoseState, _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment, Button: 'button',
    ...Object.fromEntries(['Baby', 'Footprints', 'Hand', 'Blocks', 'ToyBrick', 'Cake', 'PersonStanding'].map(name => [name, name])),
    CalendarDays: 'calendar-icon', X: 'close-icon', useEffect() {}, useRef: () => ({ current: null }), useId: () => 'visit-test', useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next }] }, window: { confirm: options.confirm || (() => true) } }
  const { VisitEditor, StageDetails, AppointmentSummary, DateField, TimeField, visitState } = new Function(...Object.keys(bindings), code + ';return { VisitEditor, StageDetails, AppointmentSummary, DateField, TimeField, visitState }')(...Object.values(bindings))
  const v = key => key.split('.').reduce((value, part) => value?.[part], dictionary.childHealth.vaccinations) ?? key
  const labels = { v, language, number: String, stageLabel: group => v('stageLabels.' + group.id), serviceLabel: dose => dose.vaccineId, formatDate: value => value, formatAppointment: (date, time) => date + ' ' + time }
  return { visitState, renderTime(props) { cursor = 0; return TimeField({ ...props, v }) }, renderDate(props) { return DateField(props) }, renderSummary(props) { return AppointmentSummary({ ...props, labels }) }, renderDetails(props) { cursor = 0; return StageDetails({ ...props, labels }) }, render(props) { cursor = 0; return VisitEditor({ ...props, labels }) } }
}

test('visit editor prefills, saves date changes, confirms reversal and keeps parents read-only in both languages', async () => {
  for (const language of ['en', 'ar']) {
    const repository = createVaccinationRepository({ storage: storage() })
    repository.saveDose('adam', doseDraft(), { expectedRecords: [] })
    let confirm = false
    const host = await componentHost(language, { confirm: () => confirm })
    const props = () => ({ group, service, child: { id: childId, dateOfBirth: '2023-10-18' }, info: { record: repository.read('adam').find(record => record.kind === 'vaccination-visit') || repository.read('adam')[0], related: repository.read('adam') }, actor, onSave: (draft, expectedRecords, confirmReversal) => repository.manageVisit('adam', draft, { actor, expectedRecords, confirmReversal }) })
    const edit = () => nodes(host.render(props())).find(node => node.type === 'button').props.onClick()
    edit()
    let tree = host.render(props())
    const dateField = nodes(tree).find(node => node.type?.name === 'DateField')
    assert.equal(dateField.props.value, '2026-01-02')
    dateField.props.onChange('2026-01-05')
    nodes(tree).find(node => node.type?.name === 'TimeField').props.onChange('09:30')
    tree = host.render(props())
    await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.equal(props().info.record.administeredAt, '2026-01-05')
    assert.ok(nodes(host.render(props())).some(node => node.props.role === 'status'))
    edit()
    tree = host.render(props())
    nodes(tree).find(node => node.type === 'select' && node.props.id.endsWith('-status')).props.onChange({ target: { value: 'pending' } })
    tree = host.render(props())
    await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.equal(props().info.record.status, 'completed')
    confirm = true
    await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.equal(props().info.record.status, 'pending')
    const parent = await componentHost(language)
    const readOnly = parent.render({ ...props(), actor: null })
    assert.ok(!nodes(readOnly).some(node => node.type === 'form' || node.type === 'button'))
    assert.ok(!nodes(readOnly).some(node => node.type === 'details' || node.type === 'table'))
    assert.ok(props().info.record.correctionHistory.length > 0)
    assert.notEqual(host.visitState(group, { id: childId, dateOfBirth: '2023-10-18' }, repository.read('adam')).status, 'completed')
  }
})

test('stage summaries react to a single-dose correction without treating partially completed stages as completed', async () => {
  const repository = createVaccinationRepository({ storage: storage() })
  repository.saveDose('adam', doseDraft(), { expectedRecords: [] })
  const host = await componentHost('en')
  const child = { id: childId, dateOfBirth: '2023-10-18' }
  let stage = host.visitState(group, child, repository.read('adam'))
  assert.equal(stage.status, 'partial')
  assert.equal(stage.conflict, false)
  repository.saveDose('adam', doseDraft('rota1'), { expectedRecords: [] })
  stage = host.visitState(group, child, repository.read('adam'))
  assert.equal(stage.status, 'completed')
  correction(repository, { status: 'pending' }, { confirmReversal: true })
  stage = host.visitState(group, child, repository.read('adam'))
  assert.equal(stage.status, 'partial')
  assert.equal(stage.completed, false)
  assert.equal(stage.conflict, false)
})

test('failed edits retain the draft and do not report success; Cancel restores the displayed saved record', async () => {
  const repository = createVaccinationRepository({ storage: storage() })
  repository.saveDose('adam', doseDraft(), { expectedRecords: [] })
  const host = await componentHost('en')
  const props = { group, service, child: { id: childId }, info: { record: repository.read('adam').find(record => record.kind === 'vaccination-visit') || repository.read('adam')[0], related: repository.read('adam') }, actor, onSave: () => { throw Error('quota') } }
  nodes(host.render(props)).find(node => node.type === 'button').props.onClick()
  let tree = host.render(props)
  nodes(tree).find(node => node.type?.name === 'DateField').props.onChange('2026-01-05')
  nodes(tree).find(node => node.type?.name === 'TimeField').props.onChange('09:30')
  tree = host.render(props)
  await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  tree = host.render(props)
  assert.ok(nodes(tree).some(node => node.props.role === 'alert'))
  assert.ok(!nodes(tree).some(node => node.props.role === 'status'))
  assert.equal(nodes(tree).find(node => node.type?.name === 'DateField').props.value, '2026-01-05')
  nodes(tree).find(node => node.type === 'button' && node.props.children === en.childHealth.vaccinations.cancel).props.onClick()
  assert.ok(!nodes(host.render(props)).some(node => node.type === 'form'))
  assert.equal(repository.read('adam')[0].administeredAt, '2026-01-02')
})

test('corrections notify the shared parent reader and independent dose edits do not invalidate each other', () => {
  const db = storage(), events = new EventTarget()
  const doctor = createVaccinationRepository({ storage: db, events })
  const parent = createVaccinationRepository({ storage: db, events })
  doctor.saveDose('adam', doseDraft(), { expectedRecords: [] })
  doctor.saveDose('adam', doseDraft('rota1'), { expectedRecords: [] })
  const expectedSibling = scope(doctor, group.doses[1])
  let displayed = parent.read('adam')
  const unsubscribe = parent.subscribe(() => { displayed = parent.read('adam') })
  correction(doctor, { administeredAt: '2026-01-05' })
  assert.equal(displayed.find(record => record.doseId === 'combo1').administeredAt, '2026-01-05')
  doctor.correctDose('adam', { ...doseDraft('rota1'), administeredAt: '2026-01-06' }, { actor, expectedRecords: expectedSibling })
  assert.equal(displayed.find(record => record.doseId === 'rota1').administeredAt, '2026-01-06')
  assert.equal(displayed.find(record => record.doseId === 'combo1').administeredAt, '2026-01-05')
  unsubscribe()
})


test('one age-stage visit schedules, administers and corrects every dose atomically with parent updates and refresh persistence', async () => {
  const db = storage(), events = new EventTarget()
  const repository = createVaccinationRepository({ storage: db, events })
  const parent = createVaccinationRepository({ storage: db, events })
  const stage = vaccinationStages.find(stage => stage.id === 'month4')
  const baseline = { childId, stageId: stage.id, status: 'pending', appointmentDate: '2099-01-02', appointmentTime: '10:30', notes: 'One visit' }
  let displayed = parent.read(childId)
  const unsubscribe = parent.subscribe(() => { displayed = parent.read(childId) })
  const save = (draft, options = {}) => repository.manageVisit(childId, draft, { actor, expectedRecords: repository.read(childId).filter(record => record.stageId === stage.id), ...options })
  let record = save(baseline)
  assert.equal(db.length, 1)
  assert.equal(displayed.length, 1)
  assert.deepEqual(record.doseIds, stage.doses.map(dose => dose.id))
  assert.equal(record.administrations, undefined)
  const host = await componentHost('en')
  const child = { id: childId, dateOfBirth: '2023-10-18' }
  assert.equal(host.visitState(stage, child, displayed).completed, false)
  assert.equal(host.visitState(stage, child, displayed).appointment.time, '10:30')
  record = save({ ...baseline, appointmentDate: '2099-01-03' })
  assert.equal(record.appointmentHistory.length, 2)
  assert.equal(record.appointmentHistory[0].status, 'rescheduled')
  record = save({ ...baseline, status: 'completed', administeredAt: '2026-01-05', administeredTime: '09:30', administrationLocation: 'external', facilityName: 'Clinic', informationSource: '', notes: 'Optional evidence' })
  assert.equal(db.length, 3)
  assert.equal(displayed.length, 1)
  assert.equal(record.administrations.length, 3)
  for (const dose of stage.doses) {
    const info = vaccinationDoseState(stage, dose, displayed, childId)
    assert.equal(info.record.administeredAt, '2026-01-05')
    assert.equal(info.record.status, 'completed')
  }
  assert.equal(host.visitState(stage, child, displayed).completed, true)
  record = save({ ...record, administeredAt: '2026-01-06', notes: 'Corrected visit' })
  assert.equal(record.correctionHistory.at(-1).previousValue.administeredAt, '2026-01-05')
  assert.equal(record.correctionHistory.at(-1).updatedValue.administeredAt, '2026-01-06')
  assert.equal(record.correctionHistory.at(-1).doctor.id, actor.id)
  assert.throws(() => save(baseline), /reversalConfirmationRequired/)
  record = save(baseline, { confirmReversal: true })
  assert.equal(host.visitState(stage, child, displayed).completed, false)
  assert.equal(record.administrations, undefined)
  assert.equal(record.correctionHistory.at(-1).completionReversed, true)
  assert.equal(record.correctionHistory.at(-1).previousValue.administrations.length, 3)
  assert.deepEqual(createVaccinationRepository({ storage: db }).read(childId), displayed)
  assert.deepEqual(repository.read('lina'), [])
  unsubscribe()
})

test('unifying old dose records preserves corrections and source records; stale, forbidden and failed visit writes change nothing', () => {
  const db = storage(), repository = createVaccinationRepository({ storage: db })
  const original = { ...doseDraft(), kind: 'legacy-dose' }
  repository.importRecords(childId, [original])
  repository.saveDose(childId, doseDraft('rota1'), { expectedRecords: [] })
  repository.correctDose(childId, { ...doseDraft('rota1'), administeredAt: '2026-01-03' }, { actor, expectedRecords: scope(repository, group.doses[1]) })
  const previous = repository.read(childId)
  const draft = { ...doseDraft(), stageId: group.id, administeredAt: '2026-01-04' }
  const options = { actor, sourceRecords: [original], expectedRecords: previous }
  const record = repository.manageVisit(childId, draft, options)
  assert.equal(record.legacyRecords.length, 2)
  assert.equal(record.legacyRecords.find(record => record.doseId === 'rota1').correctionHistory.length, 1)
  assert.deepEqual(record.correctionHistory[0].previousRecords.map(record => record.doseId).sort(), ['combo1', 'rota1'])
  assert.equal(repository.read(childId, [original]).length, 1)
  assert.equal(record.administrations.length, 2)
  assert.throws(() => repository.manageVisit(childId, draft, options), /recordConflict/)
  const latest = repository.read(childId)
  for (const role of ['mother', 'nurse']) assert.throws(() => repository.manageVisit(childId, draft, { actor: { ...actor, role }, expectedRecords: latest }), /correctionForbidden/)
  for (const patch of [{ administeredAt: '2999-01-01' }, { administeredAt: '2026-02-30' }, { facilityName: '' }, { facilityName: '   ' }]) assert.throws(() => repository.manageVisit(childId, { ...draft, ...patch }, { actor, expectedRecords: latest }))
  db.setItem = () => { throw Error('quota') }
  assert.throws(() => repository.manageVisit(childId, { ...draft, notes: 'Failed change' }, { actor, expectedRecords: latest }), /quota/)
  assert.deepEqual(repository.read(childId), latest)
})


test('persisted unscheduled, scheduled and completed visits expose the correct actions in both languages and keep parents read-only', async () => {
  for (const language of ['en', 'ar']) {
    const dictionary = (language === 'ar' ? ar : en).childHealth.vaccinations
    for (const group of vaccinationStages) {
      for (const status of ['unscheduled', 'scheduled', 'completed']) {
        const host = await componentHost(language)
        const record = status === 'unscheduled' ? null : { childId, kind: 'vaccination-visit', stageId: group.id, visitId: group.id, doseIds: group.doses.map(dose => dose.id), notes: '', status: status === 'completed' ? 'completed' : 'pending', ...(status === 'completed' ? { administeredAt: '2026-01-02', administeredTime: '09:30', administrationLocation: 'internal', administrations: group.doses.map(dose => ({ childId, doseId: dose.id, status: 'completed', administeredAt: '2026-01-02' })) } : { appointmentDate: '2099-01-02', appointmentTime: '10:30' }) }
        const props = { group, child: { id: childId }, records: record ? [record] : [], doctor: true, correctionActor: actor, onClose() {}, onManageVisit() {} }
        const tree = host.renderDetails(props)
        const editors = nodes(tree).filter(node => node.type?.name === 'VisitEditor')
        assert.equal(editors.length, 1)
        const editor = await componentHost(language)
        const rendered = editor.render(editors[0].props)
        assert.equal(nodes(rendered).filter(node => node.type === 'li').length, group.doses.length)
        const buttons = nodes(rendered).filter(node => node.type === 'button')
        assert.deepEqual(buttons.map(node => node.props.children), status === 'completed' ? [dictionary.visitEdit] : [status === 'scheduled' ? dictionary.editAppointment : dictionary.visitSchedule, dictionary.visitAdminister])
        buttons[0].props.onClick()
        const form = editor.render(editors[0].props)
        assert.equal(nodes(form).filter(node => node.type === 'form').length, 1)
        assert.equal(nodes(form).some(node => node.type === 'select' && node.props.id.endsWith('-status')), status === 'completed')
        assert.equal(nodes(form).find(node => node.type?.name === 'TimeField').props.label === dictionary.administrationTime, status === 'completed')
        const mother = host.renderDetails({ ...props, doctor: false })
        assert.equal(nodes(mother).find(node => node.type?.name === 'VisitEditor').props.actor, null)
      }
    }
  }
})


test('saved workflow transitions immediately change actions and retain one appointment and one current visit', async () => {
  const db = storage(), repository = createVaccinationRepository({ storage: db })
  const host = await componentHost('en')
  const props = () => ({ group, child: { id: childId, dateOfBirth: '2023-10-18' }, info: { record: repository.read(childId)[0] || {}, related: repository.read(childId) }, actor, onSave: (draft, expectedRecords, confirmReversal) => repository.manageVisit(childId, draft, { actor, expectedRecords, confirmReversal }) })
  const render = () => host.render(props())
  const buttons = () => nodes(render()).filter(node => node.type === 'button')
  assert.deepEqual(buttons().map(node => node.props.children), [en.childHealth.vaccinations.visitSchedule, en.childHealth.vaccinations.visitAdminister])
  buttons()[0].props.onClick()
  let tree = render()
  nodes(tree).find(node => node.type?.name === 'DateField').props.onChange('2099-01-02')
  nodes(tree).find(node => node.type?.name === 'TimeField').props.onChange('10:30')
  await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.deepEqual(buttons().map(node => node.props.children), [en.childHealth.vaccinations.editAppointment, en.childHealth.vaccinations.visitAdminister])
  assert.equal(repository.read(childId)[0].status, 'pending')
  const beforeDuplicate = db.length
  repository.manageVisit(childId, repository.read(childId)[0], { actor, expectedRecords: repository.read(childId) })
  assert.equal(db.length, beforeDuplicate)
  buttons()[1].props.onClick()
  tree = render()
  nodes(tree).find(node => node.type?.name === 'DateField').props.onChange('2026-01-04')
  nodes(tree).find(node => node.type?.name === 'TimeField').props.onChange('11:15')
  nodes(tree).find(node => node.type === 'input' && node.props.id.endsWith('-location')).props.onChange({ target: { value: 'Community Hospital' } })
  await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.deepEqual(buttons().map(node => node.props.children), [en.childHealth.vaccinations.visitEdit])
  const completed = repository.read(childId)[0]
  assert.equal(completed.administeredTime, '11:15')
  assert.equal(completed.appointmentDate, '')
  assert.equal(completed.appointmentTime, '')
  assert.equal(completed.appointmentHistory.length, 1)
  assert.equal(completed.appointmentHistory[0].status, 'fulfilled')
  assert.ok(completed.administrations.every(record => record.administeredTime === '11:15'))
  buttons()[0].props.onClick()
  tree = render()
  assert.equal(nodes(tree).find(node => node.type?.name === 'TimeField').props.time, '11:15')
  nodes(tree).find(node => node.type?.name === 'TimeField').props.onChange('11:45')
  nodes(tree).find(node => node.type === 'input' && node.props.id.endsWith('-location')).props.onChange({ target: { value: 'Updated Clinic' } })
  await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  const corrected = repository.read(childId)[0]
  assert.equal(corrected.facilityName, 'Updated Clinic')
  assert.equal(corrected.correctionHistory.at(-1).previousValue.administeredTime, '11:15')
  assert.equal(corrected.correctionHistory.at(-1).updatedValue.administeredTime, '11:45')
  assert.equal(repository.read(childId).length, 1)
  assert.deepEqual(createVaccinationRepository({ storage: db }).read(childId), [corrected])
  buttons()[0].props.onClick()
  nodes(render()).find(node => node.type === 'select' && node.props.id.endsWith('-status')).props.onChange({ target: { value: 'pending' } })
  await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.deepEqual(buttons().map(node => node.props.children), [en.childHealth.vaccinations.visitSchedule, en.childHealth.vaccinations.visitAdminister])
  assert.equal(repository.read(childId)[0].appointmentDate, '')
  assert.equal(repository.read(childId)[0].administeredTime, '')
})

test('administration time is optional, provided times are validated, and legacy times can be corrected or cleared', () => {
  const repository = createVaccinationRepository({ storage: storage() })
  const legacy = { ...doseDraft(), kind: 'vaccination-visit', visitId: group.id, doseIds: group.doses.map(dose => dose.id), administrations: group.doses.map(dose => ({ doseId: dose.id, status: 'completed', administeredAt: '2026-01-02' })) }
  delete legacy.administeredTime
  repository.importRecords(childId, [legacy])
  assert.equal(repository.read(childId)[0].administeredTime, undefined)
  for (const administeredTime of ['25:00', '10:75', '9:30']) assert.throws(() => repository.manageVisit(childId, { ...legacy, administeredTime }, { actor, expectedRecords: [legacy] }), /invalidAdministrationTime/)
  assert.deepEqual(repository.read(childId), [legacy])
  const record = repository.manageVisit(childId, { ...legacy, administeredTime: '09:30' }, { actor, expectedRecords: [legacy] })
  assert.equal(record.administeredTime, '09:30')
  assert.equal(record.correctionHistory[0].previousValue.administeredTime, undefined)
  assert.equal(record.correctionHistory[0].updatedValue.administeredTime, '09:30')
  const cleared = repository.manageVisit(childId, { ...record, administeredTime: '' }, { actor, expectedRecords: repository.read(childId) })
  assert.equal(cleared.administeredTime, '')
  assert.equal(cleared.correctionHistory.at(-1).previousValue.administeredTime, '09:30')
  assert.equal(cleared.correctionHistory.at(-1).updatedValue.administeredTime, '')
})


test('free-text visit locations validate, persist and prefill in both languages without evidence fields or selectors', async () => {
  for (const language of ['en', 'ar']) {
    const repository = createVaccinationRepository({ storage: storage() })
    const host = await componentHost(language)
    const dictionary = (language === 'ar' ? ar : en).childHealth.vaccinations
    const props = () => ({ group, child: { id: childId }, info: { record: repository.read(childId)[0] || {}, related: repository.read(childId) }, actor, onSave: (draft, expectedRecords) => repository.manageVisit(childId, draft, { actor, expectedRecords }) })
    const render = () => host.render(props())
    nodes(render()).filter(node => node.type === 'button')[1].props.onClick()
    let tree = render()
    assert.ok(!nodes(tree).some(node => node.type === 'select'))
    assert.ok(!nodes(tree).some(node => node.props.id?.endsWith('-source')))
    const row = nodes(tree).find(node => node.type === 'div' && node.props.className === 'vaccination__appointmentFields')
    assert.deepEqual(nodes(row).filter(node => ['DateField', 'TimeField'].includes(node.type?.name)).map(node => node.type.name), ['DateField', 'TimeField'])
    const location = nodes(tree).find(node => node.type === 'input' && node.props.id.endsWith('-location'))
    assert.equal(location.props.type, 'text')
    assert.equal(location.props.required, true)
    assert.equal(location.props.placeholder, dictionary.locationPlaceholder)
    nodes(tree).find(node => node.type?.name === 'DateField').props.onChange('2026-01-02')
    nodes(tree).find(node => node.type?.name === 'TimeField').props.onChange('09:30')
    location.props.onChange({ target: { value: '   ' } })
    await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.equal(repository.read(childId).length, 0)
    assert.ok(nodes(render()).some(node => node.props.role === 'alert' && node.props.children === dictionary.corrections.locationRequired))
    nodes(render()).find(node => node.type === 'input' && node.props.id.endsWith('-location')).props.onChange({ target: { value: '  Community Health Center  ' } })
    await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.equal(repository.read(childId)[0].facilityName, 'Community Health Center')
    assert.ok(nodes(render()).some(node => node.type === 'dd' && node.props.children === 'Community Health Center'))
    nodes(render()).find(node => node.type === 'button').props.onClick()
    tree = render()
    assert.equal(nodes(tree).find(node => node.type === 'input' && node.props.id.endsWith('-location')).props.value, 'Community Health Center')
    nodes(tree).find(node => node.type === 'input' && node.props.id.endsWith('-location')).props.onChange({ target: { value: 'Updated Clinic' } })
    await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    const record = repository.read(childId)[0]
    assert.equal(record.facilityName, 'Updated Clinic')
    assert.equal(record.correctionHistory.at(-1).previousValue.facilityName, 'Community Health Center')
    assert.equal(record.correctionHistory.at(-1).updatedValue.facilityName, 'Updated Clinic')
  }
})

test('editing legacy locations preserves stored evidence and verification internally and survives reload', async () => {
  const db = storage(), repository = createVaccinationRepository({ storage: db })
  const legacy = { ...doseDraft(), kind: 'vaccination-visit', visitId: group.id, doseIds: group.doses.map(dose => dose.id), administrationLocation: 'external', facilityName: 'Original Hospital', informationSource: 'medicalDocument', sourceVerified: true, administrations: group.doses.map(dose => ({ childId, doseId: dose.id, administeredAt: '2026-01-02', status: 'completed' })) }
  repository.importRecords(childId, [legacy])
  const host = await componentHost('en')
  const props = () => ({ group, child: { id: childId }, info: { record: repository.read(childId)[0], related: repository.read(childId) }, actor, onSave: (draft, expectedRecords) => repository.manageVisit(childId, draft, { actor, expectedRecords }) })
  const render = () => host.render(props())
  assert.ok(!nodes(render()).some(node => node.props.children === en.childHealth.vaccinations.corrections.informationSource))
  nodes(render()).find(node => node.type === 'button').props.onClick()
  const location = nodes(render()).find(node => node.type === 'input' && node.props.id.endsWith('-location'))
  assert.equal(location.props.value, 'Original Hospital')
  location.props.onChange({ target: { value: 'Corrected Hospital' } })
  await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  const record = createVaccinationRepository({ storage: db }).read(childId)[0]
  assert.equal(record.facilityName, 'Corrected Hospital')
  assert.equal(record.administrationLocation, 'external')
  assert.equal(record.informationSource, 'medicalDocument')
  assert.equal(record.sourceVerified, true)
  assert.equal(record.correctionHistory.at(-1).previousValue.informationSource, 'medicalDocument')
  for (const [value, expected] of [['internal', en.childHealth.vaccinations.corrections.internal], ['external', en.childHealth.vaccinations.corrections.external], ['Legacy Clinic', 'Legacy Clinic']]) {
    const legacyHost = await componentHost('en')
    const props = { group, child: { id: childId }, info: { record: { ...legacy, facilityName: '', administrationLocation: value }, related: [legacy] }, actor }
    nodes(legacyHost.render(props)).find(node => node.type === 'button').props.onClick()
    assert.equal(nodes(legacyHost.render(props)).find(node => node.type === 'input' && node.props.id.endsWith('-location')).props.value, expected)
  }
})


test('modal footer submits the correct visit form when actions are rendered outside its scrollable body', async () => {
  const host = await componentHost('en')
  const footer = {}
  const props = { group, child: { id: childId }, info: { record: {}, related: [] }, actor, actionHost: footer }
  nodes(host.render(props)).filter(node => node.type === 'button')[1].props.onClick()
  const tree = host.render(props)
  const form = nodes(tree).find(node => node.type === 'form')
  const portal = nodes(tree).find(node => node.type === 'portal')
  assert.equal(portal.props.target, footer)
  const save = nodes(portal).find(node => node.type === 'button' && node.props.type === 'submit')
  assert.equal(save.props.form, form.props.id)
  assert.ok(nodes(portal).some(node => node.type === 'button' && node.props.children === en.childHealth.vaccinations.cancel))
})


test('appointment summaries show localized dates and times, due/upcoming colors and safe empty states', async () => {
  for (const language of ['en', 'ar']) {
    const host = await componentHost(language)
    const dictionary = (language === 'ar' ? ar : en).childHealth.vaccinations
    for (const [date, tone] of [['2026-11-07', 'upcoming'], ['2026-11-06', 'due'], ['2026-11-05', 'due']]) {
      const tree = host.renderSummary({ date, time: '09:30', today: '2026-11-06' })
      assert.ok(tree.props.className.endsWith('--' + tone))
      assert.ok(nodes(tree).some(node => node.type === 'calendar-icon'))
      assert.ok(nodes(tree).some(node => node.type === 'h4' && node.props.children === dictionary.appointmentSummaryTitle))
      assert.deepEqual(nodes(tree).filter(node => node.type === 'time').map(node => node.props.dateTime), [date, '09:30'])
      const formattedTime = new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date('2000-01-01T09:30:00'))
      assert.ok(nodes(tree).some(node => node.type === 'time' && node.props.children === formattedTime))
    }
    for (const date of ['', undefined, '2026-02-30']) {
      const tree = host.renderSummary({ date, time: '09:30' })
      assert.ok(nodes(tree).some(node => node.type === 'p' && node.props.children === dictionary.appointmentSummaryEmpty))
      assert.ok(!nodes(tree).some(node => node.type === 'time'))
    }
    const noTime = host.renderSummary({ date: '2099-01-02', time: '' })
    assert.ok(nodes(noTime).some(node => node.props.children === dictionary.appointmentSummaryNoTime))
    assert.equal(nodes(noTime).filter(node => node.type === 'time').length, 1)
  }
})

test('the modal preview follows appointment draft inputs, Cancel restores saved values, and viewing never removes stored history', async () => {
  const db = storage(), repository = createVaccinationRepository({ storage: db })
  const original = repository.manageVisit(childId, { childId, stageId: group.id, status: 'pending', appointmentDate: '2099-01-02', appointmentTime: '10:30', notes: '' }, { actor, expectedRecords: [] })
  const persisted = repository.read(childId)
  const host = await componentHost('en')
  const props = { group, child: { id: childId }, info: { record: original, related: [original] }, actor }
  const render = () => host.render(props)
  let summary = nodes(render()).find(node => node.type?.name === 'AppointmentSummary')
  assert.equal(summary.props.date, '2099-01-02')
  nodes(render()).find(node => node.type === 'button').props.onClick()
  let tree = render()
  nodes(tree).find(node => node.type?.name === 'DateField').props.onChange('2099-01-03')
  nodes(tree).find(node => node.type?.name === 'TimeField').props.onChange('11:45')
  tree = render()
  summary = nodes(tree).find(node => node.type?.name === 'AppointmentSummary')
  assert.equal(summary.props.date, '2099-01-03')
  assert.equal(summary.props.time, '11:45')
  const formChildren = [nodes(tree).find(node => node.type === 'form').props.children].flat(Infinity).filter(Boolean)
  assert.ok(formChildren.indexOf(summary) < formChildren.findIndex(node => node.props?.className === 'vaccination__modalActions'))
  nodes(tree).find(node => node.type?.name === 'DateField').props.onChange('')
  summary = nodes(render()).find(node => node.type?.name === 'AppointmentSummary')
  assert.equal(summary.props.date, '')
  nodes(render()).find(node => node.type === 'button' && node.props.children === en.childHealth.vaccinations.cancel).props.onClick()
  summary = nodes(render()).find(node => node.type?.name === 'AppointmentSummary')
  assert.equal(summary.props.date, '2099-01-02')
  assert.equal(summary.props.time, '10:30')
  nodes(render()).filter(node => node.type === 'button')[1].props.onClick()
  nodes(render()).find(node => node.type?.name === 'DateField').props.onChange('2026-01-02')
  nodes(render()).find(node => node.type?.name === 'TimeField').props.onChange('08:15')
  summary = nodes(render()).find(node => node.type?.name === 'AppointmentSummary')
  assert.equal(summary.props.date, '2099-01-02')
  assert.equal(summary.props.time, '10:30')
  const detailsHost = await componentHost('en')
  const details = detailsHost.renderDetails({ group, child: { id: childId }, records: [original], doctor: true, correctionActor: actor, onClose() {} })
  assert.ok(!nodes(details).some(node => node.type === 'summary' && node.props.children === en.childHealth.vaccinations.appointmentHistory))
  assert.ok(!nodes(details).some(node => node.type === 'dt' && node.props.children === en.childHealth.vaccinations.nextAppointment))
  assert.deepEqual(createVaccinationRepository({ storage: db }).read(childId), persisted)
  assert.equal(repository.read(childId)[0].appointmentHistory.length, 1)
})


test('administering requires an inline date error, clears it for a valid date, and saves without any actual time in both languages', async () => {
  for (const language of ['en', 'ar']) {
    const db = storage(), repository = createVaccinationRepository({ storage: db })
    const host = await componentHost(language)
    const dictionary = (language === 'ar' ? ar : en).childHealth.vaccinations
    const props = () => ({ group, child: { id: childId, dateOfBirth: '2023-10-18' }, info: { record: repository.read(childId)[0] || {}, related: repository.read(childId) }, actor, onSave: (draft, expectedRecords) => repository.manageVisit(childId, draft, { actor, expectedRecords }) })
    const render = () => host.render(props())
    nodes(render()).filter(node => node.type === 'button')[1].props.onClick()
    nodes(render()).find(node => node.type === 'input' && node.props.id.endsWith('-location')).props.onChange({ target: { value: 'Hospital' } })
    await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.deepEqual(repository.read(childId), [])
    let date = nodes(render()).find(node => node.type?.name === 'DateField')
    assert.equal(date.props.required, true)
    assert.equal(date.props.error, dictionary.vaccinationDateRequired)
    const field = host.renderDate(date.props)
    const input = nodes(field).find(node => node.type === 'input')
    const message = nodes(field).find(node => node.props.role === 'alert')
    assert.equal(input.props['aria-invalid'], true)
    assert.equal(input.props['aria-describedby'], message.props.id)
    assert.equal(message.props.children, dictionary.vaccinationDateRequired)
    assert.ok(field.props.className.includes('vaccination__dateField--invalid'))
    date.props.onChange('2999-01-01')
    await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.deepEqual(repository.read(childId), [])
    date = nodes(render()).find(node => node.type?.name === 'DateField')
    assert.equal(date.props.error, dictionary.corrections.required)
    date.props.onChange('2026-01-02')
    date = nodes(render()).find(node => node.type?.name === 'DateField')
    assert.equal(date.props.error, '')
    assert.equal(nodes(render()).find(node => node.type?.name === 'TimeField').props.time, '')
    await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    const saved = createVaccinationRepository({ storage: db }).read(childId)[0]
    assert.equal(saved.administeredAt, '2026-01-02')
    assert.equal(saved.administeredTime, '')
    assert.ok(saved.administrations.every(record => record.administeredTime === ''))
    assert.equal(saved.status, 'completed')
    nodes(render()).find(node => node.type === 'button').props.onClick()
    assert.equal(nodes(render()).find(node => node.type?.name === 'TimeField').props.time, '')
    await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.ok(nodes(render()).some(node => node.props.role === 'status'))
    assert.equal(Object.hasOwn(dictionary, 'timeRequired'), false)
  }
})

test('empty or omitted administration times persist safely but appointment scheduling still requires its own time', async () => {
  for (const administeredTime of ['', undefined, null]) {
    const db = storage(), repository = createVaccinationRepository({ storage: db })
    const draft = { ...doseDraft(), administeredTime }
    for (const administeredAt of ['', '2999-01-01', '2026-02-30']) assert.throws(() => repository.manageVisit(childId, { ...draft, administeredAt }, { actor, expectedRecords: [] }), /required/)
    const saved = repository.manageVisit(childId, draft, { actor, expectedRecords: [] })
    assert.equal(saved.administeredTime, '')
    assert.equal(createVaccinationRepository({ storage: db }).read(childId)[0].administeredTime, '')
  }
  const repository = createVaccinationRepository({ storage: storage() })
  const draft = { childId, stageId: group.id, status: 'pending', appointmentDate: '2099-01-02', appointmentTime: '', notes: '' }
  assert.throws(() => repository.manageVisit(childId, draft, { actor, expectedRecords: [] }), /invalidFollowUp/)
  const host = await componentHost('en')
  const props = { group, child: { id: childId }, info: { record: {}, related: [] }, actor, onSave() { assert.fail('A missing appointment time must not reach persistence') } }
  nodes(host.render(props)).find(node => node.type === 'button').props.onClick()
  nodes(host.render(props)).find(node => node.type?.name === 'DateField').props.onChange('2099-01-02')
  await nodes(host.render(props)).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.equal(nodes(host.render(props)).find(node => node.type?.name === 'TimeField').props.error, en.childHealth.vaccinations.appointmentTimeRequired)
})


test('change history stays hidden for every visit status and edit mode while saved audit values remain intact', async () => {
  for (const language of ['en', 'ar']) {
    const dictionary = (language === 'ar' ? ar : en).childHealth.vaccinations
    for (const status of ['pending', 'completed']) {
      const record = { ...doseDraft(), status, administeredAt: status === 'completed' ? '2026-01-02' : '', appointmentDate: '2099-01-02', appointmentTime: '10:30', correctionHistory: [{ previousValue: { notes: 'Historical previous value' }, updatedValue: { notes: 'Historical updated value' }, correctedAt: '2026-01-03T10:00:00.000Z', doctor: { id: actor.id, name: 'Historical Doctor' } }] }
      const snapshot = structuredClone(record)
      const assertHidden = tree => {
        assert.ok(!nodes(tree).some(node => node.type === 'details' || node.type === 'summary' || node.type === 'table'))
        for (const text of [dictionary.corrections.history, 'Historical Doctor', 'Historical previous value', 'Historical updated value']) assert.ok(!nodes(tree).some(node => node.props.children === text))
      }
      const props = { group, child: { id: childId }, info: { record, related: [record] }, actor }
      const parent = await componentHost(language)
      assertHidden(parent.render({ ...props, actor: null }))
      for (const actionIndex of status === 'completed' ? [0] : [0, 1]) {
        const host = await componentHost(language)
        assertHidden(host.render(props))
        nodes(host.render(props)).filter(node => node.type === 'button')[actionIndex].props.onClick()
        assertHidden(host.render(props))
      }
      assert.deepEqual(record, snapshot)
    }
  }
})


test('confirmed appointment cancellation clears only the saved date/time, preserves visit data and history, and updates parent readers after reload', async () => {
  const db = storage(), events = new EventTarget()
  const repository = createVaccinationRepository({ storage: db, events })
  const parent = createVaccinationRepository({ storage: db, events })
  const draft = { childId, stageId: group.id, status: 'pending', appointmentDate: '2099-01-02', appointmentTime: '10:30', facilityName: 'Original Hospital', notes: 'Saved notes' }
  repository.manageVisit(childId, draft, { actor, expectedRecords: [] })
  const previous = repository.read(childId)[0]
  const host = await componentHost('en')
  const child = { id: childId, dateOfBirth: '2023-10-18' }
  const beforeStatus = host.visitState(group, child, [previous]).status
  let displayed = parent.read(childId)
  const unsubscribe = parent.subscribe(() => { displayed = parent.read(childId) })
  const cancelled = repository.manageVisit(childId, { ...draft, notes: 'Discard this unsaved edit', facilityName: 'Discard this too' }, { actor, expectedRecords: [previous], cancelAppointment: true })
  for (const key of Object.keys(previous).filter(key => !['appointmentDate', 'appointmentTime', 'updatedAt', 'correctionHistory'].includes(key))) assert.deepEqual(cancelled[key], previous[key], key)
  assert.equal(cancelled.appointmentDate, '')
  assert.equal(cancelled.appointmentTime, '')
  assert.deepEqual(cancelled.appointmentHistory, previous.appointmentHistory)
  assert.equal(cancelled.correctionHistory.at(-1).appointmentCancelled, true)
  assert.equal(cancelled.correctionHistory.at(-1).doctor.id, actor.id)
  assert.equal(cancelled.correctionHistory.at(-1).previousValue.appointmentDate, '2099-01-02')
  assert.equal(cancelled.correctionHistory.at(-1).updatedValue.appointmentDate, '')
  assert.equal(displayed.length, 1)
  assert.equal(displayed[0].appointmentDate, '')
  assert.equal(host.visitState(group, child, displayed).appointment, null)
  assert.equal(host.visitState(group, child, displayed).status, beforeStatus)
  assert.deepEqual(createVaccinationRepository({ storage: db }).read(childId), displayed)
  assert.deepEqual(repository.read('lina'), [])
  assert.throws(() => repository.manageVisit(childId, draft, { actor, expectedRecords: [previous], cancelAppointment: true }), /recordConflict/)
  unsubscribe()
})

test('appointment cancellation is restricted to authorized doctors and pending scheduled visits; failed writes preserve saved data', () => {
  const db = storage(), repository = createVaccinationRepository({ storage: db })
  const draft = { childId, stageId: group.id, status: 'pending', appointmentDate: '2099-01-02', appointmentTime: '10:30', notes: '' }
  repository.manageVisit(childId, draft, { actor, expectedRecords: [] })
  const previous = repository.read(childId)
  for (const role of ['mother', 'nurse']) assert.throws(() => repository.manageVisit(childId, draft, { actor: { ...actor, role }, expectedRecords: previous, cancelAppointment: true }), /correctionForbidden/)
  const write = db.setItem
  db.setItem = () => { throw Error('quota') }
  assert.throws(() => repository.manageVisit(childId, draft, { actor, expectedRecords: previous, cancelAppointment: true }), /quota/)
  assert.deepEqual(repository.read(childId), previous)
  db.setItem = write
  const completed = repository.manageVisit(childId, { ...draft, status: 'completed', administeredAt: '2026-01-02', facilityName: 'Hospital' }, { actor, expectedRecords: previous })
  const baseline = repository.read(childId)
  assert.throws(() => repository.manageVisit(childId, { ...completed, notes: '' }, { actor, expectedRecords: baseline, cancelAppointment: true }), /invalidFollowUp/)
  assert.deepEqual(repository.read(childId), baseline)
})

test('Cancel Appointment is available only in the existing appointment editor and confirmation or ordinary Cancel never saves', async () => {
  for (const language of ['en', 'ar']) {
    const dictionary = (language === 'ar' ? ar : en).childHealth.vaccinations
    const repository = createVaccinationRepository({ storage: storage() })
    const draft = { childId, stageId: group.id, status: 'pending', appointmentDate: '2099-01-02', appointmentTime: '10:30', notes: 'Saved notes' }
    repository.manageVisit(childId, draft, { actor, expectedRecords: [] })
    const previous = repository.read(childId)
    let confirmed = false, closed = 0, writes = 0, confirmationText = ''
    const host = await componentHost(language, { confirm: text => { confirmationText = text; return confirmed } })
    const props = () => ({ group, child: { id: childId }, info: { record: repository.read(childId)[0], related: repository.read(childId) }, actor, onClose() { closed++ }, onSave: (draft, expectedRecords, confirmReversal, cancelAppointment) => { writes++; return repository.manageVisit(childId, draft, { actor, expectedRecords, confirmReversal, cancelAppointment }) } })
    const render = () => host.render(props())
    const cancelButton = () => nodes(render()).find(node => node.type === 'button' && node.props.children === dictionary.cancelAppointment)
    assert.equal(cancelButton(), undefined)
    nodes(render()).find(node => node.type === 'button').props.onClick()
    assert.ok(cancelButton())
    await cancelButton().props.onClick()
    assert.equal(confirmationText, dictionary.cancelAppointmentConfirm)
    assert.equal(writes, 0)
    assert.equal(closed, 0)
    assert.deepEqual(repository.read(childId), previous)
    nodes(render()).find(node => node.type === 'button' && node.props.children === dictionary.cancel).props.onClick()
    assert.equal(closed, 1)
    assert.equal(writes, 0)
    nodes(render()).find(node => node.type === 'button').props.onClick()
    confirmed = true
    await cancelButton().props.onClick()
    assert.equal(writes, 1)
    assert.equal(closed, 2)
    assert.equal(cancelButton(), undefined)
    const summary = nodes(render()).find(node => node.type?.name === 'AppointmentSummary')
    const card = host.renderSummary(summary.props)
    assert.ok(nodes(card).some(node => node.props.children === dictionary.appointmentSummaryEmpty))
    assert.equal(repository.read(childId)[0].appointmentDate, '')
    nodes(render()).find(node => node.type === 'button').props.onClick()
    assert.equal(cancelButton(), undefined)
  }
})

test('a cancellation error keeps the appointment editor open with its draft available', async () => {
  const host = await componentHost('en')
  let closed = false
  const props = { group, child: { id: childId }, info: { record: { status: 'pending', appointmentDate: '2099-01-02', appointmentTime: '10:30', notes: 'Saved' }, related: [] }, actor, onClose() { closed = true }, onSave() { throw Error('quota') } }
  nodes(host.render(props)).find(node => node.type === 'button').props.onClick()
  const button = nodes(host.render(props)).find(node => node.type === 'button' && node.props.children === en.childHealth.vaccinations.cancelAppointment)
  await button.props.onClick()
  assert.equal(closed, false)
  const tree = host.render(props)
  assert.ok(nodes(tree).some(node => node.props.role === 'alert'))
  assert.equal(nodes(tree).find(node => node.type?.name === 'DateField').props.value, '2099-01-02')
})


test('appointment Date and Time errors appear together under their controls and clear independently in both languages', async () => {
  for (const language of ['en', 'ar']) {
    const dictionary = (language === 'ar' ? ar : en).childHealth.vaccinations
    const host = await componentHost(language)
    let saves = 0
    const props = { group, child: { id: childId }, info: { record: {}, related: [] }, actor, onSave(draft) { saves++; return { ...draft } } }
    const render = () => host.render(props)
    nodes(render()).find(node => node.type === 'button').props.onClick()
    const submit = () => nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    const date = () => nodes(render()).find(node => node.type?.name === 'DateField')
    const time = () => nodes(render()).find(node => node.type?.name === 'TimeField')
    await submit()
    assert.equal(saves, 0)
    assert.equal(date().props.required, true)
    assert.equal(date().props.error, dictionary.appointmentDateRequired)
    assert.equal(time().props.error, dictionary.appointmentTimeRequired)
    const row = nodes(render()).find(node => node.props.className === 'vaccination__appointmentFields')
    assert.equal(nodes(row).filter(node => ['DateField', 'TimeField'].includes(node.type?.name)).length, 2)
    const dateHost = await componentHost(language)
    const dateTree = dateHost.renderDate(date().props)
    const dateInput = nodes(dateTree).find(node => node.type === 'input')
    const dateMessage = nodes(dateTree).find(node => node.props.role === 'alert')
    assert.equal(dateMessage.props.children, dictionary.appointmentDateRequired)
    assert.equal(dateInput.props['aria-invalid'], true)
    assert.equal(dateInput.props['aria-describedby'], dateMessage.props.id)
    const timeHost = await componentHost(language)
    const timeTree = timeHost.renderTime(time().props)
    const timeInput = nodes(timeTree).find(node => node.props.className === 'vaccination__timeTrigger')
    const timeMessage = nodes(timeTree).find(node => node.props.role === 'alert')
    assert.equal(timeMessage.props.children, dictionary.appointmentTimeRequired)
    assert.equal(timeInput.props['aria-invalid'], true)
    assert.equal(timeInput.props['aria-describedby'], timeMessage.props.id)
    assert.ok(timeTree.props.className.includes('vaccination__timeField--invalid'))
    date().props.onChange('2099-01-02')
    assert.equal(date().props.error, '')
    assert.equal(time().props.error, dictionary.appointmentTimeRequired)
    await submit()
    assert.equal(saves, 0)
    date().props.onChange('')
    await submit()
    time().props.onChange('10:30')
    assert.equal(date().props.error, dictionary.appointmentDateRequired)
    assert.equal(time().props.error, '')
    assert.equal(saves, 0)
    date().props.onChange('2099-01-02')
    await submit()
    assert.equal(saves, 1)
  }
})

test('scheduling flags past dates, elapsed times and malformed fields without using the old generic message', async () => {
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-11-06T12:00:00'])) } }
  for (const language of ['en', 'ar']) {
    const dictionary = (language === 'ar' ? ar : en).childHealth.vaccinations
    for (const existing of [false, true]) {
      const host = await componentHost(language, { Date: FixedDate })
      let saves = 0
      const props = { group, child: { id: childId }, info: { record: existing ? { status: 'pending', appointmentDate: '2099-01-02', appointmentTime: '10:30' } : {}, related: [] }, actor, onSave(draft) { saves++; return draft } }
      const render = () => host.render(props)
      nodes(render()).find(node => node.type === 'button').props.onClick()
      const date = () => nodes(render()).find(node => node.type?.name === 'DateField')
      const time = () => nodes(render()).find(node => node.type?.name === 'TimeField')
      const submit = () => nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
      date().props.onChange('2026-11-05')
      time().props.onChange('10:30')
      await submit()
      assert.equal(date().props.error, dictionary.appointmentDateInvalid)
      assert.equal(saves, 0)
      date().props.onChange('2026-11-06')
      assert.equal(date().props.error, '')
      await submit()
      assert.equal(time().props.error, dictionary.appointmentTimeInvalid)
      assert.equal(saves, 0)
      time().props.onChange('13:30')
      assert.equal(time().props.error, '')
      date().props.onChange('2026-02-30')
      time().props.onChange('25:00')
      await submit()
      assert.equal(date().props.error, dictionary.appointmentDateInvalid)
      assert.equal(time().props.error, dictionary.appointmentTimeInvalid)
      assert.ok(!nodes(render()).some(node => node.props.children === dictionary.invalidFollowUp))
      date().props.onChange('2026-11-07')
      time().props.onChange('13:30')
      assert.equal(date().props.error, '')
      assert.equal(time().props.error, '')
      await submit()
      assert.equal(saves, 1)
    }
  }
})


test('unsaved administration edits never write storage; Cancel closes and fresh modal instances show only saved values', async () => {
  for (const language of ['en', 'ar']) {
    const dictionary = (language === 'ar' ? ar : en).childHealth.vaccinations
    for (const existing of [false, true]) {
      const db = storage(), repository = createVaccinationRepository({ storage: db })
      if (existing) repository.manageVisit(childId, { ...doseDraft(), facilityName: 'Saved Hospital', notes: 'Saved notes' }, { actor, expectedRecords: [] })
      const before = repository.read(childId)
      const bytes = () => Array.from({ length: db.length }, (_, index) => [db.key(index), db.getItem(db.key(index))])
      const originalBytes = bytes()
      let saves = 0, closed = 0
      const props = () => ({ group, child: { id: childId }, compactDetails: true, info: { record: repository.read(childId)[0] || {}, related: repository.read(childId) }, actor, onClose() { closed++ }, onSave() { saves++; assert.fail('Typing and cancelling must not save') } })
      const host = await componentHost(language)
      const render = () => host.render(props())
      nodes(render()).filter(node => node.type === 'button')[existing ? 0 : 1].props.onClick()
      nodes(render()).find(node => node.type === 'input' && node.props.id.endsWith('-location')).props.onChange({ target: { value: 'Unsaved Hamza Hospital' } })
      nodes(render()).find(node => node.type?.name === 'DateField').props.onChange('2026-01-05')
      nodes(render()).find(node => node.type?.name === 'TimeField').props.onChange('11:15')
      nodes(render()).find(node => node.type?.name === 'CompactDoseNotes').props.onChange({ target: { value: 'Unsaved notes' } })
      assert.equal(saves, 0)
      assert.deepEqual(bytes(), originalBytes)
      assert.deepEqual(repository.read(childId), before)
      nodes(render()).find(node => node.type === 'button' && node.props.children === dictionary.cancel).props.onClick()
      assert.equal(closed, 1)
      assert.equal(saves, 0)
      assert.deepEqual(bytes(), originalBytes)
      const fresh = await componentHost(language)
      const tree = fresh.render(props())
      assert.ok(!nodes(tree).some(node => node.props.children === 'Unsaved Hamza Hospital' || node.props.children === 'Unsaved notes'))
      assert.deepEqual(createVaccinationRepository({ storage: db }).read(childId), before)
      if (existing) assert.ok(nodes(tree).some(node => node.props.children === 'Saved Hospital'))
      else assert.ok(!nodes(tree).some(node => node.type === 'dd'))
    }
  }
})

test('reversing completion archives administration values and cannot leak them into an incomplete visit or the next administration draft', async () => {
  const db = storage(), repository = createVaccinationRepository({ storage: db })
  const completed = repository.manageVisit(childId, { ...doseDraft(), facilityName: 'Saved Hospital', notes: 'Saved administration notes' }, { actor, expectedRecords: [] })
  const incomplete = repository.manageVisit(childId, { ...completed, status: 'pending' }, { actor, expectedRecords: repository.read(childId), confirmReversal: true })
  assert.equal(incomplete.status, 'pending')
  assert.equal(incomplete.administeredAt, '')
  assert.equal(incomplete.administeredTime, '')
  assert.equal(incomplete.facilityName, '')
  assert.equal(incomplete.administrationLocation, '')
  assert.equal(incomplete.correctionHistory.at(-1).previousValue.facilityName, 'Saved Hospital')
  assert.equal(incomplete.correctionHistory.at(-1).previousValue.notes, 'Saved administration notes')
  for (const language of ['en', 'ar']) {
    const host = await componentHost(language)
    const props = { group, child: { id: childId }, compactDetails: true, info: { record: createVaccinationRepository({ storage: db }).read(childId)[0], related: repository.read(childId) }, actor }
    let tree = host.render(props)
    assert.ok(!nodes(tree).some(node => node.type === 'dd'))
    nodes(tree).filter(node => node.type === 'button')[1].props.onClick()
    tree = host.render(props)
    assert.equal(nodes(tree).find(node => node.type === 'input' && node.props.id.endsWith('-location')).props.value, '')
    assert.equal(nodes(tree).find(node => node.type?.name === 'DateField').props.value, '')
    assert.equal(nodes(tree).find(node => node.type?.name === 'TimeField').props.time, '')
    assert.equal(nodes(tree).find(node => node.type?.name === 'CompactDoseNotes').props.value, '')
  }
})


test('existing incomplete records retain their stored bytes but cannot prefill a new administration with inactive metadata', async () => {
  const db = storage(), repository = createVaccinationRepository({ storage: db })
  const pending = { ...doseDraft(), kind: 'vaccination-visit', visitId: group.id, status: 'pending', administeredAt: '', doseIds: group.doses.map(dose => dose.id), facilityName: 'مستشفى حمزة', notes: 'Previously retained notes' }
  repository.importRecords(childId, [pending])
  const before = repository.read(childId)
  for (const language of ['en', 'ar']) {
    const host = await componentHost(language)
    const props = { group, child: { id: childId }, compactDetails: true, info: { record: before[0], related: before }, actor }
    const tree = host.render(props)
    assert.ok(!nodes(tree).some(node => node.type === 'dd'))
    nodes(tree).filter(node => node.type === 'button')[1].props.onClick()
    const form = host.render(props)
    assert.equal(nodes(form).find(node => node.type === 'input' && node.props.id.endsWith('-location')).props.value, '')
    assert.equal(nodes(form).find(node => node.type?.name === 'TimeField').props.time, '')
    assert.equal(nodes(form).find(node => node.type?.name === 'CompactDoseNotes').props.value, '')
    assert.deepEqual(createVaccinationRepository({ storage: db }).read(childId), before)
  }
})

test('closing with the header or Escape discards the mounted administration draft without invoking a save', async () => {
  for (const closeMode of ['header', 'escape']) {
    const repository = createVaccinationRepository({ storage: storage() })
    let closed = 0
    const host = await componentHost('en')
    const details = host.renderDetails({ group, child: { id: childId }, records: [], doctor: true, correctionActor: actor, onClose() { closed++ }, onManageVisit() { assert.fail('Closing must not save') } })
    const editor = nodes(details).find(node => node.type?.name === 'VisitEditor')
    const draftHost = await componentHost('en')
    nodes(draftHost.render(editor.props)).filter(node => node.type === 'button')[1].props.onClick()
    nodes(draftHost.render(editor.props)).find(node => node.type === 'input' && node.props.id.endsWith('-location')).props.onChange({ target: { value: 'Unsaved hospital' } })
    if (closeMode === 'header') nodes(details).find(node => node.type === 'button' && node.props.className === 'vaccination__close').props.onClick()
    else { const target = {}; details.props.onCancel({ target, currentTarget: target, preventDefault() { assert.fail('Escape should close the outer modal') } }) }
    assert.equal(closed, 1)
    assert.deepEqual(repository.read(childId), [])
    const reopened = await componentHost('en')
    const view = reopened.render(editor.props)
    assert.ok(!nodes(view).some(node => node.type === 'dd'))
    nodes(view).filter(node => node.type === 'button')[1].props.onClick()
    assert.equal(nodes(reopened.render(editor.props)).find(node => node.type === 'input' && node.props.id.endsWith('-location')).props.value, '')
  }
})


test('administration Add/Edit validates date and location together, clears each inline error independently and accepts empty time and notes', async () => {
  for (const language of ['en', 'ar']) {
    const dictionary = (language === 'ar' ? ar : en).childHealth.vaccinations
    for (const existing of [false, true]) {
      const repository = createVaccinationRepository({ storage: storage() })
      if (existing) repository.manageVisit(childId, { ...doseDraft(), facilityName: 'Saved Hospital' }, { actor, expectedRecords: [] })
      const before = repository.read(childId)
      let saves = 0
      const host = await componentHost(language)
      const props = () => ({ group, child: { id: childId, dateOfBirth: '2023-10-18' }, info: { record: repository.read(childId)[0] || {}, related: repository.read(childId) }, actor, onSave(draft, expectedRecords) { saves++; return repository.manageVisit(childId, draft, { actor, expectedRecords }) } })
      const render = () => host.render(props())
      nodes(render()).filter(node => node.type === 'button')[existing ? 0 : 1].props.onClick()
      const date = () => nodes(render()).find(node => node.type?.name === 'DateField')
      const location = () => nodes(render()).find(node => node.type === 'input' && node.props.id.endsWith('-location'))
      const locationError = () => nodes(render()).find(node => node.props.role === 'alert' && node.props.id?.endsWith('-location-error'))
      const submit = () => nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
      date().props.onChange('')
      location().props.onChange({ target: { value: '   ' } })
      nodes(render()).find(node => node.type?.name === 'TimeField').props.onChange('')
      nodes(render()).find(node => node.type?.name === 'CompactDoseNotes').props.onChange({ target: { value: '' } })
      await submit()
      assert.equal(saves, 0)
      assert.equal(date().props.error, dictionary.vaccinationDateRequired)
      assert.equal(locationError().props.children, dictionary.corrections.locationRequired)
      assert.equal(location().props['aria-invalid'], true)
      assert.equal(location().props['aria-describedby'], locationError().props.id)
      assert.equal(location().props.value, '   ')
      assert.equal(date().props.value, '')
      assert.deepEqual(repository.read(childId), before)
      location().props.onChange({ target: { value: 'New Hospital' } })
      assert.equal(locationError(), undefined)
      assert.equal(location().props['aria-invalid'], undefined)
      assert.equal(date().props.error, dictionary.vaccinationDateRequired)
      date().props.onChange('2999-01-01')
      await submit()
      assert.equal(saves, 0)
      assert.equal(date().props.error, dictionary.corrections.required)
      assert.equal(location().props.value, 'New Hospital')
      date().props.onChange('2026-01-04')
      assert.equal(date().props.error, '')
      location().props.onChange({ target: { value: ' ' } })
      await submit()
      assert.equal(saves, 0)
      assert.equal(date().props.error, '')
      assert.equal(locationError().props.children, dictionary.corrections.locationRequired)
      location().props.onChange({ target: { value: '  New Hospital  ' } })
      assert.equal(locationError(), undefined)
      await submit()
      assert.equal(saves, 1)
      const record = repository.read(childId)[0]
      assert.equal(record.status, 'completed')
      assert.equal(record.administeredAt, '2026-01-04')
      assert.equal(record.facilityName, 'New Hospital')
      assert.equal(record.administeredTime, '')
      assert.equal(record.notes, '')
    }
  }
})
