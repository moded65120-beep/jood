import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createServer, transformWithOxc } from 'vite'
import { createElement } from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { canonicalChildId, demoMotherId } from '../src/services/demoChildAccess.js'
import { createMedicalRecordRepository } from '../src/services/medicalRecordRepository.js'
import { selectMotherChildren, selectMotherMedicalRecord } from '../src/services/medicalRecordSelectors.js'
import { growthSex, whoMeasurements } from '../src/services/growthMeasurementAdapter.js'
import { ageFromBirthDate } from '../src/components/doctor/medicalRecordData.js'
import { createVaccinationRepository } from '../src/services/vaccinationRepository.js'
import { createMilestonesRepository } from '../src/services/milestonesRepository.js'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'

function storage() {
  const data = new Map()
  return { get length() { return data.size }, key: index => [...data.keys()][index] ?? null, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
}
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]

test('Mother adapter passes canonical child, actual completed-month age, role, mother identity and Back destination', async () => {
  const source = await readFile(new URL('../src/components/mother/MotherChildHealth.jsx', import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, 'MotherChildHealth.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace('export default ', '')
  const db = storage(), repository = createMedicalRecordRepository(db)
  for (const [language, dictionary] of [['en', en], ['ar', ar]]) {
    const t = key => key.split('.').reduce((value, part) => value?.[part], dictionary)
    const destinations = []
    const bindings = { useMotherMilestoneNavigation: () => ({ backToChild: path => destinations.push(path) }), _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment, useNavigate: () => path => destinations.push(path), useLanguage: () => ({ language, t }), useMotherMedicalRecords: motherId => { assert.equal(motherId, demoMotherId); return { children: selectMotherChildren(repository.getSnapshot(), motherId), getMedicalRecord: id => selectMotherMedicalRecord(repository.getSnapshot(), motherId, id) } }, canonicalChildId, demoMotherId, ageFromBirthDate, VaccinationSchedule: 'vaccinations', DevelopmentalMilestones: 'milestones', MotherGrowthChart: 'growth-chart', growthSex, whoMeasurements }
    const Adapter = new Function(...Object.keys(bindings), code + '\nreturn MotherChildHealth')(...Object.values(bindings))
    for (const childId of ['adam', 'lina']) for (const section of ['vaccinations', 'milestones', 'growth-chart']) {
      const tree = Adapter({ childId, section })
      const component = nodes(tree).find(node => node.type === section)
      assert.ok(component)
      if (section !== 'growth-chart') assert.equal(component.props.role, 'mother')
      assert.equal(component.props.child.id, canonicalChildId(childId))
      if (childId === 'adam') {
        assert.equal(component.props.child.dateOfBirth, '2023-10-18')
        const age = ageFromBirthDate('2023-10-18')
        if (section !== 'growth-chart') assert.equal(component.props.currentAge, age.years * 12 + age.months)
      } else {
        assert.equal(component.props.child.dateOfBirth, null)
        assert.equal(component.props.currentAge, undefined)
        assert.ok(nodes(tree).some(node => node.type === 'p' && node.props.children.includes(t('portal.notProvided'))))
      }
      if (section === 'milestones') {
        assert.equal(component.props.motherId, demoMotherId)
        component.props.onBack()
        assert.equal(destinations.at(-1), '/mother/children/' + childId)
      }
    }
    assert.ok(!nodes(Adapter({ childId: 'unlinked', section: 'vaccinations' })).some(node => node.type === 'vaccinations'))
  }
})

test('existing Mother child routes render both real components for Adam/Lina in English/Arabic; vaccinations show stored appointments without edit controls', async () => {
  const previousWindow = globalThis.window, db = storage(), browser = new EventTarget()
  browser.localStorage = db
  globalThis.window = browser
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  try {
    const { default: ChildOverview } = await server.ssrLoadModule('/src/pages/mother/ChildOverview.jsx')
    const { LanguageProvider } = await server.ssrLoadModule('/src/contexts/LanguageContext.jsx')
    const { MedicalRecordProvider } = await server.ssrLoadModule('/src/contexts/MedicalRecordContext.jsx')
    createVaccinationRepository({ storage: db }).saveVisit('adam', { childId: 'demo-child-3', kind: 'vaccination-visit', visitId: 'month2', doseIds: ['combo1', 'rota1'], status: 'pending', notes: 'Doctor note', appointmentDate: '2099-01-02', appointmentTime: '10:30', appointmentHistory: [] }, { expectedRecords: [] })
    const milestoneStore = createMilestonesRepository({ storage: db })
    milestoneStore.saveResponse('adam', demoMotherId, '2m-social-smile', { answer: 'yes', note: 'Persistent observation' })
    for (const language of ['en', 'ar']) {
      db.setItem('nomu.language', language)
      for (const childId of ['adam', 'lina']) for (const section of ['vaccinations', 'milestones', 'growth-chart']) {
        const html = renderToStaticMarkup(createElement(LanguageProvider, null, createElement(MedicalRecordProvider, null, createElement(MemoryRouter, { initialEntries: [`/mother/children/${childId}/${section}`] }, createElement(Routes, null, createElement(Route, { path: '/mother/children/:childId/:section', element: createElement(ChildOverview) }))))))
        assert.ok(html.includes('child-content--health'))
        assert.ok(html.includes(`dir="${language === 'ar' ? 'rtl' : 'ltr'}"`))
        assert.ok(!html.includes('child-placeholder'))
        if (section === 'vaccinations') {
          assert.ok(html.includes('class="child-profile"'))
          assert.ok(html.includes('child-profile-avatar'))
          assert.ok(!html.includes('vaccination__child'))
          assert.ok(html.includes('vaccination__summary'))
          assert.ok(!html.includes('type="submit"'))
          assert.ok(!html.includes('type="date"'))
          if (childId === 'adam') assert.ok(html.includes(language === 'en' ? '2099' : new Intl.NumberFormat('ar', { useGrouping: false }).format(2099)))
        } else if (section === 'milestones') {
          assert.ok(html.includes('dm-timeline'))
          assert.ok(html.includes('dm-stage-preview'))
          assert.ok(html.includes('/milestones/ages/'))
          const skills = renderToStaticMarkup(createElement(LanguageProvider, null, createElement(MedicalRecordProvider, null, createElement(MemoryRouter, { initialEntries: [`/mother/children/${childId}/milestones?stage=18&view=skills`] }, createElement(Routes, null, createElement(Route, { path: '/mother/children/:childId/:section', element: createElement(ChildOverview) }))))))
          assert.ok(skills.includes('dm-details'))
          assert.ok(skills.includes('18m-social-check'))
          assert.ok(!skills.includes('dm-timeline-track'))
        } else {
          assert.ok(html.includes('mother-growth__chart-layout'))
          assert.ok(!html.includes('<textarea'))
          assert.ok(!html.includes('type="submit"'))
        }
      }
    }
    assert.equal(createMilestonesRepository({ storage: db }).read('adam', demoMotherId)['2m-social-smile'].note, 'Persistent observation')
    assert.deepEqual(milestoneStore.read('lina', demoMotherId), {})
  } finally {
    await server.close()
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})
