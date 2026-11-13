import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'
import { bookingAppointments, canRescheduleDemoBooking } from '../src/services/motherDemoBookings.js'
import { childSections, getDemoChild } from '../src/pages/mother/childDemoData.js'
import { getNextFollowUp, getScheduledFollowUps, initials, motherProfile, portalChildren } from '../src/pages/mother/motherPortalData.js'

const runtime = { _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment }
async function load(path, bindings, name) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, path)
  code = code.replace(/^import .*;?\r?\n/gm, '').replace(/export default /g, '').replace(/export /g, '')
  return new Function(...Object.keys(bindings), code + `\nreturn ${name}`)(...Object.values(bindings))
}
function nodes(node, result = []) {
  if (!node || typeof node !== 'object') return result
  result.push(node)
  ;[node.props?.children].flat().forEach(child => nodes(child, result))
  return result
}
const Link = ({ to, children }) => jsx.jsx('a', { href: to, children })
const Icon = () => null
const translate = dictionary => key => key.split('.').reduce((value, part) => value?.[part], dictionary) ?? key

test('follow-ups use existing confirmed/completed records, exclude requests, and respect time boundaries', () => {
  const now = new Date('2026-10-29T12:00:00')
  const records = getScheduledFollowUps(now)
  assert.equal(records.length, 4)
  assert.ok(records.every(item => item.motherId === motherProfile.id && item.status !== 'pending'))
  assert.equal(getNextFollowUp('adam', now).dateTime, '2026-11-05T10:00:00')
  assert.equal(getNextFollowUp('lina', now).dateTime, '2026-11-10T11:30:00')
  assert.equal(getNextFollowUp('adam', new Date('2026-12-01')), undefined)
  assert.equal(getNextFollowUp('unlinked', now), undefined)
  assert.equal(getScheduledFollowUps(new Date('2026-12-01')).filter(item => item.period === 'upcoming').length, 0)
  assert.equal(initials('Adam Ahmad'), 'AA')
})

