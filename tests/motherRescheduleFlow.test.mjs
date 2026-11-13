import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'
import { bookingAppointments, canRescheduleDemoBooking, confirmDemoBooking, demoBookingDoctors, demoBookingsKey, demoSlotReserved, readDemoBookings, rescheduleDemoBooking } from '../src/services/motherDemoBookings.js'
import { getDoctorAvailableDates, getDoctorSlots } from '../src/pages/mother/bookingAvailabilityDemo.js'
import { getNextFollowUp, getScheduledFollowUps, initials, portalChildren } from '../src/pages/mother/motherPortalData.js'

const now = new Date('2026-10-29T07:00:00')
const nodes = (node, result = []) => { if (Array.isArray(node)) { node.forEach(item => nodes(item, result)); return result } if (!node || typeof node !== 'object') return result; result.push(node); nodes(node.props?.children, result); return result }
function host() {
  let cursor = 0
  const states = []
  return { reset() { cursor = 0 }, useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next }] } }
}
function storage() { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) } }
async function load(path, bindings, name) { const source = await readFile(new URL(path, import.meta.url), 'utf8'); let { code } = await transformWithOxc(source, path); code = code.replace(/^import .*;?\r?\n/gm, '').replace(/export default /g, '').replace(/export /g, ''); return new Function(...Object.keys(bindings), code + `\nreturn ${name}`)(...Object.values(bindings)) }
const runtime = { _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment, useEffect() {}, useRef: () => ({ current: null }), PortalIcon: () => null, Link: 'a' }
const originalValues = { childId: 'adam', doctorId: 'ahmad', date: '2026-10-29', time: '09:00' }

