import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DEFAULT_DOCTOR_ID, initialAvailability, validateAvailability, availableSlots, bookingDate, submitBooking, decideBooking, saveAvailability, availabilityConflicts } from './appointmentsData.js'
import { appointmentsStorageKey, loadBookings, persistBookings } from './appointmentsStorage.js'
import en from '../../locales/en/translations.js'
import ar from '../../locales/ar/translations.js'

const now = new Date('2026-11-01T05:00:00.000Z') // Sunday 08:00 in Amman.
const availability = initialAvailability()
const state = { version: 1, revision: 0, availability, requests: [] }
assert.equal(bookingDate(new Date('2026-11-01T22:00:00Z')), '2026-11-02', 'Amman date, independent of browser zone')
assert.equal(validateAvailability(availability), null)
assert.equal(availableSlots(availability, [], '2026-11-01', now).length, 10)
assert.equal(availableSlots(availability, [], '2026-11-06', now).length, 0, 'Friday initially disabled')
assert.equal(availableSlots(availability, [], '2026-11-01', new Date('2026-11-01T12:00:00Z')).length, 0)
assert.equal(availableSlots(availability, [], 'bad-date', now).length, 0)
for (const duration of [15, 20, 30, 45, 60]) {
  const generated = availableSlots({ ...availability, duration }, [], '2026-11-01', now)
  assert.equal(generated.length, Math.floor(300 / duration))
  assert.ok(generated.every((item, index) => Date.parse(item.end) - Date.parse(item.start) === duration * 60000 && (!index || generated[index - 1].end <= item.start)))
}
assert.equal(availableSlots(availability, [], '2026-11-01', new Date('2026-11-01T06:15:00Z'))[0].start, '2026-11-01T06:30:00.000Z')
const multiple = structuredClone(availability)
multiple.days[0].intervals.push({ start: '', end: '' })
assert.equal(validateAvailability(multiple), 'invalidRange')
assert.equal(saveAvailability(state, multiple, now).error, 'invalidRange', 'Incomplete added intervals cannot save')
multiple.days[0].intervals[1].start = '15:00'
assert.equal(saveAvailability(state, multiple, now).error, 'invalidRange', 'Both interval endpoints are required')
multiple.days[0].intervals.pop()
assert.equal(validateAvailability(multiple), null, 'Removing the incomplete interval restores the valid schedule')
multiple.days[0].intervals = [{ start: '09:00', end: '10:00' }, { start: '11:00', end: '12:00' }]
assert.equal(availableSlots(multiple, [], '2026-11-01', now).length, 4)
multiple.days[0].intervals[1].start = '09:30'
assert.equal(validateAvailability(multiple), 'overlap')
multiple.days[0].intervals = [{ start: '12:00', end: '11:00' }]
assert.equal(validateAvailability(multiple), 'invalidRange')
multiple.days[0].intervals = []
assert.equal(validateAvailability(multiple), 'intervalRequired')
const slot = availableSlots(availability, [], '2026-11-01', now)[0]
assert.equal(slot.start, '2026-11-01T06:00:00.000Z')
const draft = { id: 'request-a', doctorId: DEFAULT_DOCTOR_ID, childId: 'demo-child-1', start: slot.start, end: slot.end, reason: '  Original bilingual reason  ' }
const received = submitBooking(state, draft, now)
assert.equal(received.request.status, 'pending', 'Requests never auto-approve')
assert.equal(received.request.reason, draft.reason)
assert.equal(state.requests.length, 0, 'No input mutation')
assert.equal(availableSlots(availability, received.state.requests, '2026-11-01', now).length, 9)
assert.equal(submitBooking(received.state, { ...draft, id: 'another-id' }, now).error, 'slotUnavailable')
assert.equal(submitBooking(received.state, draft, now).error, 'duplicateRequest')
assert.equal(submitBooking(state, { ...draft, reason: ' ' }, now).error, 'requestRequired')
assert.equal(submitBooking(state, { ...draft, doctorId: 'other-doctor' }, now).error, 'requestRequired')
assert.equal(submitBooking(state, { ...draft, start: '2026-11-01T05:00:00.000Z' }, now).error, 'slotUnavailable')
assert.equal(submitBooking(state, { ...draft, end: '2026-11-01T06:45:00.000Z' }, now).error, 'slotUnavailable')
const exception = { ...availability, exceptions: [{ date: '2026-11-01', reason: 'Unavailable' }] }
assert.equal(availableSlots(exception, [], '2026-11-01', now).length, 0)
assert.equal(saveAvailability(received.state, exception, now).error, 'availabilityConflict')
const closed = structuredClone(availability); closed.days[0].enabled = false
assert.equal(availabilityConflicts(closed, received.state.requests, now).length, 1)
assert.equal(saveAvailability(received.state, closed, now).error, 'availabilityConflict')
const approved = decideBooking(received.state, draft.id, 'approved', '', now)
assert.equal(approved.state.requests[0].decisionAt, now.toISOString())
assert.equal(approved.state.requests[0].status, 'approved')
assert.equal(availableSlots(availability, approved.state.requests, '2026-11-01', now).length, 9)
assert.equal(decideBooking(approved.state, draft.id, 'rejected', 'Reason', now).error, 'alreadyDecided')
const conflicting = { ...received.state, requests: [...received.state.requests, { ...received.request, id: 'conflicting', status: 'approved', decisionAt: now.toISOString() }] }
assert.equal(decideBooking(conflicting, draft.id, 'approved', '', now).error, 'bookingConflict')
assert.equal(decideBooking(received.state, draft.id, 'rejected', ' ', now).error, 'rejectionRequired')
const rejected = decideBooking(received.state, draft.id, 'rejected', '  Original rejection  ', now)
assert.equal(rejected.state.requests[0].rejectionReason, '  Original rejection  ')
assert.equal(rejected.state.requests.length, 1)
assert.equal(availableSlots(availability, rejected.state.requests, '2026-11-01', now).length, 10)
assert.equal(saveAvailability(rejected.state, exception, now).error, undefined)
assert.equal(availableSlots(availability, [{ ...received.request, status: 'cancelled' }], '2026-11-01', now).length, 10)
assert.equal(availableSlots(availability, [{ ...received.request, doctorId: 'other-doctor' }], '2026-11-01', now).length, 10)
const map = new Map([['unrelated-project-data', 'unchanged']])
const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }
assert.equal(loadBookings(DEFAULT_DOCTOR_ID, storage).warning, null)
const persisted = { ...approved.state, revision: 1 }
assert.equal(persistBookings(persisted, 0, storage), null)
assert.deepEqual(loadBookings(DEFAULT_DOCTOR_ID, storage).state, persisted)
assert.equal(persistBookings({ ...rejected.state, revision: 1 }, 0, storage), 'staleStorage')
assert.equal(map.get('unrelated-project-data'), 'unchanged')
assert.equal(loadBookings('other-doctor', storage).state.requests.length, 0)
map.set(appointmentsStorageKey(DEFAULT_DOCTOR_ID), '{invalid')
assert.equal(loadBookings(DEFAULT_DOCTOR_ID, storage).warning, 'invalidStorage')
assert.ok(persistBookings(persisted, 0, storage))
assert.equal(map.get(appointmentsStorageKey(DEFAULT_DOCTOR_ID)), '{invalid', 'Invalid stored data is never overwritten')
assert.equal(persistBookings(persisted, 0, { getItem() { throw Error() } }), 'storageUnavailable')

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
const previousWindow = globalThis.window
const escapeText = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')
try {
  const { LanguageProvider } = await server.ssrLoadModule('/src/contexts/LanguageContext.jsx')
  const { default: Calendar, RequestInformation } = await server.ssrLoadModule('/src/pages/doctor/DoctorCalendar.jsx')
  for (const [language, locale] of Object.entries({ en, ar })) {
    globalThis.window = { localStorage: { getItem: () => language } }
    const render = props => renderToStaticMarkup(createElement(LanguageProvider, null, createElement(Calendar, props)))
    const bookings = { state: received.state, warning: null }
    const html = render({ bookings })
    for (const key of ['title', 'weeklySchedule', 'exceptions', 'saveAvailability', 'slotPreview']) assert.ok(html.includes(escapeText(locale.doctor.booking[key])), key)
    assert.equal((html.match(/role="switch"/g) || []).length, 7)
    assert.ok(!html.includes('doctor.booking.'))
    assert.ok(!html.includes(locale.doctor.booking.receiveDemo))
    assert.ok(html.includes('M12 5v14 M5 12h14'), 'Plus SVG renders in both languages')
    assert.ok(html.includes('M18 6 6 18 M6 6l12 12'), 'Remove SVG renders in both languages')
    assert.ok(html.includes('\u2013'), 'Time separator renders as an en dash')
    const empty = render({ bookings: { state }, initialTab: 'requests' })
    assert.ok(empty.includes(locale.doctor.booking.noRequestsYet))
    const requests = render({ bookings, initialTab: 'requests', initialRequestId: draft.id })
    assert.ok(requests.includes(locale.doctor.booking.pending))
    assert.ok(requests.includes(locale.doctor.booking.requestDetails))
    assert.ok(requests.includes(locale.doctor.booking.approve))
    assert.ok(requests.includes('dir="' + (language === 'ar' ? 'rtl' : 'ltr') + '"'))
    const history = render({ bookings: { state: rejected.state }, initialTab: 'requests' })
    assert.ok(history.includes('Original rejection'))
    assert.ok(!history.includes('class="dc-approve"'))
    const info = renderToStaticMarkup(createElement(LanguageProvider, null, createElement(RequestInformation, { request: received.request })))
    assert.ok(info.includes(draft.reason))
    assert.ok(info.includes('dir="auto"'))
  }
  assert.deepEqual(Object.keys(ar.doctor.booking).sort(), Object.keys(en.doctor.booking).sort())
  const dashboard = readFileSync(new URL('../../pages/doctor/DoctorDashboard.jsx', import.meta.url), 'utf8')
  assert.ok(dashboard.includes("openCalendar('requests', request.id)"))
  assert.ok(!dashboard.includes("setModal('calendar')"))
  const calendar = readFileSync(new URL('../../pages/doctor/DoctorCalendar.jsx', import.meta.url), 'utf8')
  assert.ok(!calendar.includes('bookings.submit'))
  assert.ok(!calendar.includes('function demoRequest'))
} finally {
  if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow
  await server.close()
}
console.log('Booking intervals, Amman timezone, future slots, reservation exclusion, decisions, conflicts, exception safety, doctor isolation, storage reload/corruption/stale writes, notifications wiring and bilingual rendering passed')