for (const [language, dictionary] of [['en', en], ['ar', ar]]) {
  const t = translate(dictionary)
  const bindings = { ...runtime, useState: value => [value, () => {}], useDemoBookings: () => ({ records: [], error: '', now: new Date('2026-10-29T12:00:00') }), bookingAppointments, canRescheduleDemoBooking, MotherRescheduleModal: () => null, ChildDemoBookings: () => null, MotherChildHealth: () => null, useLanguage: () => ({ language, t }), PortalIcon: Icon, Link, NavLink: Link, initials, portalChildren, motherProfile, getScheduledFollowUps, childSections, getDemoChild }

  test(`${language}: child cards use actual measurements, follow-ups at the top, and existing detail destinations`, async () => {
    const Card = await load('../src/components/mother/PortalChildCard.jsx', { ...bindings, getNextFollowUp: id => getNextFollowUp(id, new Date('2026-10-29T12:00:00')) }, 'PortalChildCard')
    for (const child of portalChildren) {
      const tree = Card({ child })
      assert.equal(tree.props.children[0].props.className, 'portal-followup')
      assert.equal(nodes(tree).find(node => node.type === Link && node.props.to === '/mother/children/' + child.id).props.to, '/mother/children/' + child.id)
      assert.equal(nodes(tree).filter(node => node.type === 'dd').length, 4)
      assert.ok(!renderToStaticMarkup(tree).includes('<img'))
      assert.ok(renderToStaticMarkup(tree).includes(t('mother.' + child.id)))
    }
    const EmptyCard = await load('../src/components/mother/PortalChildCard.jsx', { ...bindings, getNextFollowUp: () => undefined }, 'PortalChildCard')
    assert.ok(renderToStaticMarkup(EmptyCard({ child: portalChildren[0] })).includes(t('portal.noFollowUp')))
  })

  test(`${language}: home replaces quick actions with tips while sidebar retains separate router destinations`, async () => {
    const Tips = () => null
    const Dashboard = await load('../src/pages/mother/MotherDashboard.jsx', { ...bindings, ParentingTips: Tips, PortalChildCard: () => null }, 'MotherDashboard')
    const destinations = nodes(Dashboard()).filter(node => node.type === Link).map(node => node.props.to)
    assert.ok(destinations.includes('/mother/children'))
    assert.equal(nodes(Dashboard()).filter(node => node.props?.className === 'portal-quick-actions').length, 0)
    assert.equal(nodes(Dashboard()).filter(node => node.type === Tips).length, 1)
    assert.equal(nodes(Dashboard()).filter(node => node.type === 'img').length, 0)
    const Layout = await load('../src/layouts/MotherLayout.jsx', { ...bindings, useMotherLogout: () => () => {}, beginParentingTipVisit() {}, useNavigationType: () => 'POP', endParentingTipSession() {}, MotherProfileDropdown: () => null, useLocation: () => ({ pathname: '/mother/profile' }), MotherNotifications: () => null, Outlet: () => null, nomuLogo: '/logo.png' }, 'MotherLayout')
    const tree = Layout()
    assert.equal(tree.props.dir, language === 'ar' ? 'rtl' : 'ltr')
    const links = nodes(tree).filter(node => node.type === Link && typeof node.props.className === 'function')
    assert.equal(links.length, 5)
    assert.deepEqual(links.map(node => node.props.to), ['/mother', '/mother/children', '/mother/appointments', '/mother/profile', '/mother/settings'])
    for (const link of links) assert.ok(link.props.className({ isActive: true }).includes('is-active'))
    assert.ok(nodes(tree).some(node => node.type === Link && node.props.to === '/mother/login'))
  })

  test(`${language}: profile omits invented sensitive fields and settings update the global language`, async () => {
    const Profile = await load('../src/pages/mother/MotherProfile.jsx', bindings, 'MotherProfile')
    const values = nodes(Profile()).filter(node => node.type === 'dd').map(node => node.props.children)
    assert.deepEqual(values, [t('mother.sara'), ...Array(3).fill(t('portal.notProvided'))])
    const selected = []
    const Settings = await load('../src/pages/mother/MotherSettings.jsx', { ...bindings, useLanguage: () => ({ language, t, setLanguage: next => selected.push(next) }) }, 'MotherSettings')
    const buttons = nodes(Settings()).filter(node => node.type === 'button')
    assert.equal(buttons.length, 2)
    assert.equal(buttons.filter(node => node.props['aria-pressed']).length, 1)
    buttons.forEach(node => node.props.onClick())
    assert.deepEqual(selected, ['en', 'ar'])
  })

  test(`${language}: appointments are read-only; tabs preserve query state and support keyboard navigation`, async () => {
    let search = new URLSearchParams('source=notification')
    const Appointments = await load('../src/pages/mother/MotherAppointments.jsx', { ...bindings, getScheduledFollowUps: () => getScheduledFollowUps(new Date('2026-10-29T12:00:00')), useSearchParams: () => [search, next => { search = next }] }, 'MotherAppointments')
    const tree = Appointments()
    const tabs = nodes(tree).filter(node => node.props?.role === 'tab')
    assert.equal(tabs.length, 2)
    assert.equal(nodes(tree).filter(node => node.type === 'button').length, 2)
    assert.equal(nodes(tree).filter(node => node.type === 'article').length, 2)
    assert.ok(nodes(tree).filter(node => node.type === Link).every(node => node.props.to.endsWith('/follow-up-visits')))
    tabs[1].props.onClick()
    assert.equal(search.get('tab'), 'past')
    assert.equal(search.get('source'), 'notification')
    let focused = false
    tabs[0].props.onKeyDown({ key: 'End', preventDefault() {}, currentTarget: { parentElement: { querySelectorAll: () => [{ focus() {} }, { focus() { focused = true } }] } } })
    assert.ok(focused)
    const pastTree = Appointments()
    assert.equal(nodes(pastTree).find(node => node.props?.role === 'tabpanel').props.id, 'appointments-panel-past')
    assert.equal(nodes(pastTree).filter(node => node.type === 'article').length, 2)
    const Empty = await load('../src/pages/mother/MotherAppointments.jsx', { ...bindings, getScheduledFollowUps: () => [], useSearchParams: () => [new URLSearchParams(), () => {}] }, 'MotherAppointments')
    assert.ok(renderToStaticMarkup(Empty()).includes(t('portal.noAppointments')))
  })

  test(`${language}: both children retain six overview values without a duplicate navigation column`, async () => {
    for (const childId of ['adam', 'lina']) for (const [section] of childSections) {
      const Overview = await load('../src/pages/mother/ChildOverview.jsx', { ...bindings, useParams: () => ({ childId, section }) }, 'ChildOverview')
      const tree = Overview()
      const navLinks = nodes(tree).filter(node => node.type === Link && node.props.end)
      assert.equal(navLinks.length, 0)
      assert.ok(navLinks.every(node => node.props.to.startsWith('/mother/children/' + childId)))
      if (section === 'overview') assert.equal(nodes(tree).filter(node => node.type === 'dd').length, 6)
    }
  })
}
