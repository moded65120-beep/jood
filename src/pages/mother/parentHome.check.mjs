import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { selectMotherChildren } from '../../services/medicalRecordSelectors.js'
import { canonicalDemoChildren } from '../../services/demoChildAccess.js'
import { ageFromBirthDate } from '../../components/doctor/medicalRecordData.js'
import en from '../../locales/en/translations.js'
import ar from '../../locales/ar/translations.js'

const server = await createServer({ plugins: [{ name: 'parent-home-test-identity', enforce: 'pre', transform(code, id) {
  if (id.replaceAll('\\', '/').endsWith('/hooks/useUnifiedDemoUser.js')) return 'export default function useUnifiedDemoUser() { return globalThis.__nomuTestParent || null }'
} }], server: { middlewareMode: true, hmr: false }, appType: 'custom' })
const previousWindow = globalThis.window
const previousParent = globalThis.__nomuTestParent
try {
  const { LanguageProvider } = await server.ssrLoadModule('/src/contexts/LanguageContext.jsx')
  const { MedicalRecordProvider } = await server.ssrLoadModule('/src/contexts/MedicalRecordContext.jsx')
  const { default: Dashboard } = await server.ssrLoadModule('/src/pages/mother/MotherDashboard.jsx')
  const { default: ParentHome } = await server.ssrLoadModule('/src/pages/mother/ParentHome.jsx')
  const { default: Layout } = await server.ssrLoadModule('/src/layouts/MotherLayout.jsx')
  const snapshot = { patients: canonicalDemoChildren }
  const repository = { subscribe: () => () => {}, getSnapshot: () => snapshot, getWarning: () => '' }
  for (const [language, dictionary] of Object.entries({ en, ar })) {
    const storage = { getItem: key => key === 'nomu.language' ? language : null, setItem() {}, removeItem() {} }
    globalThis.window = { localStorage: storage, sessionStorage: storage }
    const renderHome = component => renderToStaticMarkup(h(LanguageProvider, null, h(MedicalRecordProvider, { repository }, h(MemoryRouter, null, h(component)))))
    const html = renderHome(ParentHome)
    assert.ok(html.includes(dictionary.unifiedLogin.parentDashboard))
    assert.ok(html.includes('Adam Ahmad')); assert.ok(html.includes('Lina'))
    assert.ok(!html.includes('Haneen Khalil'))
    assert.ok(html.includes('href="/mother/children/adam"'))
    assert.ok(html.includes('href="/mother/children/lina"'))
    assert.ok(html.includes(dictionary.parentHome.notAvailable))
    assert.ok(html.includes(dictionary.parentHome.childCount.replace('{count}', new Intl.NumberFormat(language).format(2))))
    assert.ok(!/<img|<image|<canvas/.test(html), 'No illustrations or avatars in the home content')
    assert.ok(!html.includes('parentHome.'))
    for (const role of ['mother', 'father']) {
      for (const linked of [false, true]) {
        globalThis.__nomuTestParent = { id: (role === 'mother' ? '300' : '400') + (linked ? '0000001' : '0000042'), name: 'Test Parent', role, homePresentation: 'parent', accountSource: 'registration', familyScope: linked ? 'demo-mother-sara' : null }
        const renderRoute = path => renderToStaticMarkup(h(LanguageProvider, null, h(MedicalRecordProvider, { repository }, h(MemoryRouter, { initialEntries: [path] }, h(Routes, null, h(Route, { path: '/mother', element: h(Layout) }, h(Route, { index: true, element: h(Dashboard) }), h(Route, { path: 'children/:id', element: h('p', null, 'PRIVATE_CHILD_CONTENT') })))))))
        const home = renderRoute('/mother')
        assert.ok(home.includes(role === 'father' ? 'portal-welcome' : 'parent-home__welcome'), 'The real layout must allow the home dashboard')
        assert.ok(home.includes('Test Parent'))
        if (role === 'father') {
          assert.ok(!home.includes('parent-home__table'))
          assert.ok(home.includes(dictionary.unifiedLogin.roles.father))
          if (linked) {
            assert.equal((home.match(/class="portal-child-card /g) || []).length, 2)
            assert.ok(home.includes(dictionary.mother.lina))
            assert.ok(home.includes(dictionary.mother.doctorAhmad))
            assert.ok(home.includes(dictionary.mother.doctorRania))
          }
        } else {
        assert.ok(home.includes(dictionary.parentHome.childCount.replace('{count}', new Intl.NumberFormat(language).format(linked ? 2 : 0))))
        assert.ok(home.includes(dictionary.parentHome.information))
        for (const key of ['name', 'birthDate', 'birthPlace', 'age', 'gender']) assert.ok(home.includes(dictionary.parentHome[key]))
        }
        assert.ok(home.includes(`dir="${language === 'ar' ? 'rtl' : 'ltr'}"`))
        if (linked) assert.ok(home.includes('href="/mother/children/adam"'))
        else {
          if (role === 'mother') assert.ok(home.includes('colSpan="5"'))
          assert.ok(home.includes(dictionary.mother.booking.noChildren))
          assert.ok(!home.includes('Adam Ahmad')); assert.ok(!home.includes('Lina'))
        }
        assert.equal(renderRoute('/mother/children/adam').includes('PRIVATE_CHILD_CONTENT'), linked, 'Unlinked accounts cannot open child content')
        assert.ok(!renderRoute('/mother/children/demo-child-1').includes('PRIVATE_CHILD_CONTENT'), 'Even linked accounts cannot view unrelated children')
      }
    }
    globalThis.__nomuTestParent = null
    globalThis.__nomuTestParent = { id: '3000000002', name: 'Jood Alajouri', role: 'mother', homePresentation: 'parent', accountSource: 'registration' }
    const jood = renderHome(Dashboard)
    assert.ok(jood.includes(dictionary.parentHome.childCount.replace('{count}', new Intl.NumberFormat(language).format(2))))
    assert.ok(jood.includes(language === 'ar' ? 'عمر العجوري' : 'Omar Alajouri'))
    assert.ok(jood.includes(language === 'ar' ? 'ليان العجوري' : 'Layan Alajouri'))
    assert.ok(jood.includes(language === 'ar' ? 'عمّان، الأردن' : 'Amman, Jordan'))
    assert.ok(jood.includes(language === 'ar' ? 'إربد، الأردن' : 'Irbid, Jordan'))
    assert.ok(!jood.includes('/mother/children/demo-basic-jood'))
    assert.ok(!jood.includes('Adam Ahmad'))
    assert.ok(!jood.includes('Lina'))
    globalThis.__nomuTestParent = null
    for (const user of [null, { id: '3000000001', role: 'mother', homePresentation: 'legacy-mother', accountSource: 'provisioned-demo' }]) {
      globalThis.__nomuTestParent = user
      const legacy = renderHome(Dashboard)
      assert.ok(legacy.includes('portal-welcome'))
      assert.ok(legacy.includes('portal-child-card'))
      assert.ok(legacy.includes(dictionary.mother.upcomingAppointments))
      assert.ok(legacy.includes('href="/mother/appointments"'))
      assert.ok(legacy.includes(dictionary.parentingTips.title))
      assert.ok(!legacy.includes('parent-home__information'))
    }
    globalThis.__nomuTestParent = null
  }
  assert.equal(selectMotherChildren(snapshot, 'unlinked-parent').length, 0)
  assert.equal(selectMotherChildren(snapshot, null).length, 0)
  assert.deepEqual(ageFromBirthDate('2023-10-18', new Date(2026, 10, 4)), { years: 3, months: 0 })
  assert.equal(ageFromBirthDate(null), null)
  const css = readFileSync(new URL('./ParentHome.css', import.meta.url), 'utf8')
  const entry = readFileSync(new URL('./MotherDashboard.jsx', import.meta.url), 'utf8')
  assert.ok(entry.includes("import './ParentHome.css'"), 'Routed dashboard explicitly loads Parent styling')
  assert.ok(css.includes('.parent-home .parent-home__welcome'))
  assert.ok(css.includes('background: linear-gradient(115deg, #fce6f3, #fbdced)'))
  assert.ok(css.includes('.parent-home .parent-home__information'))
  assert.ok(css.includes('.parent-home .parent-home__count'))
  assert.ok(css.includes('.parent-home .parent-home__table td[colspan] .portal-empty'))
  assert.ok(css.includes('@media (max-width: 700px)'))
  assert.ok(css.includes('.parent-home__table td::before'))
  assert.deepEqual(Object.keys(en.parentHome), Object.keys(ar.parentHome))
  console.log('Parent home: bilingual rendering, authorized child count/table/routes, missing fields, age calculation, no images, unlinked-parent isolation and responsive CSS passed')
} finally { globalThis.window = previousWindow; globalThis.__nomuTestParent = previousParent; await server.close() }
