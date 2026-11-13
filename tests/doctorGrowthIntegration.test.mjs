import assert from 'node:assert/strict'
import test from 'node:test'
import { createMedicalRecordRepository, MEDICAL_RECORD_STORAGE_KEY } from '../src/services/medicalRecordRepository.js'
import { demoDoctorId, demoMotherId } from '../src/services/demoChildAccess.js'
import { selectMotherMedicalRecord } from '../src/services/medicalRecordSelectors.js'
import { whoMeasurements, growthSex } from '../src/services/growthMeasurementAdapter.js'
import { measurementSeries } from '../src/components/doctor/medicalRecordData.js'
import { readFile } from 'node:fs/promises'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import * as dates from '../src/utils/growthDates.js'

const doctor = { id: demoDoctorId, name: 'Dr. Sarah Ahmad' }
const id = 'demo-child-3'
const draft = { childId: id, measurementDate: '2025-01-02', weightKg: 11.25, heightCm: 82.4, headCircumferenceCm: 46.5, measurementMethod: 'standing_height' }
function storage() {
  const data = new Map()
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
}

test('growth append persists in the existing snapshot; Mother selector and Doctor overview read the same raw data', () => {
  const db = storage(), repo = createMedicalRecordRepository(db)
  const original = structuredClone(repo.getSnapshot())
  assert.equal(repo.act(doctor, id, 'addGrowthMeasurement', [draft]), true)
  const saved = repo.getSnapshot().patients.find(child => child.id === id).growthMeasurements[0]
  assert.equal(saved.weightKg, 11.25)
  assert.equal(saved.childId, id)
  assert.deepEqual([...db.data.keys()], [MEDICAL_RECORD_STORAGE_KEY])
  assert.equal(measurementSeries([saved], 'weight')[0].value, 11.25)
  assert.equal(measurementSeries([saved], 'height')[0].value, 82.4)
  assert.deepEqual(selectMotherMedicalRecord(createMedicalRecordRepository(db).getSnapshot(), demoMotherId, 'adam').growthMeasurements, [saved])
  for (const child of repo.getSnapshot().patients) {
    const before = original.patients.find(item => item.id === child.id)
    assert.deepEqual({ ...child, growthMeasurements: [] }, { ...before, growthMeasurements: [] })
    if (child.id !== id) assert.deepEqual(child.growthMeasurements, before.growthMeasurements)
  }
  assert.equal(repo.act(doctor, id, 'addGrowthMeasurement', [draft]), false)
  assert.equal(repo.getSnapshot().patients.find(child => child.id === id).growthMeasurements.length, 1)
})

test('invalid dates, methods, values, missing profiles and mismatched children cannot write', () => {
  const db = storage(), repo = createMedicalRecordRepository(db)
  for (const patch of [{ weightKg: 0 }, { heightCm: NaN }, { headCircumferenceCm: '46' }, { measurementMethod: '' }, { measurementDate: '2020-01-01' }, { measurementDate: '2026-10-19' }, { measurementDate: '2099-01-01' }, { measurementDate: '2025-02-30' }, { childId: 'demo-child-1' }]) {
    assert.equal(repo.act(doctor, id, 'addGrowthMeasurement', [{ ...draft, ...patch }]), false)
  }
  assert.equal(repo.act({ ...doctor, id: 'unknown' }, id, 'addGrowthMeasurement', [draft]), false)
  assert.equal(repo.assignChild(demoDoctorId, 'demo-child-lina'), true)
  assert.equal(repo.act(doctor, 'demo-child-lina', 'addGrowthMeasurement', [{ ...draft, childId: 'demo-child-lina' }]), false)
  assert.deepEqual(repo.getSnapshot().patients.find(child => child.id === id).growthMeasurements, [])
})

test('legacy adapters preserve raw entries, exclude foreign records and never guess measurement methods', () => {
  const legacy = [{ date: '2025-01-01', weight: 11, height: 82, headCircumference: 46 }, { childId: 'demo-child-1', date: '2025-01-01', weight: 99 }]
  const original = structuredClone(legacy)
  const adapted = whoMeasurements(id, legacy)
  assert.equal(adapted.length, 1)
  assert.equal(adapted[0].childId, id)
  assert.equal(adapted[0].measurementDate, '2025-01-01')
  assert.equal(adapted[0].heightCm, 82)
  assert.equal(adapted[0].measurementMethod, undefined)
  assert.deepEqual(legacy, original)
  assert.equal(growthSex({ gender: 'Female' }), 'female')
  assert.equal(growthSex({ gender: 'unknown' }), null)
  const db = storage(), initial = createMedicalRecordRepository(db)
  const state = structuredClone(initial.getSnapshot())
  state.patients.find(child => child.id === id).growthMeasurements = [legacy[0]]
  db.setItem(MEDICAL_RECORD_STORAGE_KEY, JSON.stringify(state))
  const repo = createMedicalRecordRepository(db)
  assert.equal(repo.act(doctor, id, 'addGrowthMeasurement', [draft]), true)
  assert.deepEqual(repo.getSnapshot().patients.find(child => child.id === id).growthMeasurements[0], original[0])
})

