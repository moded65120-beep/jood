import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'

const source = readFileSync(new URL('../src/hooks/useHomepageMotion.js', import.meta.url), 'utf8')
  .replace(/^import .*\n/, '').replace('export default ', '')

function fixture(reduced = false, active = true) {
  const events = new Map(), windowEvents = new Map(), frames = new Map()
  const photoValues = new Map(), journeyValues = new Map()
  const style = values => ({ setProperty: (k, v) => values.set(k, v), removeProperty: k => values.delete(k) })
  let journeyTop = 500, cleanup, nextFrame = 0
  const preference = { matches: reduced, addEventListener: (k, v) => windowEvents.set(`media:${k}`, v), removeEventListener: k => windowEvents.delete(`media:${k}`) }
  const photo = { style: style(photoValues), getBoundingClientRect: () => ({ top: 200, bottom: 600, height: 400 }) }
  const journey = { style: style(journeyValues), getBoundingClientRect: () => ({ top: journeyTop, height: 2000 }) }
  const surface = {
    querySelectorAll: () => [photo], querySelector: () => journey,
    getBoundingClientRect: () => ({ top: 100, bottom: 900, height: 800 }),
    addEventListener: (k, v, options) => events.set(k, { listener: v, options }),
    removeEventListener: k => events.delete(k),
  }
  const windowMock = {
    matchMedia: () => preference,
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame },
    cancelAnimationFrame: id => frames.delete(id),
    addEventListener: (k, v) => windowEvents.set(k, v), removeEventListener: k => windowEvents.delete(k),
  }
  const hook = new Function('useEffect', 'window', `${source}; return useHomepageMotion`)(effect => { cleanup = effect() }, windowMock)
  hook({ current: surface }, active)
  return { events, windowEvents, frames, photoValues, journeyValues, preference,
    setTop: value => { journeyTop = value }, cleanup: () => cleanup?.(),
    flush() { for (const [id, callback] of frames) { frames.delete(id); callback() } },
  }
}

test('homepage motion batches passive scroll work and the connecting line never retracts', () => {
  const f = fixture()
  assert.equal(f.events.get('scroll').options.passive, true)
  f.events.get('scroll').listener(); f.events.get('scroll').listener()
  assert.equal(f.frames.size, 1)
  f.flush()
  assert.ok(Math.abs(parseFloat(f.photoValues.get('--photo-drift'))) <= 14)
  assert.equal(f.journeyValues.get('--journey-progress'), '0.2000')
  f.setTop(-300); f.events.get('scroll').listener(); f.flush()
  assert.equal(f.journeyValues.get('--journey-progress'), '0.6000')
  f.setTop(500); f.events.get('scroll').listener(); f.flush()
  assert.equal(f.journeyValues.get('--journey-progress'), '0.6000')
  f.cleanup()
  assert.equal(f.events.size, 0); assert.equal(f.windowEvents.size, 0); assert.equal(f.frames.size, 0)
})

test('reduced motion skips parallax, completes the line, and responds to preference changes', () => {
  const f = fixture(true)
  assert.equal(f.frames.size, 0)
  assert.equal(f.photoValues.size, 0)
  assert.equal(f.journeyValues.get('--journey-progress'), '1')
  f.preference.matches = false; f.windowEvents.get('media:change')(); f.flush()
  assert.ok(f.photoValues.has('--photo-drift'))
  f.events.get('scroll').listener()
  f.preference.matches = true; f.windowEvents.get('media:change')()
  assert.equal(f.photoValues.size, 0); assert.equal(f.frames.size, 0)
  f.cleanup()
})

test('hidden homepage registers no motion listeners', () => {
  const f = fixture(false, false)
  assert.equal(f.events.size, 0); assert.equal(f.frames.size, 0)
})

