import assert from 'node:assert/strict'
import { attachPublicSwipe } from './usePublicNavigation.js'
const make = () => {
  const handlers = new Map()
  const element = { scrollTop: 0, clientHeight: 800, addEventListener: (key, fn) => handlers.set(key, fn), removeEventListener: key => handlers.delete(key) }
  const target = { closest: () => null, parentElement: element, scrollHeight: 0, clientHeight: 0 }
  return { element, handlers, target }
}
let time = 0, count = 0
let env = make()
const cleanup = attachPublicSwipe(env.element, 'up', () => count++, () => time)
const wheel = deltaY => ({ target: env.target, deltaY, deltaX: 0, deltaMode: 0 })
env.handlers.get('wheel')(wheel(200)); assert.equal(count, 0, 'Ignore route-entry momentum')
time = 1000
env.handlers.get('wheel')(wheel(50)); assert.equal(count, 0)
env.handlers.get('wheel')(wheel(80)); assert.equal(count, 1)
env.handlers.get('wheel')(wheel(400)); assert.equal(count, 1, 'One navigation per mount')
cleanup(); assert.equal(env.handlers.size, 0)
env = make(); count = 0; time = 0
attachPublicSwipe(env.element, 'down', () => count++, () => time)
time = 1000; env.element.scrollTop = 100
env.handlers.get('wheel')(wheel(-150)); assert.equal(count, 0)
env.element.scrollTop = 0; time = 1100
env.handlers.get('wheel')(wheel(-150)); assert.equal(count, 0, 'Reaching the top during one gesture must not navigate')
time = 1500
env.handlers.get('wheel')(wheel(-150)); assert.equal(count, 1, 'Fresh intentional downward gesture at the top')
env = make(); count = 0; time = 0
attachPublicSwipe(env.element, 'down', () => count++, () => time)
time = 1000
env.handlers.get('touchstart')({ target: env.target, touches: [{ clientX: 20, clientY: 20 }] })
env.handlers.get('touchend')({ target: env.target, changedTouches: [{ clientX: 25, clientY: 130 }] })
assert.equal(count, 1)
env = make(); count = 0; time = 0
env.element.ownerDocument = { getSelection: () => ({ isCollapsed: false }) }
attachPublicSwipe(env.element, 'down', () => count++, () => time)
time = 1000
env.handlers.get('wheel')(wheel(-150)); assert.equal(count, 0, 'Do not navigate while selecting text')
env = make(); count = 0; time = 0
env.element.scrollTop = 100
attachPublicSwipe(env.element, 'down', () => count++, () => time)
time = 1000
env.handlers.get('touchstart')({ target: env.target, touches: [{ clientX: 20, clientY: 20 }] })
env.element.scrollTop = 0
env.handlers.get('touchend')({ target: env.target, changedTouches: [{ clientX: 20, clientY: 150 }] })
assert.equal(count, 0, 'A touch beginning in lower content only scrolls back to the top')
console.log('Public gestures: scoped cleanup, wheel thresholds, single navigation, momentum guard, normal content scrolling and intentional top-edge touch return passed')
