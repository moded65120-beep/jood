import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'
import { attachNemoGestures } from '../src/hooks/useNemoGestures.js'

async function fixture(language = 'en', reduced = false) {
  const slots = [], effects = [], timers = [], cleanups = []
  let cursor = 0, closed = 0, shown = 0
  const element = { open: false, showModal() { this.open = true; shown++ }, close() { this.open = false } }
  const bindings = {
    _jsx: jsx.jsx, _jsxs: jsx.jsxs, X: 'close-icon', useCallback: callback => callback,
    useLanguage: () => ({ language, t: key => key.split('.').reduce((value, part) => value?.[part], language === 'ar' ? ar : en) }),
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value }] },
    useEffect(effect) { const i = cursor++; if (!(i in slots)) { slots[i] = true; effects.push(effect) } },
    window: { matchMedia: () => ({ matches: reduced }), setTimeout(callback, duration) { timers.push({ callback, duration }); return timers.length }, clearTimeout() {} },
  }
  let { code } = await transformWithOxc(readFileSync(new URL('../src/components/common/NemoAboutModal.jsx', import.meta.url), 'utf8'), 'NemoAboutModal.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace('export default ', '')
  const Component = new Function(...Object.keys(bindings), `${code}; return NemoAboutModal`)(...Object.values(bindings))
  return { element, timers, get closed() { return closed }, get shown() { return shown },
    render() { cursor = 0; const tree = Component({ onClose: () => { closed++ } }); tree.props.ref.current = element; effects.splice(0).forEach(effect => cleanups.push(effect())); return tree },
    finish() { timers.splice(0).forEach(timer => timer.callback()) }, cleanup() { cleanups.forEach(cleanup => cleanup?.()) },
  }
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined
  if (predicate(node)) return node
  return [node.props?.children].flat(Infinity).map(child => find(child, predicate)).find(Boolean)
}

for (const language of ['en', 'ar']) {
  test(`${language}: About modal uses the correct paragraph and direction and closes smoothly with X`, async () => {
    const f = await fixture(language), tree = f.render()
    assert.equal(f.shown, 1); assert.equal(f.element.open, true)
    assert.equal(tree.props.dir, language === 'ar' ? 'rtl' : 'ltr')
    assert.equal(find(tree, node => node.type === 'h2').props.children, 'من نحن | About Us')
    assert.equal(find(tree, node => node.type === 'p').props.children, (language === 'ar' ? ar : en).home.about.description)
    assert.ok(!/\?{2,}|\uFFFD/.test(find(tree, node => node.type === 'p').props.children))
    assert.equal(find(tree, node => node.props?.className === 'nemo-about__content').props.tabIndex, 0)
    const close = find(tree, node => node.type === 'button')
    assert.ok(close.props['aria-label']); assert.equal(close.props.autoFocus, true)
    close.props.onClick(); close.props.onClick()
    assert.equal(f.timers.length, 1); assert.equal(f.timers[0].duration, 240)
    assert.equal(f.closed, 0); assert.ok(f.render().props.className.includes('closing'))
    f.finish(); assert.equal(f.closed, 1); assert.equal(f.element.open, false)
    f.cleanup()
  })
}

test('Escape is intercepted for the close animation, and only backdrop clicks dismiss', async () => {
  const f = await fixture(), tree = f.render()
  tree.props.onClick({ target: {}, currentTarget: f.element })
  assert.equal(f.timers.length, 0)
  tree.props.onClick({ target: f.element, currentTarget: f.element })
  f.finish(); assert.equal(f.closed, 1)
  const escape = await fixture('en', true), dialog = escape.render()
  let prevented = false
  dialog.props.onCancel({ preventDefault() { prevented = true } })
  assert.equal(prevented, true); assert.equal(escape.timers[0].duration, 0)
  escape.finish(); assert.equal(escape.closed, 1)
})

test('an open native dialog leaves wheel and arrow events available for modal scrolling', () => {
  const events = new Map(), calls = []
  attachNemoGestures({ target: { addEventListener: (key, listener) => events.set(key, listener) },
    document: { querySelector: selector => selector.includes('dialog[open]') }, mode: 'home', onUp: () => calls.push('up'), onDown: () => calls.push('down') })
  const event = { target: { closest: () => null }, deltaY: 200, key: 'ArrowDown', cancelable: true, preventDefault() { throw Error('Modal scrolling must stay native') } }
  events.get('wheel')(event); events.get('keydown')(event)
  assert.deepEqual(calls, [])
})
