import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import { captureMotherScroll, motherBack, readMotherVisit, restoreMotherScroll, writeMotherVisit } from '../src/services/motherNavigationState.js'

test('visit snapshots follow history entries, preserve router state and isolate normal new navigation', () => {
  const history = { state: { key: 'visit-a', idx: 3, usr: { child: 'adam' } }, replaceState(state) { this.state = state } }
  writeMotherVisit('visit-a', { ui: { milestonePreview: 18 }, scroll: { x: 0, y: 640 } }, history)
  const previous = history.state
  assert.equal(history.state.idx, 3)
  assert.deepEqual(history.state.usr, { child: 'adam' })
  history.state = { key: 'visit-b', idx: 4 }
  assert.deepEqual(readMotherVisit('visit-b', history), { ui: {} })
  assert.equal(readMotherVisit('visit-a', history).scroll.y, 640)
  history.state = previous
  assert.equal(readMotherVisit('visit-a', history).ui.milestonePreview, 18)
  const calls = [], navigate = (...args) => calls.push(args)
  motherBack(navigate, '/mother/children', history)
  assert.deepEqual(calls.pop(), [-1])
  history.state = { idx: 0 }
  motherBack(navigate, '/mother/children/adam', history)
  assert.deepEqual(calls.pop(), ['/mother/children/adam', { replace: true }])
})

test('scroll snapshots restore window and nested main scrollers including RTL without touching the sidebar', () => {
  const main = { scrollTop: 120, scrollLeft: 0, children: [], querySelectorAll: () => [timeline] }
  const timeline = { parentElement: main, children: [], scrollTop: 0, scrollLeft: -320 }
  main.children = [timeline]
  const host = { scrollX: 0, scrollY: 780, scrollTo(x, y) { this.scrollX = x; this.scrollY = y } }
  const saved = captureMotherScroll(main, host)
  main.scrollTop = 0
  timeline.scrollLeft = 0
  host.scrollY = 0
  assert.equal(restoreMotherScroll(main, saved, host), true)
  assert.equal(main.scrollTop, 120)
  assert.equal(timeline.scrollLeft, -320)
  assert.equal(host.scrollY, 780)
  assert.equal(saved.containers.length, 2)
})

async function hooks(bindings) {
  const source = await readFile(new URL('../src/hooks/useMotherNavigation.js', import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, 'useMotherNavigation.js')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace(/export /g, '')
  return new Function(...Object.keys(bindings), code + '\nreturn { useMotherMilestoneNavigation, useMotherPageState }')(...Object.values(bindings))
}

test('milestone timeline, skills, Back, Forward and direct access use real history without duplicate timeline entries', async () => {
  const previousWindow = globalThis.window
  const history = { state: { key: 'timeline-history', idx: 1 }, replaceState(state) { this.state = state } }
  globalThis.window = { history }
  try {
    const entries = [null, { pathname: '/mother/children/adam/milestones', search: '', key: 'timeline-history', state: null }]
    let index = 1, location = entries[index]
    const states = new Map([[1, history.state]])
    const navigate = (to, options = {}) => {
      states.set(index, history.state)
      if (typeof to === 'number') index += to
      else {
        if (!options.replace) { index++; entries.splice(index) }
        entries[index] = { ...to, key: `navigation-${index}`, state: options.state }
        states.set(index, { key: entries[index].key, idx: index })
      }
      location = entries[index]
      history.state = states.get(index)
    }
    const api = await hooks({ useLocation: () => location, useNavigate: () => navigate, readMotherVisit, writeMotherVisit, motherBack, window: globalThis.window })
    api.useMotherMilestoneNavigation(true).previewChanged(18)
    api.useMotherMilestoneNavigation(true).changeAge(18)
    assert.equal(api.useMotherMilestoneNavigation(true).age, 18)
    assert.ok(location.pathname.includes('/adam/'))
    api.useMotherMilestoneNavigation(true).changeAge(24)
    api.useMotherMilestoneNavigation(true).changeAge(null)
    assert.equal(index, 1)
    assert.equal(api.useMotherMilestoneNavigation(true).preview, 18)
    navigate(1)
    assert.equal(api.useMotherMilestoneNavigation(true).age, 18)
    location = { pathname: '/mother/children/lina/milestones', search: '?stage=30&view=skills', key: 'direct-stage' }
    history.state = { idx: 0, key: 'direct-stage' }
    index = 0
    api.useMotherMilestoneNavigation(true).changeAge(null)
    assert.equal(index, 0)
    assert.ok(!location.search.includes('view=skills'))
    assert.equal(location.pathname, '/mother/children/lina/milestones')
  } finally { globalThis.window = previousWindow }
})

test('booking UI state restores for its visit after remount and starts clean for a new visit', async () => {
  const previousWindow = globalThis.window
  const history = { state: { key: 'booking-state', idx: 2 }, replaceState(state) { this.state = state } }
  globalThis.window = { history }
  try {
    let key = 'booking-state', states = [], cursor = 0
    const api = await hooks({
      useLocation: () => ({ key }), readMotherVisit, writeMotherVisit,
      useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], next => { states[index] = next }] },
      useEffect: effect => effect(),
    })
    const render = () => { cursor = 0; return api.useMotherPageState('booking.values', { childId: 'adam', doctorId: '' }) }
    render()[1]({ childId: 'adam', doctorId: 'chosen-doctor' })
    render()
    states = []
    assert.equal(render()[0].doctorId, 'chosen-doctor')
    key = 'fresh-booking'
    history.state = { idx: 3, key }
    states = []
    assert.equal(render()[0].doctorId, '')
  } finally { globalThis.window = previousWindow }
})
