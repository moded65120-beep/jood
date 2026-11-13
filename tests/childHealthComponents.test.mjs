import { vaccinationStages } from '../src/services/vaccinationScheduleData.js'
import { vaccinationDoseState } from '../src/services/vaccinationRepository.js'
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createServer, transformWithOxc } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as jsx from 'react/jsx-runtime'
import { createMilestonesRepository } from '../src/services/milestonesRepository.js'
import { createVaccinationRepository } from '../src/services/vaccinationRepository.js'
import { demoMotherId } from '../src/services/demoChildAccess.js'

function storage() {
  const data = new Map()
  return { get length() { return data.size }, key: index => [...data.keys()][index] ?? null, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
}
function hooks() {
  const states = [], effects = []
  let index = 0
  return {
    reset() { index = 0 },
    useState(initial) {
      const slot = index++
      if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial
      return [states[slot], next => { states[slot] = typeof next === 'function' ? next(states[slot]) : next }]
    },
    useRef(initial) {
      const slot = index++
      if (!(slot in states)) states[slot] = { current: initial }
      return states[slot]
    },
    useCallback: callback => callback,
    useEffect: effect => effects.push(effect),
    commit: () => effects.splice(0).map(effect => effect()),
  }
}

test('existing vaccination editor drafts persist appointments, notes and completed visits through the repository', async () => {
  const source = await readFile(new URL('../src/components/child-health/VaccinationSchedule.jsx', import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, 'VaccinationSchedule.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace('export default ', '')
  const icons = { vaccinationStages, vaccinationDoseState, Baby: 'baby', Footprints: 'footprints', Hand: 'hand', Blocks: 'blocks', ToyBrick: 'toy', Cake: 'cake', PersonStanding: 'person', X: 'close-icon', Button: 'button', _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment, useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useRef: () => ({ current: null }), useEffect() {}, useId: () => 'test-id' }
  const { schedule, stageState, StageDetails } = new Function(...Object.keys(icons), code + '\nreturn { schedule, stageState, StageDetails }')(...Object.values(icons))
  const db = storage(), repo = createVaccinationRepository({ storage: db })
  const group = schedule.find(group => group.id === 'month2')
  const child = { id: 'demo-child-3', dateOfBirth: '2023-10-18' }
  const actor = { id: 'doctor-test', name: 'Doctor', role: 'doctor', clinicalEditing: true }
  const draft = { childId: child.id, stageId: group.id, status: 'pending', notes: 'Bring booklet', appointmentDate: '2099-01-02', appointmentTime: '10:30' }
  const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]
  for (const doctor of [true, false]) {
    const tree = StageDetails({ group, child, records: [], doctor, correctionActor: actor, onSave() {}, onClose() {}, labels: { v: key => key, number: String, stageLabel: value => value.id, serviceLabel: value => value.id, formatDate: value => value, formatAppointment: (date, time) => date + time } })
    const editor = nodes(tree).filter(node => node.type?.name === 'VisitEditor')
    assert.equal(editor.length, 1)
    assert.equal(Boolean(editor[0].props.actor), doctor)
  }
  let records = []
  repo.manageVisit(child.id, draft, { expectedRecords: records, actor })
  records = repo.read(child.id)
  repo.manageVisit(child.id, { ...draft, notes: 'Updated doctor note' }, { expectedRecords: records, actor })
  records = repo.read(child.id)
  assert.equal(records[0].notes, 'Updated doctor note')
  repo.manageVisit(child.id, { ...draft, status: 'completed', administeredAt: '2026-01-02', administeredTime: '09:30', facilityName: 'Hospital' }, { expectedRecords: records, actor })
  const state = stageState(group, child, repo.read(child.id))
  assert.equal(state.conflict, false)
  assert.equal(state.completed, true)
  assert.equal(state.visit.appointmentHistory[0].status, 'fulfilled')
})

test('milestone manual saving keeps drafts separate, persists partial answers, retries failures and subscribes to saved answers', async () => {
  const db = storage(), events = new EventTarget()
  const repository = createMilestonesRepository({ storage: db, events })
  const source = await readFile(new URL('../src/components/child-health/useChildHealthStorage.js', import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, 'useChildHealthStorage.js')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace(/export /g, '')
  const host = hooks()
  const bindings = { ...host, milestonesRepository: repository, vaccinationRepository: null }
  const runStorage = new Function(...Object.keys(bindings), code + '\nreturn useMilestonesStorage')(...Object.values(bindings))
  const render = () => { host.reset(); return runStorage('demo-child-3', demoMotherId) }
  render()
  const cleanup = host.commit()
  render().update('m2-social', { answer: 'yes' })
  assert.equal(render().status, '')
  assert.equal(repository.read('adam', demoMotherId)['m2-social'], undefined)
  assert.equal(render().drafts['m2-social'].answer, 'yes')
  assert.equal(await render().save(['m2-social']), true)
  assert.equal(render().status, 'saved')
  const write = db.setItem
  db.setItem = () => { throw Error('quota') }
  render().update('m2-social', { note: 'Draft must survive failure' })
  assert.equal(await render().save(['m2-social']), false)
  assert.equal(render().status, 'failed')
  assert.equal(render().drafts['m2-social'].note, 'Draft must survive failure')
  assert.equal(render().records['m2-social'].note, '')
  assert.equal(repository.read('adam', demoMotherId)['m2-social'].note, '')
  db.setItem = write
  assert.equal(await render().save(['m2-social']), true)
  assert.equal(render().status, 'saved')
  assert.equal(repository.read('adam', demoMotherId)['m2-social'].note, 'Draft must survive failure')
  const otherTab = createMilestonesRepository({ storage: db, events: new EventTarget() })
  otherTab.saveResponse('adam', demoMotherId, 'm4-motor', { answer: 'unsure' })
  events.dispatchEvent(new Event('storage'))
  assert.equal(render().records['m4-motor'].answer, 'unsure')
  cleanup.forEach(unsubscribe => unsubscribe?.())
})

test('actual child-health modules compile and render in both languages and roles without portal integration', async () => {
  const previousWindow = globalThis.window
  const db = storage()
  const browser = new EventTarget()
  browser.localStorage = db
  globalThis.window = browser
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  try {
    const { LanguageProvider } = await server.ssrLoadModule('/src/contexts/LanguageContext.jsx')
    const { default: Vaccinations } = await server.ssrLoadModule('/src/components/child-health/VaccinationSchedule.jsx')
    const { default: Milestones } = await server.ssrLoadModule('/src/components/child-health/DevelopmentalMilestones.jsx')
    createVaccinationRepository({ storage: db }).saveVisit('adam', { childId: 'demo-child-3', kind: 'vaccination-visit', visitId: 'birth', doseIds: ['bcg'], status: 'pending', notes: 'Persisted doctor note', appointmentHistory: [] }, { expectedRecords: [] })
    for (const language of ['en', 'ar']) {
      db.setItem('nomu.language', language)
      for (const role of ['mother', 'doctor']) {
        const props = { role, child: { id: 'adam', name: 'Adam', dateOfBirth: '2023-10-18' }, currentAge: 36 }
        for (const Component of [Vaccinations, Milestones]) {
          const html = renderToStaticMarkup(createElement(LanguageProvider, null, createElement(Component, props)))
          assert.ok(html.includes(`dir="${language === 'ar' ? 'rtl' : 'ltr'}"`))
          if (Component === Milestones && role === 'mother') {
            assert.ok(!html.includes('Adam'))
            assert.ok(html.includes('dm-section-heading'))
            assert.ok(html.includes('lucide-star'))
            assert.ok(!html.includes('dm-hero'))
          } else if (Component === Vaccinations && role === 'mother') {
            assert.ok(!html.includes('vaccination__child'))
            assert.ok(html.includes('vaccination__title'))
            assert.ok(html.includes('vaccination__summary'))
            assert.ok(html.includes('lucide-syringe'))
          } else if (Component === Vaccinations && role === 'doctor') {
            assert.ok(!html.includes('vaccination__child'))
            assert.ok(html.includes('vaccination__title'))
            assert.ok(html.includes('vaccination__summary'))
            assert.ok(html.includes('vaccination__view'))
            assert.ok(html.includes('<table'))
          } else {
            assert.ok(!html.includes('Adam'))
            assert.ok(!html.includes('dd-child'))
            assert.ok(!html.includes('dd-age-info'))
            assert.ok(html.includes('dd-header'))
            assert.ok(html.includes('dd-ages'))
            assert.ok(html.includes('dd-summary'))
            assert.ok(!html.includes('type="radio"'))
            assert.ok(!html.includes('<textarea'))
          }
        }
      }
    }
  } finally {
    await server.close()
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})
