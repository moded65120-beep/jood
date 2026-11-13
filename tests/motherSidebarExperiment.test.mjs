import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import * as icons from 'lucide-react'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'
import { childSections, getDemoChild } from '../src/pages/mother/childDemoData.js'

function nodes(node) {
  if (!node || typeof node !== 'object') return []
  return [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]
}

test('merged child sidebar follows all child routes and languages, and disappears outside authorized child pages', async () => {
  const source = await readFile(new URL('../src/layouts/MotherLayout.jsx', import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, 'MotherLayout.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace(/export default /g, '').replace(/export /g, '')
  const NavLink = () => null
  for (const [language, dictionary] of Object.entries({ en, ar })) {
    let pathname = '/mother'
    const t = key => key.split('.').reduce((value, part) => value?.[part], dictionary) ?? key
    const bindings = {
      ...Object.fromEntries(['UserRound', 'ClipboardList', 'Pill', 'CalendarDays', 'Syringe', 'ChartNoAxesColumn', 'Star', 'Bot'].map(name => [name, icons[name]])), _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment,
      useMotherLogout: () => () => {}, useUnifiedDemoUser: () => ({}),
      useMotherScrollRestoration: () => ({ current: null }),
      parentFamilyScope: () => 'demo-mother', demoMotherId: 'demo-mother',
      parentCanViewChild: (_, id) => ['adam', 'lina'].includes(id),
      useLocation: () => ({ pathname }), useNavigationType: () => 'POP',
      useState: () => [], beginParentingTipVisit() {},
      useLanguage: () => ({ language, t, setLanguage() {} }),
      Link: () => null, NavLink, Outlet: () => null, PortalIcon: () => null,
      MotherNotifications: () => null, MotherProfileDropdown: () => null,
      nomuLogo: '/logo.png', childSections, getDemoChild,
    }
    const Layout = new Function(...Object.keys(bindings), code + '\nreturn MotherLayout')(...Object.values(bindings))
    for (const childId of ['adam', 'lina']) for (const [section] of childSections) {
      const root = '/mother/children/' + childId
      pathname = root + (section === 'overview' ? '' : '/' + section)
      const tree = Layout()
      assert.equal(tree.props.dir, language === 'ar' ? 'rtl' : 'ltr')
      const selected = nodes(tree).find(node => node.props.className === 'mother-selected-child')
      assert.ok(selected)
      assert.equal(nodes(selected).find(node => node.type === 'h2').props.children, t('mother.' + childId))
      const links = nodes(selected).filter(node => node.type === NavLink)
      assert.deepEqual(links.map(node => node.props.to), childSections.map(([id]) => root + (id === 'overview' ? '' : '/' + id)))
      assert.ok(links.every(node => node.props.end && node.props.className({ isActive: true }).includes('is-active')))
      assert.equal(links.filter(node => node.props.to === pathname).length, 1)
    }
    for (pathname of ['/mother', '/mother/children', '/mother/profile', '/mother/appointments', '/mother/children/unlinked', '/mother/children/%ZZ']) {
      assert.ok(!nodes(Layout()).some(node => node.props.className === 'mother-selected-child'))
    }
  }
})

test('merged layout keeps one content column and provides bounded scrolling on desktop and mobile', async () => {
  const overview = await readFile(new URL('../src/pages/mother/ChildOverview.jsx', import.meta.url), 'utf8')
  assert.ok(!overview.includes('<nav className="child-medical-nav"'))
  assert.ok(overview.includes('child-breadcrumb') && overview.includes('child-profile'))
  const css = await readFile(new URL('../src/layouts/MotherPortal.css', import.meta.url), 'utf8')
  assert.ok(css.includes('overflow-y: auto'))
  assert.ok(css.includes('height: 100dvh') && css.includes('max-height: 60dvh'))
})
