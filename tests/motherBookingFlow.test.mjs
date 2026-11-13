import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'
import { getDoctorAvailableDates, getDoctorSlots } from '../src/pages/mother/bookingAvailabilityDemo.js'
import { portalChildren, getNextFollowUp, getScheduledFollowUps, initials } from '../src/pages/mother/motherPortalData.js'
import { bookingAppointments, canRescheduleDemoBooking, confirmDemoBooking, demoBookingDoctors, demoBookingsChanged, demoBookingsKey, demoSlotReserved, readDemoBookings } from '../src/services/motherDemoBookings.js'

async function load(path, bindings, name) {
  bindings.useMotherPageState ||= (_, initial) => bindings.useState(initial)
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, path)
  code = code.replace(/^import .*;?\r?\n/gm, '').replace(/export default /g, '').replace(/export /g, '')
  return new Function(...Object.keys(bindings), code + `\nreturn ${name}`)(...Object.values(bindings))
}
function host() {
  const states = []
  let cursor = 0
  return { reset() { cursor = 0 }, useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next }] } }
}
const nodes = (node, result = []) => {
  if (Array.isArray(node)) { node.forEach(child => nodes(child, result)); return result }
  if (!node || typeof node !== 'object') return result
  result.push(node)
  ;[node.props?.children].flat().forEach(child => nodes(child, result))
  return result
}
const Link = ({ to, children }) => jsx.jsx('a', { href: to, children })
const now = new Date('2026-10-29T07:00:00')
const runtime = { useState: initial => [initial, () => {}], MotherRescheduleModal: () => null, canRescheduleDemoBooking, _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment, Link, PortalIcon: () => null, useEffect() {}, useRef: () => ({ current: null }) }
function storage() { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) } }