for (const [language, dictionary] of [['en', en], ['ar', ar]]) {
  const t = key => key.split('.').reduce((value, part) => value?.[part], dictionary) ?? key
  const base = { ...runtime, useLanguage: () => ({ language, t }), bookingAppointments, canRescheduleDemoBooking, demoBookingDoctors, demoSlotReserved, getDoctorAvailableDates, getDoctorSlots, getScheduledFollowUps, getNextFollowUp, initials }

  test(`${language}: appointments expose Reschedule only for explicit upcoming mother bookings and preserve card/navigation content`, async () => {
    const db = storage(), original = confirmDemoBooking(originalValues, db, now)
    const legacy = { ...original, id: 'legacy', createdBy: undefined }
    const doctor = { ...original, id: 'doctor', createdBy: 'doctor' }
    const past = { ...original, id: 'past', dateTime: '2026-10-01T09:00:00' }
    const cancelled = { ...original, id: 'cancelled', status: 'cancelled' }
    const state = host(), Modal = () => null
    const Page = await load('../src/pages/mother/MotherAppointments.jsx', { ...base, ...state, MotherRescheduleModal: Modal, useDemoBookings: () => ({ records: [original, legacy, doctor, past, cancelled], error: '', now }), useSearchParams: () => [new URLSearchParams(), () => {}] }, 'MotherAppointments')
    const render = () => { state.reset(); return Page() }
    let tree = render()
    const triggers = nodes(tree).filter(node => node.props?.className === 'demo-booking-secondary demo-reschedule-trigger')
    assert.equal(triggers.length, 1)
    assert.equal(triggers[0].props.children, t('demoReschedule.title'))
    triggers[0].props.onClick()
    tree = render()
    const modal = nodes(tree).find(node => node.type === Modal)
    assert.equal(modal.props.bookingId, original.id)
    modal.props.onSuccess()
    tree = render()
    assert.ok(!nodes(tree).some(node => node.type === Modal))
    assert.equal(nodes(tree).find(node => node.props?.role === 'status').props.children, t('demoReschedule.success'))
    assert.ok(nodes(tree).filter(node => node.type === 'a').every(node => node.props.to.endsWith('/follow-up-visits')))
  })

  test(`${language}: modal locks provider details, shows only available slots, reviews before saving and preserves ID`, async () => {
    const db = storage(), original = confirmDemoBooking(originalValues, db, now), state = host()
    let succeeded = 0, closed = 0
    const Modal = await load('../src/components/mother/MotherRescheduleModal.jsx', { ...base, ...state, readDemoReservations: () => [], useDemoBookings: () => ({ records: readDemoBookings(db), error: '', now }), rescheduleDemoBooking: (id, values) => rescheduleDemoBooking(id, values, db, now) }, 'MotherRescheduleModal')
    const render = () => { state.reset(); return Modal({ bookingId: original.id, onClose: () => { closed++ }, onSuccess: () => { succeeded++ } }) }
    let tree = render()
    assert.equal(tree.type, 'dialog')
    assert.equal(tree.props.dir, language === 'ar' ? 'rtl' : 'ltr')
    const summary = nodes(tree).filter(node => node.type === 'dd').map(node => node.props.children)
    assert.ok(summary.includes(t('mother.adam')))
    assert.ok(summary.includes(t('mother.doctorAhmad')))
    assert.ok(summary.includes(t(original.clinicKey)))
    assert.ok(!nodes(tree).some(node => node.type === 'select'))
    const dates = nodes(tree).filter(node => node.type === 'button' && node.props['aria-pressed'] !== undefined)
    assert.equal(dates.length, getDoctorAvailableDates('ahmad', now, (date, time) => demoSlotReserved('ahmad', date, time, readDemoBookings(db), [])).length)
    dates[0].props.onClick()
    tree = render()
    const timeField = nodes(tree).filter(node => node.type === 'fieldset')[1]
    const slots = nodes(timeField).filter(node => node.type === 'button')
    assert.equal(slots.length, 2)
    slots[0].props.onClick()
    tree = render()
    const snapshot = db.getItem(demoBookingsKey)
    nodes(tree).find(node => node.type === 'button' && node.props.children === t('demoBooking.review')).props.onClick()
    tree = render()
    assert.equal(db.getItem(demoBookingsKey), snapshot)
    assert.equal(nodes(tree).filter(node => node.type === 'time').length, 2)
    assert.ok(nodes(tree).some(node => node.type === 'dt' && node.props.children === t('demoReschedule.previous')))
    assert.ok(nodes(tree).some(node => node.type === 'dt' && node.props.children === t('demoReschedule.next')))
    nodes(tree).find(node => node.type === 'button' && node.props.children === t('common.back')).props.onClick()
    tree = render()
    nodes(tree).find(node => node.type === 'button' && node.props.children === t('demoBooking.review')).props.onClick()
    tree = render()
    nodes(tree).find(node => node.type === 'button' && node.props.children === t('demoReschedule.confirm')).props.onClick()
    assert.equal(succeeded, 1)
    assert.equal(readDemoBookings(db).length, 1)
    assert.equal(readDemoBookings(db)[0].id, original.id)
    assert.equal(readDemoBookings(db)[0].time, '10:00')
    tree.props.onCancel({ preventDefault() {} })
    assert.equal(closed, 1)
  })

  test(`${language}: cancelling, no available slots, and confirmation conflicts preserve the original booking`, async () => {
    const db = storage(), original = confirmDemoBooking(originalValues, db, now)
    const make = async (reserved = demoSlotReserved) => {
      const state = host()
      const Modal = await load('../src/components/mother/MotherRescheduleModal.jsx', { ...base, ...state, demoSlotReserved: reserved, readDemoReservations: () => [], useDemoBookings: () => ({ records: readDemoBookings(db), error: '', now }), rescheduleDemoBooking: (id, values) => rescheduleDemoBooking(id, values, db, now) }, 'MotherRescheduleModal')
      return callbacks => { state.reset(); return Modal({ bookingId: original.id, onSuccess() { assert.fail('Conflicting booking must not succeed') }, ...callbacks }) }
    }
    let cancelled = 0
    const emptyRender = await make(() => true)
    const empty = emptyRender({ onClose: () => { cancelled++ } })
    assert.ok(nodes(empty).some(node => node.type === 'p' && node.props.children === t('demoReschedule.noSlots')))
    assert.ok(nodes(empty).find(node => node.type === 'button' && node.props.children === t('demoBooking.review')).props.disabled)
    const before = db.getItem(demoBookingsKey)
    nodes(empty).find(node => node.type === 'button' && node.props.children === t('common.cancel')).props.onClick()
    assert.equal(cancelled, 1)
    assert.equal(db.getItem(demoBookingsKey), before)
    const render = await make()
    let tree = render({ onClose() {} })
    nodes(tree).find(node => node.type === 'button' && node.props['aria-pressed'] !== undefined).props.onClick()
    tree = render({ onClose() {} })
    const field = nodes(tree).filter(node => node.type === 'fieldset')[1]
    nodes(field).find(node => node.type === 'button').props.onClick()
    tree = render({ onClose() {} })
    nodes(tree).find(node => node.type === 'button' && node.props.children === t('demoBooking.review')).props.onClick()
    confirmDemoBooking({ ...originalValues, childId: 'lina', time: '10:00' }, db, now)
    const occupied = db.getItem(demoBookingsKey)
    tree = render({ onClose() {} })
    nodes(tree).find(node => node.type === 'button' && node.props.children === t('demoReschedule.confirm')).props.onClick()
    tree = render({ onClose() {} })
    assert.ok(nodes(tree).some(node => node.props?.role === 'alert' && node.props.children === t('demoBooking.duplicate')))
    assert.equal(db.getItem(demoBookingsKey), occupied)
  })

  test(`${language}: existing Home and child Follow-up views read the updated booking and choose the new nearest appointment`, async () => {
    const db = storage(), original = confirmDemoBooking(originalValues, db, now)
    const second = confirmDemoBooking({ ...originalValues, time: '10:00' }, db, now)
    const useDemoBookings = () => ({ records: readDemoBookings(db), error: '', now })
    const Card = await load('../src/components/mother/PortalChildCard.jsx', { ...base, useState: initial => [initial, () => {}], useDemoBookings }, 'PortalChildCard')
    const cardTime = () => nodes(Card({ child: portalChildren[0] })).find(node => node.type === 'time').props.dateTime
    assert.equal(cardTime(), original.dateTime)
    const changed = rescheduleDemoBooking(original.id, { date: original.date, time: '11:00' }, db, now)
    assert.equal(cardTime(), second.dateTime)
    const FollowUps = await load('../src/components/mother/ChildDemoBookings.jsx', { ...base, useDemoBookings }, 'ChildDemoBookings')
    const times = nodes(FollowUps({ childId: 'adam' })).filter(node => node.type === 'time').map(node => node.props.dateTime)
    assert.ok(times.includes(changed.dateTime))
    assert.ok(!times.includes(original.dateTime))
    assert.equal(nodes(FollowUps({ childId: 'lina' })).filter(node => node.type === 'article').length, 0)
  })
}

test('native modal opens once and closes on cleanup, preserving native focus containment', async () => {
  const effects = [], state = host(), refs = []
  const db = storage(), original = confirmDemoBooking(originalValues, db, now)
  const Modal = await load('../src/components/mother/MotherRescheduleModal.jsx', { ...runtime, ...state, useLanguage: () => ({ language: 'en', t: key => key }), useEffect: effect => effects.push(effect), useRef: () => { const ref = { current: null }; refs.push(ref); return ref }, useDemoBookings: () => ({ records: readDemoBookings(db), now, error: '' }), canRescheduleDemoBooking, demoBookingDoctors, demoSlotReserved, getDoctorAvailableDates, getDoctorSlots, readDemoReservations: () => [] }, 'MotherRescheduleModal')
  Modal({ bookingId: original.id, onClose() {}, onSuccess() {} })
  let opened = 0, closed = 0
  refs[0].current = { open: false, showModal() { this.open = true; opened++ }, close() { this.open = false; closed++ } }
  const cleanup = effects[0]()
  assert.equal(opened, 1)
  cleanup()
  assert.equal(closed, 1)
})
