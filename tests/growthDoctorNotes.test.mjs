import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createMedicalRecordRepository, MEDICAL_RECORD_STORAGE_KEY } from '../src/services/medicalRecordRepository.js'
import { demoDoctorId, demoMotherId } from '../src/services/demoChildAccess.js'
import { selectMotherMedicalRecord } from '../src/services/medicalRecordSelectors.js'
import { whoMeasurements } from '../src/services/growthMeasurementAdapter.js'

function storage() {
  const data = new Map()
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
}
const doctor = { id: demoDoctorId, name: 'Dr. Sarah Ahmad' }
const childId = 'demo-child-3'
const measurement = { childId, measurementDate: '2025-01-02', weightKg: 11.25, heightCm: 82.4, headCircumferenceCm: 46.5, measurementMethod: 'standing_height' }

test('growth notes persist inside measurements, preserve old entries, reject invalid notes and never duplicate a measurement', () => {
  const db = storage(), host = new EventTarget(), repo = createMedicalRecordRepository(db, host), reader = createMedicalRecordRepository(db, host)
  let updates = 0
  const unsubscribe = reader.subscribe(() => updates++)
  const before = structuredClone(repo.getSnapshot())
  assert.equal(repo.act(doctor, childId, 'addGrowthMeasurement', [{ ...measurement, doctorNote: 'Monitor growth.\nFollow up as discussed.' }]), true)
  assert.equal(repo.act(doctor, childId, 'addGrowthMeasurement', [{ ...measurement, doctorNote: 'Attempt to change existing note' }]), false)
  assert.equal(repo.act(doctor, childId, 'addGrowthMeasurement', [{ ...measurement, measurementDate: '2025-02-02' }]), true)
  assert.equal(repo.act(doctor, childId, 'addGrowthMeasurement', [{ ...measurement, measurementDate: '2025-03-02', doctorNote: {} }]), false)
  const records = selectMotherMedicalRecord(createMedicalRecordRepository(db).getSnapshot(), demoMotherId, 'adam').growthMeasurements
  assert.equal(records.length, 2)
  assert.equal(records[0].doctorNote, 'Monitor growth.\nFollow up as discussed.')
  assert.equal(records[1].doctorNote, undefined)
  assert.deepEqual(selectMotherMedicalRecord(repo.getSnapshot(), demoMotherId, 'lina').growthMeasurements, [])
  assert.equal(reader.getSnapshot().patients.find(child => child.id === childId).growthMeasurements[0].doctorNote, records[0].doctorNote)
  assert.ok(updates > 0)
  assert.deepEqual([...db.data.keys()], [MEDICAL_RECORD_STORAGE_KEY])
  for (const patient of repo.getSnapshot().patients) {
    const original = before.patients.find(child => child.id === patient.id)
    assert.deepEqual({ ...patient, growthMeasurements: [] }, { ...original, growthMeasurements: [] })
  }
  unsubscribe()
})

test('Mother route and Doctor Growth show identical dated notes in both languages, with no Mother editing controls', async () => {
  const db = storage(), previousWindow = globalThis.window, browser = new EventTarget()
  browser.localStorage = db
  globalThis.window = browser
  const repo = createMedicalRecordRepository(db)
  repo.act(doctor, childId, 'addGrowthMeasurement', [{ ...measurement, doctorNote: 'Shared doctor growth note <script>plain text</script>' }])
  repo.act(doctor, childId, 'addGrowthMeasurement', [{ ...measurement, measurementDate: '2025-02-02' }])
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  try {
    const { LanguageProvider } = await server.ssrLoadModule('/src/contexts/LanguageContext.jsx')
    const { MedicalRecordProvider } = await server.ssrLoadModule('/src/contexts/MedicalRecordContext.jsx')
    const { default: Overview } = await server.ssrLoadModule('/src/pages/mother/ChildOverview.jsx')
    const { default: DoctorGrowth } = await server.ssrLoadModule('/src/pages/doctor/DoctorGrowthChart.jsx')
    const { default: Notes } = await server.ssrLoadModule('/src/components/child-health/GrowthDoctorNotes.jsx')
    const render = element => renderToStaticMarkup(createElement(LanguageProvider, null, element))
    for (const language of ['en', 'ar']) {
      db.setItem('nomu.language', language)
      for (const alias of ['adam', 'lina']) {
        const html = render(createElement(MedicalRecordProvider, null, createElement(MemoryRouter, { initialEntries: [`/mother/children/${alias}/growth-chart`] }, createElement(Routes, null, createElement(Route, { path: '/mother/children/:childId/:section', element: createElement(Overview) })))) )
        assert.ok(html.includes('mother-growth__chart-layout'))
        assert.ok(!html.includes('child-placeholder'))
        assert.ok(!html.includes('<textarea'))
        assert.ok(!html.includes('type="submit"'))
        assert.equal(html.includes('Shared doctor growth note'), alias === 'adam')
        if (alias === 'adam') {
          assert.ok(html.includes(language === 'en' ? 'Doctor&#x27;s Notes' : 'ملاحظات الطبيب'))
          assert.ok(html.includes('dateTime="2025-01-02"'))
          assert.ok(html.includes('&lt;script&gt;plain text&lt;/script&gt;'))
        }
      }
      const model = selectMotherMedicalRecord(createMedicalRecordRepository(db).getSnapshot(), demoMotherId, 'adam')
      const records = whoMeasurements(childId, model.growthMeasurements)
      const html = render(createElement(DoctorGrowth, { child: { ...model.profile, sex: 'male' }, measurements: records, onSave: () => false }))
      assert.ok(html.includes('doctor-growth__notes-button'))
      assert.ok(!html.includes('name="doctorNote"'))
      assert.ok(html.includes('growth-measurement-form__save'))
      assert.equal(render(createElement(Notes, { child: { id: childId }, measurements: [records[1]] })), '')
    }
    const css = await readFile(new URL('../src/components/doctor/GrowthMeasurementForm.css', import.meta.url), 'utf8')
    assert.ok(!css.includes('#F59E0B'))
    const primary = await readFile(new URL('../src/components/common/Button.css', import.meta.url), 'utf8')
    assert.ok(primary.includes('.nomu-button--primary'))
    assert.ok(primary.includes('background: var(--color-primary)'))
    assert.ok(primary.includes(':focus-visible'))
    const doctorCSS = await readFile(new URL('../src/pages/doctor/DoctorGrowthChart.css', import.meta.url), 'utf8')
    assert.ok(doctorCSS.includes('background: #F59E0B; color: white'))
    assert.ok(doctorCSS.includes('.doctor-growth__notes-button:hover:not(:disabled) { background: #D97706;'))
  } finally {
    await server.close()
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})