for (const [language, dictionary] of [['en', en], ['ar', ar]]) {
  const t = key => key.split('.').reduce((value, part) => value?.[part], dictionary) ?? key
  const bindings = { ...runtime, useLanguage: () => ({ language, t }), portalChildren, getNextFollowUp, initials, bookingAppointments, getDoctorAvailableDates, getDoctorSlots, demoBookingDoctors, demoSlotReserved }

  test(`${language}: card expanders are independent, reversible, and launch booking for the correct child`, async () => {
    const a = host(), b = host()
    const make = state => load('../src/components/mother/PortalChildCard.jsx', { ...bindings, ...state, useDemoBookings: () => ({ records: [], error: '', now }) }, 'PortalChildCard')
    const Adam = await make(a), Lina = await make(b)
    const render = (Card, state, child) => { state.reset(); return Card({ child }) }
    let adam = render(Adam, a, portalChildren[0])
    const toggle = tree => nodes(tree).find(node => node.props?.className === 'portal-booking-toggle')
    assert.equal(toggle(adam).props['aria-expanded'], false)
    toggle(adam).props.onClick()
    adam = render(Adam, a, portalChildren[0])
    assert.equal(toggle(adam).props['aria-expanded'], true)
    assert.equal(toggle(render(Lina, b, portalChildren[1])).props['aria-expanded'], false)
    const bookingLink = nodes(adam).find(node => node.type === Link && node.props.to.includes('/book?'))
    assert.equal(bookingLink.props.to, '/mother/appointments/book?child=adam')
    assert.equal(bookingLink.props.tabIndex, 0)
    toggle(adam).props.onClick()
    adam = render(Adam, a, portalChildren[0])
    assert.equal(toggle(adam).props['aria-expanded'], false)
    assert.equal(nodes(adam).find(node => node.props?.id === 'child-booking-adam').props.inert, true)
  })

  test(`${language}: both children complete doctor, slot, review, back, and local confirmation steps`, async () => {
    for (const [childId, locked] of [['adam', true], ['lina', true], ['adam', false], ['lina', false]]) {
      const state = host(), db = storage()
      const Booking = await load('../src/pages/mother/PortalBooking.jsx', { ...bindings, ...state, useSearchParams: () => [new URLSearchParams(locked ? 'child=' + childId : '')], useDemoBookings: () => ({ records: readDemoBookings(db), error: '', now }), readDemoReservations: () => [], confirmDemoBooking: values => confirmDemoBooking(values, db, now) }, 'PortalBooking')
      const render = () => { state.reset(); return Booking() }
      const buttons = tree => nodes(tree).filter(node => node.type === 'button')
      let tree = render()
      const field = nodes(tree).find(node => node.props?.id === 'demo-booking-child')
      assert.ok(field)
      assert.equal(field.props.disabled, locked)
      assert.equal(field.props.value, locked ? childId : '')
      field.props.onChange({ target: { value: locked ? (childId === 'adam' ? 'lina' : 'adam') : childId } })
      tree = render()
      assert.equal(nodes(tree).find(node => node.props?.id === 'demo-booking-child').props.value, childId)
      const doctors = buttons(tree).filter(node => node.props.children === t('demoBooking.selectDoctor'))
      assert.equal(doctors.length, 3)
      assert.ok(doctors.every(node => !node.props.disabled))
      doctors[childId === 'adam' ? 0 : 1].props.onClick()
      tree = render()
      const dates = buttons(tree).filter(node => node.props['aria-pressed'] !== undefined)
      assert.ok(dates.length > 0)
      dates[0].props.onClick()
      tree = render()
      const fields = nodes(tree).filter(node => node.type === 'fieldset')
      assert.equal(fields.length, 2)
      nodes(fields[1]).find(node => node.type === 'button').props.onClick()
      tree = render()
      buttons(tree).find(node => node.props.children === t('demoBooking.review')).props.onClick()
      tree = render()
      assert.equal(nodes(tree).filter(node => node.type === 'dd').length, 6)
      assert.ok(renderToStaticMarkup(tree).includes(t('mother.' + childId)))
      assert.deepEqual(readDemoBookings(db), [])
      buttons(tree).find(node => node.props.children === t('common.back')).props.onClick()
      tree = render()
      buttons(tree).find(node => node.props.children === t('demoBooking.review')).props.onClick()
      tree = render()
      buttons(tree).find(node => node.props.children === t('demoBooking.confirm')).props.onClick()
      tree = render()
      assert.ok(nodes(tree).some(node => node.props?.role === 'status'))
      assert.equal(readDemoBookings(db)[0].childId, childId)
      assert.ok(renderToStaticMarkup(tree).includes(t('demoBooking.successMessage')))
    }
  })

  test(`${language}: entry changes reset the child lock and booking progress`, async () => {
    const state = host()
    let entry = 'adam'
    const Booking = await load('../src/pages/mother/PortalBooking.jsx', { ...bindings, ...state, useSearchParams: () => [new URLSearchParams(entry ? 'child=' + entry : '')], useDemoBookings: () => ({ records: [], error: '', now }), readDemoReservations: () => [] }, 'PortalBooking')
    const render = () => { state.reset(); Booking(); state.reset(); return Booking() }
    for (const next of ['adam', 'lina', '', 'adam', '', 'lina']) {
      entry = next
      let tree = render()
      const field = nodes(tree).find(node => node.props?.id === 'demo-booking-child')
      assert.ok(field)
      assert.equal(field.props.value, entry)
      assert.equal(field.props.disabled, Boolean(entry))
      if (!entry) field.props.onChange({ target: { value: 'adam' } })
      tree = render()
      nodes(tree).find(node => node.type === 'button' && node.props.children === t('demoBooking.selectDoctor')).props.onClick()
      assert.ok(nodes(render()).some(node => node.type === 'fieldset'))
    }
  })

  test(`${language}: nearest local booking appears on Home and bookings are scoped per child and displayed in appointments`, async () => {
    const db = storage()
    const date = getDoctorAvailableDates('ahmad', now)[0]
    const first = confirmDemoBooking({ childId: 'adam', doctorId: 'ahmad', date, time: '09:00' }, db, now)
    const secondDate = getDoctorAvailableDates('rania', now)[0]
    confirmDemoBooking({ childId: 'lina', doctorId: 'rania', date: secondDate, time: '11:30' }, db, now)
    const useDemoBookings = () => ({ records: readDemoBookings(db), error: '', now })
    const Card = await load('../src/components/mother/PortalChildCard.jsx', { ...bindings, useState: () => [false, () => {}], useDemoBookings }, 'PortalChildCard')
    const time = nodes(Card({ child: portalChildren[0] })).find(node => node.type === 'time')
    assert.equal(time.props.dateTime, first.dateTime)
    const ChildBookings = await load('../src/components/mother/ChildDemoBookings.jsx', { ...bindings, useDemoBookings }, 'ChildDemoBookings')
    for (const childId of ['adam', 'lina']) {
      const entries = nodes(ChildBookings({ childId })).filter(node => node.type === 'article')
      assert.equal(entries.length, 1)
      assert.equal(nodes(entries[0]).find(node => node.type === 'time').props.dateTime, readDemoBookings(db).find(item => item.childId === childId).dateTime)
    }
    const Appointments = await load('../src/pages/mother/MotherAppointments.jsx', { ...bindings, useDemoBookings, getScheduledFollowUps, useSearchParams: () => [new URLSearchParams(), () => {}] }, 'MotherAppointments')
    const entries = nodes(Appointments()).filter(node => node.type === 'article')
    assert.equal(entries.length, 4)
    assert.equal(entries.filter(node => renderToStaticMarkup(node).includes(t('demoBooking.confirmed'))).length, 2)
  })
}

test('shared subscription refreshes same-tab and cross-tab bookings, handles storage errors, and cleans up', async () => {
  const state = host(), listeners = new Map()
  let records = [], blocked = false, cleanup, cleared = false
  const hook = await load('../src/hooks/useDemoBookings.js', {
    ...state, useEffect: effect => { if (!cleanup) cleanup = effect() },
    readDemoBookings: () => { if (blocked) throw Error(); return records }, demoBookingsChanged, demoBookingsKey,
    window: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) },
    setInterval: () => 1, clearInterval: () => { cleared = true },
  }, 'useDemoBookings')
  const render = () => { state.reset(); return hook() }
  assert.deepEqual(render().records, [])
  records = [{ id: 'new' }]
  listeners.get(demoBookingsChanged)()
  assert.deepEqual(render().records, records)
  records = [{ id: 'cross-tab' }]
  listeners.get('storage')({ key: demoBookingsKey })
  assert.deepEqual(render().records, records)
  blocked = true
  listeners.get('focus')()
  assert.equal(render().error, 'storageError')
  cleanup()
  assert.equal(listeners.size, 0)
  assert.ok(cleared)
})
