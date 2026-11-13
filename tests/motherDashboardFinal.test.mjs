import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import { parentingTips } from '../src/pages/mother/parentingTipsData.js'
import { createTipSession, lastTipKey, tipSessionKey } from '../src/services/motherParentingTips.js'
import { initials, motherProfile } from '../src/pages/mother/motherPortalData.js'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'

const runtime = { _jsx: jsx.jsx, _jsxs: jsx.jsxs }
const nodes = (node, result = []) => {
  if (Array.isArray(node)) { node.forEach(item => nodes(item, result)); return result }
  if (!node || typeof node !== 'object') return result
  result.push(node)
  nodes(node.props?.children, result)
  return result
}
async function load(path, bindings, name) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, path)
  code = code.replace(/^import .*;?\r?\n/gm, '').replace(/export default /g, '')
  return new Function(...Object.keys(bindings), code + `\nreturn ${name}`)(...Object.values(bindings))
}
const storage = () => {
  const data = new Map()
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
}
function hookHost() {
  const states = [], refs = []
  let cursor = 0, refCursor = 0, previousDependencies, cleanup
  return {
    refs,
    reset() { cursor = 0; refCursor = 0 },
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next }] },
    useRef(initial) { const index = refCursor++; return refs[index] ||= { current: initial } },
    useEffect(effect, dependencies) { if (!previousDependencies || dependencies.some((value, index) => value !== previousDependencies[index])) { cleanup?.(); previousDependencies = dependencies; cleanup = effect() } },
  }
}

test('both requested teddy assets are exact copies of the supplied original images', async () => {
  for (const [target, original] of [['adam-teddy.png', 'ChatGPT Image db boy PM.png'], ['lina-teddy.png', 'ChatGPT Image db girl.png']]) {
    assert.deepEqual(await readFile(new URL('../src/assets/mother/' + target, import.meta.url)), await readFile(new URL('../src/assets/mother/' + original, import.meta.url)))
  }
})

test('tips contain at least 20 unique bilingual entries covering all six translated categories', () => {
  assert.ok(parentingTips.length >= 20)
  assert.equal(new Set(parentingTips.map(tip => tip.id)).size, parentingTips.length)
  assert.equal(new Set(parentingTips.map(tip => tip.category)).size, 6)
  for (const tip of parentingTips) {
    assert.ok(tip.en.trim() && /[\u0600-\u06ff]/u.test(tip.ar))
    assert.ok(en.parentingTips.categories[tip.category] && ar.parentingTips.categories[tip.category])
  }
})

test('tip stays stable through remount/reload, Another Tip changes it, and Logout rotates without clearing other data', () => {
  const sessionStorage = storage(), localStorage = storage()
  localStorage.setItem('nomu.language', 'ar')
  localStorage.setItem('nomu.demo.confirmedBookings.v1', '[existing booking]')
  sessionStorage.setItem('unrelated', 'keep')
  const create = () => createTipSession({ sessionStorage, localStorage, random: () => 0 })
  const session = create()
  const first = session.current()
  assert.equal(session.current().id, first.id)
  assert.equal(create().current().id, first.id)
  const another = session.next()
  assert.notEqual(another.id, first.id)
  assert.equal(create().current().id, another.id)
  assert.equal(localStorage.getItem(lastTipKey), another.id)
  session.end()
  assert.equal(sessionStorage.getItem(tipSessionKey), null)
  assert.notEqual(create().current().id, another.id)
  assert.equal(localStorage.getItem('nomu.language'), 'ar')
  assert.equal(localStorage.getItem('nomu.demo.confirmedBookings.v1'), '[existing booking]')
  assert.equal(sessionStorage.getItem('unrelated'), 'keep')
})

test('invalid IDs and blocked storage still provide a stable tip and avoid consecutive repetition', () => {
  const sessionStorage = storage(), localStorage = storage()
  sessionStorage.setItem(tipSessionKey, 'obsolete-id')
  localStorage.setItem(lastTipKey, parentingTips[0].id)
  const session = createTipSession({ sessionStorage, localStorage, random: () => 0 })
  assert.notEqual(session.current().id, parentingTips[0].id)
  const blocked = { getItem() { throw Error() }, setItem() { throw Error() }, removeItem() { throw Error() } }
  const fallback = createTipSession({ sessionStorage: blocked, localStorage: blocked, random: () => 0 })
  const first = fallback.current()
  assert.equal(fallback.current().id, first.id)
  assert.notEqual(fallback.next().id, first.id)
  const previous = fallback.current().id
  fallback.end()
  assert.notEqual(fallback.current().id, previous)
})

