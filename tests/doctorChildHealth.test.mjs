import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createServer, transformWithOxc } from 'vite'
import { createElement } from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { canonicalChildId, canonicalDemoChildren, demoMotherId, motherChildIds } from '../src/services/demoChildAccess.js'
import * as medical from '../src/components/doctor/medicalRecordData.js'
import * as patients from '../src/components/doctor/patientData.js'
import { clinicalNotesFor } from '../src/components/doctor/clinicalNotesData.js'
import { formatFollowUpTime } from '../src/components/doctor/followUpData.js'
import { createVaccinationRepository } from '../src/services/vaccinationRepository.js'
import { createMilestonesRepository } from '../src/services/milestonesRepository.js'

const runtime = { _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment }
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]
async function load(path, bindings, name) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, path)
  code = code.replace(/^import .*;?\r?\n/gm, '').replace('export default ', '')
  return new Function(...Object.keys(bindings), code + `\nreturn ${name}`)(...Object.values(bindings))
}
function storage() {
  const data = new Map()
  return { get length() { return data.size }, key: index => [...data.keys()][index] ?? null, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
}

test('Doctor adapter reuses canonical IDs, real DOBs and mother mapping without wiring general follow-ups', async () => {
  for (const language of ['en', 'ar']) {
    const Adapter = await load('../src/components/doctor/DoctorChildHealth.jsx', { ...runtime, useLanguage: () => ({ language, t: key => key }), canonicalChildId, motherChildIds, ageFromBirthDate: medical.ageFromBirthDate, VaccinationSchedule: 'vaccinations', DevelopmentalMilestones: 'milestones' }, 'DoctorChildHealth')
    for (const id of ['demo-child-3', 'demo-child-lina', 'demo-child-1']) for (const section of ['vaccinations', 'milestones']) {
      const patient = canonicalDemoChildren.find(patient => patient.id === id)
      const onBack = () => {}
      const component = nodes(Adapter({ patient, section, onBack })).find(node => node.type === section)
      assert.equal(component.props.role, 'doctor')
      assert.equal(component.props.child.id, id)
      assert.equal(component.props.child.dateOfBirth, patient.dateOfBirth)
      assert.equal(component.props.onSaveFollowUp, undefined)
      if (id === 'demo-child-lina') assert.equal(component.props.currentAge, undefined)
      if (section === 'milestones') {
        assert.equal(component.props.motherId, id === 'demo-child-1' ? null : demoMotherId)
        assert.equal(component.props.onBack, onBack)
      }
    }
  }
})

test('patient record quick actions open both real sections and Back returns to the unchanged record overview', async () => {
  const source = await readFile(new URL('../src/pages/doctor/ChildMedicalRecord.jsx', import.meta.url), 'utf8')
  const componentNames = [...source.matchAll(/import (\w+) from/g)].map(match => match[1])
  const states = []
  let index = 0
  const bindings = { ...runtime, ...Object.fromEntries(componentNames.map(name => [name, name])), ...medical, ...patients, clinicalNotesFor, formatFollowUpTime, useLanguage: () => ({ language: 'en', t: key => key }), useState: initial => {
    const slot = index++
    if (!(slot in states)) states[slot] = initial
    return [states[slot], value => { states[slot] = value }]
  }, useRef: () => ({ current: null }), useEffect() {} }
  const Record = await load('../src/pages/doctor/ChildMedicalRecord.jsx', bindings, 'ChildMedicalRecord')
  const patient = canonicalDemoChildren.find(patient => patient.id === 'demo-child-3')
  const render = () => { index = 0; return Record({ patient, onBack() {} }) }
  for (const section of ['growth', 'vaccinations', 'milestones']) {
    nodes(render()).find(node => node.type === 'MedicalRecordQuickActions').props.onSelect(section)
    const embedded = nodes(render()).find(node => node.type === (section === 'growth' ? 'DoctorPatientGrowth' : 'DoctorChildHealth'))
    if (section !== 'growth') assert.equal(embedded.props.section, section)
    assert.equal(embedded.props.patient, patient)
    nodes(render()).find(node => node.type === 'button' && node.props.className === 'dd-button dmr-back').props.onClick()
    assert.ok(nodes(render()).some(node => node.type === 'MedicalVisitHistory'))
    assert.ok(nodes(render()).some(node => node.type === 'FollowUpAppointments'))
  }
})

test('Doctor and Mother views share persisted vaccination visits and maternal observations, in both languages, with opposite edit roles', async () => {
  const previousWindow = globalThis.window, db = storage(), browser = new EventTarget()
  browser.localStorage = db
  globalThis.window = browser
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  try {
    const { LanguageProvider } = await server.ssrLoadModule('/src/contexts/LanguageContext.jsx')
    const { default: Doctor } = await server.ssrLoadModule('/src/components/doctor/DoctorChildHealth.jsx')
    const { default: Vaccinations } = await server.ssrLoadModule('/src/components/child-health/VaccinationSchedule.jsx')
    const patient = canonicalDemoChildren.find(patient => patient.id === 'demo-child-3')
    const vaccines = createVaccinationRepository({ storage: db })
    let visit = vaccines.saveVisit(patient.id, { childId: patient.id, kind: 'vaccination-visit', visitId: 'month2', doseIds: ['combo1', 'rota1'], status: 'pending', notes: 'Initial note', appointmentDate: '2099-01-02', appointmentTime: '10:30', appointmentHistory: [] }, { expectedRecords: [] })
    visit = vaccines.saveVisit(patient.id, { ...visit, appointmentDate: '2099-01-03', notes: 'Doctor updated note' }, { expectedRecords: [visit] })
    const milestones = createMilestonesRepository({ storage: db })
    milestones.saveResponse('adam', demoMotherId, '2m-social-smile', { answer: 'yes', note: 'Mother observed a smile' })
    for (const language of ['en', 'ar']) {
      db.setItem('nomu.language', language)
      const render = (Component, props) => renderToStaticMarkup(createElement(LanguageProvider, null, createElement(Component, props)))
      const doctorVaccines = render(Doctor, { patient, section: 'vaccinations' })
      const motherVaccines = render(Vaccinations, { role: 'mother', child: patient })
      for (const html of [doctorVaccines, motherVaccines]) {
        assert.ok(html.includes(language === 'en' ? '2099' : new Intl.NumberFormat('ar', { useGrouping: false }).format(2099)))
        assert.ok(html.includes('vaccination__summary'))
      }
      assert.ok(motherVaccines.includes('vaccination__information'))
      assert.ok(!motherVaccines.includes('type="submit"'))
      const html = render(Doctor, { patient, section: 'milestones' })
      assert.ok(html.includes('Mother observed a smile'))
      assert.ok(html.includes('dd-yes'))
      assert.ok(!html.includes('<textarea'))
      assert.ok(!html.includes('type="radio"'))
      assert.ok(!html.includes('type="submit"'))
      const lina = canonicalDemoChildren.find(patient => patient.id === 'demo-child-lina')
      assert.ok(!render(Doctor, { patient: lina, section: 'milestones' }).includes('Mother observed a smile'))
      milestones.saveResponse('adam', demoMotherId, '2m-social-smile', { note: 'Updated maternal observation' })
      assert.ok(render(Doctor, { patient, section: 'milestones' }).includes('Updated maternal observation'))
      milestones.saveResponse('adam', demoMotherId, '2m-social-smile', { note: 'Mother observed a smile' })
    }
    assert.deepEqual(createVaccinationRepository({ storage: db }).read('adam'), [visit])
    assert.deepEqual(vaccines.read('lina'), [])
    assert.equal(visit.appointmentHistory[0].status, 'rescheduled')
  } finally {
    await server.close()
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})