test('global gestures open portals and return from auth to the original home scene', async () => {
  const slots = [], timers = [], effects = [], navigation = []
  let cursor = 0, gestureConfig
  const bindings = {
    _jsx: jsx.jsx, _jsxs: jsx.jsxs,
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value }] },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useCallback: callback => callback, useEffect: effect => effects.push(effect),
    useLanguage: () => ({ language: 'en', t: key => key }), useNavigate: () => path => navigation.push(path),
    useNemoGestures(config) { gestureConfig = config }, useHomepageMotion() {}, Link: 'a', LanguageSwitcher: 'switcher', LogoSymbol: 'logo',
    UnifiedLoginForm: 'login', HomeServices: 'services', PortalSelection: 'portals', NemoAuthScreen: 'authscreen', NemoAboutModal: 'aboutmodal',
    ArrowUp: 'arrow', ArrowLeft: 'back', ArrowRight: 'next', Activity: 'activity', Users: 'users', Stethoscope: 'doctor', Sparkles: 'sparkles', HeartPulse: 'heart', Info: 'info',
    window: { matchMedia: () => ({ matches: false }), setTimeout: callback => { timers.push(callback); return timers.length }, clearTimeout() {} },
  }
  let { code } = await transformWithOxc(readFileSync(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8'), 'Home.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace('export default ', '').replace(/import\.meta\.env\.BASE_URL/g, '"/"')
  const Home = new Function(...Object.keys(bindings), `${code}; return Home`)(...Object.values(bindings))
  function render() {
    cursor = 0
    const tree = Home({})
    effects.splice(0).forEach(effect => effect())
    timers.splice(0).forEach(callback => callback())
    return tree
  }
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null
    if (predicate(node)) return node
    return [node.props?.children].flat(Infinity).map(child => find(child, predicate)).find(Boolean)
  }
  let tree = render()
  assert.equal(find(tree, node => node.props?.className === 'nemo-about-anchor'), undefined, 'About is temporarily removed')
  assert.equal(find(find(tree, node => node.props?.className === 'nemo-visual'), node => node.props?.className === 'nemo-about-trigger'), undefined)
  assert.equal(find(find(tree, node => node.type === 'header'), node => node.props?.className === 'nemo-about-trigger'), undefined)
  const surface = find(tree, node => node.props?.className === 'nemo-main')
  assert.equal(surface.props.onWheel, undefined)
  assert.equal(surface.props.onTouchStart, undefined)
  assert.equal(surface.props.onKeyDown, undefined)
  assert.equal(gestureConfig.mode, 'home')
  gestureConfig.onUp()
  tree = render()
  assert.equal(find(tree, node => node.props?.className === 'nemo-portal-actions').props.inert, false)
  assert.equal(gestureConfig.mode, 'portals')
  assert.deepEqual(navigation, [])
  find(tree, node => node.props?.className === 'nemo-parent').props.onClick()
  tree = render()
  assert.equal(find(tree, node => node.type === 'authscreen').props.audience, 'parent')
  assert.equal(gestureConfig.mode, 'auth')
  gestureConfig.onDown()
  tree = render()
  assert.equal(find(tree, node => node.type === 'authscreen').props.leaving, true)
  assert.equal(find(tree, node => node.props?.className === 'nemo-hero').props.inert, false)
  tree = render()
  assert.equal(find(tree, node => node.type === 'authscreen'), undefined)
  assert.equal(gestureConfig.mode, 'home')
  assert.equal(find(tree, node => node.props?.className === 'nemo-portal-actions').props.inert, true)
  find(tree, node => node.props?.className === 'nomu-home__continue').props.onClick()
  tree = render()
  find(tree, node => node.props?.className === 'nemo-doctor').props.onClick()
  tree = render()
  assert.equal(find(tree, node => node.type === 'authscreen').props.audience, 'doctor')
  gestureConfig.onDown(); render(); tree = render()
  assert.equal(gestureConfig.mode, 'home')
  assert.deepEqual(navigation, [])


})
