import assert from 'node:assert/strict'
import test from 'node:test'
import { attachNemoGestures } from '../src/hooks/useNemoGestures.js'

function fixture(mode = 'home') {
  const listeners = new Map(), calls = []
  let selection = false, busy = false, time = 1000
  const blank = { closest: () => null }
  const target = { addEventListener: (name, callback, options) => listeners.set(name, { callback, options }),
    removeEventListener: (name, callback, capture) => { assert.equal(capture, true); assert.equal(callback, listeners.get(name).callback); listeners.delete(name) } }
  const document = { getSelection: () => ({ isCollapsed: !selection }), querySelector: () => busy }
  const cleanup = attachNemoGestures({ target, document, mode, onUp: () => calls.push('up'), onDown: () => calls.push('down'), now: () => time })
  function send(type, payload = {}) {
    const event = { target: blank, cancelable: true, prevented: false, preventDefault() { this.prevented = true }, ...payload }
    listeners.get(type)?.callback(event)
    return event
  }
  return { listeners, calls, send, cleanup, select: value => { selection = value }, busy: value => { busy = value }, time: value => { time = value },
    control: { closest: selector => selector.startsWith('input') ? {} : null } }
}

function touch(f, startY, endY, target, dx = 0) {
  f.send('touchstart', { target, touches: [{ clientX: 100, clientY: startY }] })
  const move = f.send('touchmove', { target, touches: [{ clientX: 100 + dx, clientY: endY }] })
  f.send('touchend', { target, changedTouches: [{ clientX: 100 + dx, clientY: endY }] })
  return move
}

test('window touch gestures work from blank areas, reject tiny/horizontal movement, and trigger once per phase', () => {
  const f = fixture()
  assert.equal(f.listeners.get('touchmove').options.passive, false)
  assert.equal(f.listeners.get('touchstart').options.capture, true)
  touch(f, 200, 180)
  touch(f, 200, 140, undefined, 100)
  assert.deepEqual(f.calls, [])
  assert.equal(touch(f, 200, 150).prevented, true)
  touch(f, 200, 100)
  assert.deepEqual(f.calls, ['up'])
  f.cleanup(); assert.equal(f.listeners.size, 0)
})

test('auth swipe down returns home; input/button starts, selected text, busy forms and multi-touch never navigate', () => {
  const f = fixture('auth')
  touch(f, 100, 180, f.control)
  f.select(true); touch(f, 100, 180); f.select(false)
  f.busy(true); touch(f, 100, 180); f.busy(false)
  f.send('touchstart', { touches: [{ clientX: 0, clientY: 0 }, { clientX: 20, clientY: 20 }] })
  f.send('touchend', { changedTouches: [{ clientX: 0, clientY: 100 }] })
  assert.deepEqual(f.calls, [])
  assert.equal(touch(f, 180, 100).prevented, false, 'Upward form scrolling stays native')
  assert.equal(touch(f, 100, 160).prevented, true)
  assert.deepEqual(f.calls, ['down'])
})

test('mouse/pen pointer drag works and selections or cancelled pointers do not navigate', () => {
  const f = fixture()
  f.send('pointerdown', { pointerId: 7, pointerType: 'mouse', button: 0, clientX: 80, clientY: 200 })
  f.send('pointercancel', { pointerId: 7 })
  f.send('pointerup', { pointerId: 7, clientX: 80, clientY: 100 })
  assert.deepEqual(f.calls, [])
  f.send('pointerdown', { pointerId: 8, pointerType: 'pen', button: 0, clientX: 80, clientY: 200 })
  const move = f.send('pointermove', { pointerId: 8, buttons: 1, clientX: 82, clientY: 140 })
  assert.equal(move.prevented, true)
  f.send('pointerup', { pointerId: 8, clientX: 82, clientY: 140 })
  assert.deepEqual(f.calls, ['up'])
})

test('wheel/trackpad accumulates deliberate vertical movement, ignores horizontal scroll and pinch zoom', () => {
  const f = fixture()
  f.send('wheel', { deltaY: 100, ctrlKey: true })
  f.send('wheel', { deltaY: 40, deltaX: 100 })
  f.send('wheel', { deltaY: 10 }); f.send('wheel', { deltaY: 15 })
  assert.deepEqual(f.calls, [])
  f.time(1400); f.send('wheel', { deltaY: 35 })
  assert.deepEqual(f.calls, [], 'Small scrolls separated in time do not accumulate')
  assert.equal(f.send('wheel', { deltaY: 30 }).prevented, true)
  assert.deepEqual(f.calls, ['up'])
  const auth = fixture('auth')
  assert.equal(auth.send('wheel', { deltaY: 80 }).prevented, false)
  auth.send('wheel', { deltaY: -70 })
  assert.deepEqual(auth.calls, ['down'])
})

test('both arrow keys open the home choices; auth ArrowDown returns unless editing a control', () => {
  for (const key of ['ArrowUp', 'ArrowDown']) {
    const f = fixture()
    assert.equal(f.send('keydown', { key }).prevented, true)
    assert.deepEqual(f.calls, ['up'])
  }
  const auth = fixture('auth')
  auth.send('keydown', { key: 'ArrowDown', target: auth.control })
  auth.send('keydown', { key: 'ArrowDown', repeat: true })
  auth.send('keydown', { key: 'ArrowUp' })
  assert.deepEqual(auth.calls, [])
  auth.send('keydown', { key: 'ArrowDown' })
  assert.deepEqual(auth.calls, ['down'])
})

test('touch pointer cancellation does not discard the matching touch-event gesture', () => {
  const f = fixture()
  f.send('touchstart', { touches: [{ clientX: 100, clientY: 200 }] })
  f.send('pointercancel', { pointerId: 2, pointerType: 'touch' })
  f.send('touchend', { changedTouches: [{ clientX: 100, clientY: 140 }] })
  assert.deepEqual(f.calls, ['up'])
  const disabled = fixture('disabled')
  assert.equal(disabled.listeners.size, 0)
})

test('an animation lock rejection does not permanently disable later gestures', () => {
  const listeners = new Map()
  let ready = false, calls = 0
  const cleanup = attachNemoGestures({
    target: { addEventListener: (key, callback) => listeners.set(key, callback), removeEventListener: key => listeners.delete(key) },
    document: {}, mode: 'home', onUp: () => { if (!ready) return false; calls++; return true }, onDown() {},
  })
  const event = { key: 'ArrowUp', target: { closest: () => null }, cancelable: true, preventDefault() {} }
  listeners.get('keydown')(event)
  assert.equal(calls, 0)
  ready = true
  listeners.get('keydown')(event); listeners.get('keydown')(event)
  assert.equal(calls, 1)
  cleanup()
})
