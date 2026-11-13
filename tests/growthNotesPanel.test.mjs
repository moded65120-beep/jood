import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'
import { createMedicalRecordRepository, MEDICAL_RECORD_STORAGE_KEY } from '../src/services/medicalRecordRepository.js'
import { demoDoctorId, demoMotherId } from '../src/services/demoChildAccess.js'
import { selectMotherMedicalRecord } from '../src/services/medicalRecordSelectors.js'
import { whoMeasurements } from '../src/services/growthMeasurementAdapter.js'
import { dateOrdinal, formatGrowthDate } from '../src/utils/growthDates.js'

const childId = 'demo-child-3', doctor = { id: demoDoctorId, name: 'Dr. Sarah Ahmad' }
const measurement = { childId, measurementDate: '2025-01-02', weightKg: 11.25, heightCm: 82.4, headCircumferenceCm: 46.5, measurementMethod: 'standing_height' }
function storage() { const data = new Map(); return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) } }
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]

test('note-only updates preserve measurement values/count, persist for Mother, isolate children and reject stale edits', () => {
  const db = storage(), repo = createMedicalRecordRepository(db)
  repo.act(doctor, childId, 'addGrowthMeasurement', [measurement])
  const original = repo.getSnapshot().patients.find(child => child.id === childId).growthMeasurements[0]
  const draft = { measurementId: original.id, expectedRecord: JSON.stringify(original), doctorNote: 'First note' }
  assert.equal(repo.act(doctor, childId, 'updateGrowthNote', [draft]), true)
  assert.equal(repo.act(doctor, childId, 'updateGrowthNote', [{ ...draft, doctorNote: 'Stale overwrite' }]), false)
  assert.equal(repo.act(doctor, 'demo-child-1', 'updateGrowthNote', [draft]), false)
  const current = repo.getSnapshot().patients.find(child => child.id === childId).growthMeasurements[0]
  assert.deepEqual({ ...current, doctorNote: undefined }, { ...original, doctorNote: undefined })
  assert.equal(repo.act(doctor, childId, 'updateGrowthNote', [{ ...draft, expectedRecord: JSON.stringify(current), doctorNote: 'Updated note' }]), true)
  const mother = selectMotherMedicalRecord(createMedicalRecordRepository(db).getSnapshot(), demoMotherId, 'adam')
  assert.equal(mother.growthMeasurements.length, 1)
  assert.equal(mother.growthMeasurements[0].doctorNote, 'Updated note')
  assert.deepEqual(selectMotherMedicalRecord(repo.getSnapshot(), demoMotherId, 'lina').growthMeasurements, [])
  assert.deepEqual([...db.data.keys()], [MEDICAL_RECORD_STORAGE_KEY])
  const updated = mother.growthMeasurements[0]
  assert.equal(repo.act(doctor, childId, 'updateGrowthNote', [{ measurementId: updated.id, expectedRecord: JSON.stringify(updated), doctorNote: '' }]), false)
})

test('legacy measurement notes use an explicit index and exact baseline without inventing IDs or rewriting values', () => {
  const db = storage(), base = createMedicalRecordRepository(db)
  const snapshot = structuredClone(base.getSnapshot())
  const record = { date: '2025-01-02', weight: 11.25, height: 82.4, headCircumference: 46.5, doctorNote: 'Legacy note' }
  snapshot.patients.find(child => child.id === childId).growthMeasurements = [record]
  db.setItem(MEDICAL_RECORD_STORAGE_KEY, JSON.stringify(snapshot))
  const repo = createMedicalRecordRepository(db)
  assert.equal(repo.act(doctor, childId, 'updateGrowthNote', [{ measurementIndex: 0, expectedRecord: JSON.stringify(record), doctorNote: 'Reviewed' }]), true)
  assert.deepEqual(repo.getSnapshot().patients.find(child => child.id === childId).growthMeasurements, [{ ...record, doctorNote: 'Reviewed' }])
})

test('panel selects a measurement explicitly, saves/updates its note, closes with button/Escape and renders both directions', async () => {
  let { code } = await transformWithOxc(await readFile(new URL('../src/components/doctor/GrowthNotesPanel.jsx', import.meta.url), 'utf8'), 'GrowthNotesPanel.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace('export default ', '')
  for (const [language, dictionary] of [['en', en], ['ar', ar]]) {
    const db = storage(), repo = createMedicalRecordRepository(db), states = []
    repo.act(doctor, childId, 'addGrowthMeasurement', [measurement])
    let cursor = 0, closed = 0
    const bindings = { _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment, useLanguage: () => ({ language, t: key => key.split('.').reduce((value, part) => value?.[part], dictionary) }), useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], next => { states[index] = next }] }, useRef: () => ({ current: null }), useEffect() {}, X: 'icon', Button: 'button', GrowthDoctorNotes: 'notes-history', dateOrdinal, formatGrowthDate }
    const Panel = new Function(...Object.keys(bindings), code + '\nreturn GrowthNotesPanel')(...Object.values(bindings))
    const render = () => {
      cursor = 0
      const raw = repo.getSnapshot().patients.find(child => child.id === childId).growthMeasurements
      const measurements = whoMeasurements(childId, raw).map((record, index) => ({ ...record, noteKey: 'id:' + record.id, noteVersion: JSON.stringify(raw[index]), noteIndex: index }))
      return Panel({ child: { id: childId }, measurements, onSave: draft => repo.act(doctor, childId, 'updateGrowthNote', [draft]), onClose: () => closed++ })
    }
    assert.equal(render().props.dir, language === 'ar' ? 'rtl' : 'ltr')
    assert.equal(nodes(render()).find(node => node.props.type === 'submit').props.disabled, true)
    const id = repo.getSnapshot().patients.find(child => child.id === childId).growthMeasurements[0].id
    const select = () => nodes(render()).find(node => node.type === 'select').props.onChange({ target: { value: 'id:' + id } })
    select()
    nodes(render()).find(node => node.type === 'textarea').props.onChange({ target: { value: 'Saved from panel' } })
    await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.equal(selectMotherMedicalRecord(repo.getSnapshot(), demoMotherId, 'adam').growthMeasurements[0].doctorNote, 'Saved from panel')
    assert.ok(nodes(render()).some(node => node.props.children === dictionary.growthNotes.saved))
    select()
    assert.equal(nodes(render()).find(node => node.type === 'textarea').props.value, 'Saved from panel')
    nodes(render()).find(node => node.type === 'textarea').props.onChange({ target: { value: 'Updated from panel' } })
    await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.equal(selectMotherMedicalRecord(createMedicalRecordRepository(db).getSnapshot(), demoMotherId, 'adam').growthMeasurements[0].doctorNote, 'Updated from panel')
    nodes(render()).find(node => node.props.className === 'growth-notes-panel__close').props.onClick()
    render().props.onKeyDown({ key: 'Escape', preventDefault() {} })
    assert.equal(closed, 2)
  }
})