test('a new portal entry after login rotates tips while StrictMode and page refresh preserve the selected ID', () => {
  const sessionStorage = storage(), localStorage = storage()
  const create = () => createTipSession({ sessionStorage, localStorage, random: () => 0 })
  const session = create()
  const first = session.enter('PUSH', 'first-login')
  assert.equal(session.enter('PUSH', 'first-login').id, first.id)
  assert.equal(create().enter('POP', 'first-login').id, first.id)
  const second = session.enter('PUSH', 'second-login')
  assert.notEqual(second.id, first.id)
  assert.equal(session.current().id, second.id)
  assert.equal(session.enter('PUSH', 'second-login').id, second.id)
})

test('one tips panel preserves its ID on language changes and rotates through the shared session service', async () => {
  const state = hookHost(), session = createTipSession({ sessionStorage: storage(), localStorage: storage(), random: () => 0 })
  let language = 'en'
  const t = key => key.split('.').reduce((value, part) => value[part], language === 'en' ? en : ar)
  const Tips = await load('../src/components/mother/ParentingTips.jsx', { ...runtime, ...state, PortalIcon: () => null, useLanguage: () => ({ language, t }), getSessionParentingTip: () => session.current(), nextParentingTip: () => session.next() }, 'ParentingTips')
  const render = () => { state.reset(); return Tips() }
  let tree = render()
  const firstId = session.current().id
  assert.equal(tree.type, 'section')
  assert.ok(nodes(tree).some(node => node.type === 'p' && node.props.children === session.current().en))
  language = 'ar'
  tree = render()
  assert.equal(session.current().id, firstId)
  assert.ok(nodes(tree).some(node => node.type === 'p' && node.props.children === session.current().ar))
  nodes(tree).find(node => node.type === 'button').props.onClick()
  tree = render()
  assert.notEqual(session.current().id, firstId)
  assert.ok(nodes(tree).some(node => node.type === 'p' && node.props.children === session.current().ar))
})

for (const [language, dictionary] of [['en', en], ['ar', ar]]) {
  test(`${language}: profile supports toggle, outside click, Escape, keyboard focus, blur and Logout`, async () => {
    const state = hookHost(), listeners = new Map()
    let ended = 0, triggerFocused = 0, logoutFocused = 0
    const t = key => key.split('.').reduce((value, part) => value[part], dictionary)
    const Dropdown = await load('../src/components/mother/MotherProfileDropdown.jsx', { ...runtime, ...state, Link: 'a', PortalIcon: () => null, initials, motherProfile, useLanguage: () => ({ language, t }), useMotherLogout: () => () => { ended++ }, document: { addEventListener: (key, handler) => listeners.set(key, handler), removeEventListener: key => listeners.delete(key) } }, 'MotherProfileDropdown')
    const render = () => { state.reset(); return Dropdown() }
    const button = tree => nodes(tree).find(node => node.type === 'button')
    let tree = render()
    state.refs[0].current = { contains: target => target === 'inside' }
    state.refs[1].current = { focus: () => { triggerFocused++ } }
    state.refs[2].current = { focus: () => { logoutFocused++ } }
    assert.equal(button(tree).props['aria-expanded'], false)
    button(tree).props.onClick()
    tree = render()
    assert.equal(button(tree).props['aria-expanded'], true)
    assert.equal(logoutFocused, 1)
    listeners.get('pointerdown')({ target: 'inside' })
    assert.equal(button(render()).props['aria-expanded'], true)
    listeners.get('pointerdown')({ target: 'outside' })
    tree = render()
    assert.equal(button(tree).props['aria-expanded'], false)
    assert.equal(listeners.size, 0)
    button(tree).props.onKeyDown({ key: 'ArrowDown', preventDefault() {} })
    tree = render()
    assert.equal(button(tree).props['aria-expanded'], true)
    tree.props.onKeyDown({ key: 'Escape', preventDefault() {}, stopPropagation() {} })
    tree = render()
    assert.equal(triggerFocused, 1)
    assert.equal(button(tree).props['aria-expanded'], false)
    button(tree).props.onClick()
    tree = render()
    button(tree).props.onClick()
    tree = render()
    assert.equal(button(tree).props['aria-expanded'], false)
    button(tree).props.onClick()
    tree = render()
    const logout = nodes(tree).find(node => node.props?.role === 'menuitem')
    assert.equal(logout.props.to, '/mother/login')
    logout.props.onClick()
    assert.equal(ended, 1)
    assert.equal(button(render()).props['aria-expanded'], false)
    button(render()).props.onClick()
    tree = render()
    tree.props.onBlur({ currentTarget: { contains: () => false }, relatedTarget: null })
    assert.equal(button(render()).props['aria-expanded'], false)
  })
}