test('cross-tab events refresh subscribers; an unsubscribed stale writer fails and reloads instead of overwriting newer records', () => {
  const db = storage(), host = new EventTarget(), a = createMedicalRecordRepository(db, host), b = createMedicalRecordRepository(db, host)
  let changes = 0
  const unsubscribe = b.subscribe(() => changes++)
  assert.equal(a.act(doctor, id, 'addGrowthMeasurement', [draft]), true)
  assert.equal(b.getSnapshot().patients.find(child => child.id === id).growthMeasurements.length, 1)
  assert.ok(changes > 0)
  unsubscribe()
  assert.equal(a.act(doctor, id, 'addGrowthMeasurement', [{ ...draft, measurementDate: '2025-02-02' }]), true)
  assert.equal(b.act(doctor, id, 'addGrowthMeasurement', [{ ...draft, measurementDate: '2025-03-02' }]), false)
  assert.equal(b.getSnapshot().patients.find(child => child.id === id).growthMeasurements.length, 2)
  assert.equal(b.act(doctor, id, 'addGrowthMeasurement', [{ ...draft, measurementDate: '2025-03-02' }]), true)
  const c = createMedicalRecordRepository(db, host)
  const stop = c.subscribe(() => changes++)
  a.act(doctor, id, 'addGrowthMeasurement', [{ ...draft, measurementDate: '2025-04-02' }]) // stale: reloads first
  assert.equal(a.act(doctor, id, 'addGrowthMeasurement', [{ ...draft, measurementDate: '2025-04-02' }]), true)
  const event = new Event('storage'); Object.defineProperty(event, 'key', { value: MEDICAL_RECORD_STORAGE_KEY }); host.dispatchEvent(event)
  assert.equal(c.getSnapshot().patients.find(child => child.id === id).growthMeasurements.length, 4)
  stop()
})

test('Doctor Growth adapter passes actual profile and measurements through the existing command callback', async () => {
  let { code } = await transformWithOxc(await readFile(new URL('../src/components/doctor/DoctorPatientGrowth.jsx', import.meta.url), 'utf8'), 'DoctorPatientGrowth.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace('export default ', '')
  const { canonicalChildId } = await import('../src/services/demoChildAccess.js')
  const Adapter = new Function('_jsx', 'canonicalChildId', 'growthSex', 'whoMeasurements', 'DoctorGrowthChart', code + '\nreturn DoctorPatientGrowth')(jsx.jsx, canonicalChildId, growthSex, whoMeasurements, 'chart')
  const repo = createMedicalRecordRepository(storage()), patient = repo.getSnapshot().patients.find(child => child.id === id)
  const tree = Adapter({ patient, onSave: (childId, record) => repo.act(doctor, childId, 'addGrowthMeasurement', [record]) })
  assert.equal(tree.props.child.id, id)
  assert.equal(tree.props.child.dateOfBirth, patient.dateOfBirth)
  assert.equal(tree.props.child.sex, 'male')
  assert.equal(tree.props.onSave(draft), true)
  assert.equal(Adapter({ patient: repo.getSnapshot().patients.find(child => child.id === id) }).props.measurements[0].weightKg, 11.25)
})

test('controlled Doctor Growth page shows failure honestly and disables form for missing DOB/sex', async () => {
  let { code } = await transformWithOxc(await readFile(new URL('../src/pages/doctor/DoctorGrowthChart.jsx', import.meta.url), 'utf8'), 'DoctorGrowthChart.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace('export default ', '')
  const states = []
  let cursor = 0
  const bindings = { ...dates, _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment, NotebookPen: 'note-icon', GrowthNotesPanel: 'notes-panel', GrowthDoctorNotes: 'GrowthDoctorNotes', Card: 'card', GrowthChart: 'chart', GrowthMeasurementForm: 'form', LanguageSwitcher: 'language', useLanguage: () => ({ language: 'en', t: key => key }), useRef: () => ({ current: null }), useState: initial => {
    const index = cursor++
    if (!(index in states)) states[index] = initial
    return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next }]
  } }
  const Page = new Function(...Object.keys(bindings), code + '\nreturn DoctorGrowthChart')(...Object.values(bindings))
  const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]
  const child = { id, name: { en: 'Actual patient' }, sex: 'male', dateOfBirth: '2023-10-18' }
  const render = profile => { cursor = 0; return Page({ child: profile, measurements: [], onSave: () => false }) }
  nodes(render(child)).find(node => node.type === 'form').props.onSave(draft)
  assert.ok(nodes(render(child)).some(node => node.props.role === 'alert'))
  assert.ok(!nodes(render({ ...child, dateOfBirth: null })).some(node => node.type === 'form'))
  assert.ok(!nodes(render({ ...child, sex: null })).some(node => node.type === 'form'))
  nodes(render(child)).find(node => node.props.className === 'doctor-growth__notes-button').props.onClick()
  const panel = nodes(render(child)).find(node => node.type === 'notes-panel')
  assert.ok(panel)
  assert.equal(panel.props.child.id, id)
  panel.props.onClose()
  assert.ok(!nodes(render(child)).some(node => node.type === 'notes-panel'))
})
