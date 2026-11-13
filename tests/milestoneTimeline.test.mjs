import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'
import { ageMedia, skillMedia } from '../src/components/child-health/milestoneMedia.js'
import { ageFromBirthDate } from '../src/components/doctor/medicalRecordData.js'
import { createMilestonesRepository } from '../src/services/milestonesRepository.js'

const months = [2, 4, 6, 9, 12, 15, 18, 24, 30, 36]
function nodes(node) {
  if (!node || typeof node !== 'object') return []
  return [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]
}

async function session(language, records = {}, options = {}) {
  const states = []
  let cursor = 0
  const dictionary = language === 'ar' ? ar : en
  const source = await readFile(new URL('../src/components/child-health/DevelopmentalMilestones.jsx', import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, 'DevelopmentalMilestones.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace(/export default /g, '').replace(/export /g, '').replace(/import\.meta\.env\.DEV/g, 'false')
  const bindings = {
    _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment, ageMedia, skillMedia, ageFromBirthDate,
    ...Object.fromEntries(['Baby', 'Heart', 'MessageCircle', 'Brain', 'Footprints', 'ArrowLeft', 'ArrowRight', 'Info', 'Lightbulb', 'Sparkles', 'Blocks', 'Play', 'Pause', 'X', 'ZoomIn', 'Star', 'CircleCheck'].map(name => [name, name])),
    useState(initial) {
      const index = cursor++
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
      return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next }]
    },
    useRef: () => ({ current: null }), useId: () => 'timeline-test', useEffect: effect => options.effects?.push(effect),
    useContext: () => options.navigation, UNSAFE_NavigationContext: {}, window: options.window, document: options.document,
    useLanguage: () => ({ language, t: key => key.split('.').reduce((value, part) => value?.[part], dictionary) ?? key }),
    useMilestonesStorage: () => ({ records, status: '', loadError: false, update() {}, retry() {}, ...options.storage }),
    requestAnimationFrame() {},
  }
  const { MilestoneSession, Media, MilestoneLeaveGuard } = new Function(...Object.keys(bindings), code + '\nreturn { MilestoneSession, Media, MilestoneLeaveGuard }')(...Object.values(bindings))
  return {
    Media,
    MilestoneLeaveGuard,
    render(currentAge, role = 'mother', dateOfBirth) {
      cursor = 0
      return MilestoneSession({ currentAge, role, child: { id: 'adam', name: 'Adam', dateOfBirth }, childId: 'adam', motherId: 'sara', stickyOffset: 0, navigation: options.milestones })
    },
  }
}

test('timeline defaults to the last eligible stage without exceeding the supplied completed-month age', async () => {
  for (const language of ['en', 'ar']) for (const [age, expected] of [[undefined, 2], [null, 2], [0, 2], [1, 2], [2, 2], [3, 2], [4, 4], [8, 6], [13, 12], [23, 18], [24, 24], [35, 30], [36, 36], [90, 36]]) {
    const view = await session(language)
    const tree = view.render(age)
    const buttons = nodes(tree).filter(node => node.props.className === 'dm-timeline-node')
    assert.equal(buttons.length, 10)
    assert.deepEqual(buttons.map(node => node.props.children[1].props.children), months.map(month => (language === 'ar' ? ar : en).childHealth.milestones.ages[month]))
    assert.equal(buttons.filter(node => node.props['aria-pressed']).length, 1)
    assert.equal(buttons[months.indexOf(expected)].props['aria-pressed'], true)
    const image = nodes(tree).find(node => node.type === view.Media)
    assert.equal(image.props.item.mediaSrc, ageMedia[expected].mediaSrc)
  }
})

test('each node changes only the preview; the action opens the matching skills and Back retains the selection', async () => {
  for (const language of ['en', 'ar']) {
    const view = await session(language)
    for (let index = 0; index < months.length; index++) {
      let tree = view.render(18)
      nodes(tree).filter(node => node.props.className === 'dm-timeline-node')[index].props.onClick()
      tree = view.render(18)
      assert.equal(tree.props.className, 'dm')
      assert.equal(tree.props.dir, language === 'ar' ? 'rtl' : 'ltr')
      assert.equal(nodes(tree).find(node => node.type === view.Media).props.item.mediaSrc, ageMedia[months[index]].mediaSrc)
      assert.equal(nodes(tree).find(node => node.props.className === 'dm-stage-description').props.children, (language === 'ar' ? ar : en).childHealth.milestones.ageDescriptions[months[index]])
      nodes(tree).find(node => node.props.className === 'dm-stage-action').props.onClick()
      tree = view.render(18)
      assert.ok(tree.props.className.includes('dm-details'))
      assert.ok(nodes(tree).some(node => node.type === 'h3' && String(node.props.id).includes(`${months[index]}m-`)))
      assert.ok(nodes(tree).some(node => node.props.className === 'dm-age-navigation'))
      nodes(tree).find(node => node.props.className === 'dm-back').props.onClick()
      tree = view.render(18)
      assert.equal(tree.props.className, 'dm')
      assert.equal(nodes(tree).filter(node => node.props.className === 'dm-timeline-node')[index].props['aria-pressed'], true)
    }
    assert.ok(!nodes(view.render(18, 'doctor')).some(node => node.props.className === 'dm-timeline'))
  }
})

test('preview counts valid responses only, updates on changes and uses persisted answers after remount', async () => {
  for (const language of ['en', 'ar']) {
    const data = new Map()
    const storage = { get length() { return data.size }, key: index => [...data.keys()][index], getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
    const repository = createMilestonesRepository({ storage })
    repository.saveResponse('adam', 'sara', '2m-social-settle', { answer: 'yes' })
    repository.saveResponse('adam', 'sara', '2m-social-face', { answer: 'notYet' })
    repository.saveResponse('adam', 'sara', '2m-social-greet', { answer: 'unsure' })
    repository.saveResponse('adam', 'sara', '2m-social-smile', { note: 'A note without an answer' })
    repository.saveResponse('adam', 'sara', '4m-social-smile', { answer: 'yes' })
    const records = repository.read('adam', 'sara')
    const view = await session(language, records)
    const progress = () => nodes(view.render(2)).find(node => node.type === 'progress')
    assert.equal(progress().props.value, 3)
    assert.equal(progress().props.max, 11)
    assert.ok(progress().props['aria-label'].includes(new Intl.NumberFormat(language).format(3)))
    repository.saveResponse('adam', 'sara', '2m-social-settle', { answer: null })
    Object.assign(records, repository.read('adam', 'sara'))
    assert.equal(progress().props.value, 2)
    repository.saveResponse('adam', 'sara', '2m-social-smile', { answer: 'yes' })
    Object.assign(records, repository.read('adam', 'sara'))
    assert.equal(progress().props.value, 3)
    const refreshed = await session(language, createMilestonesRepository({ storage }).read('adam', 'sara'))
    assert.equal(nodes(refreshed.render(2)).find(node => node.type === 'progress').props.value, 3)
  }
})

test('DOB marker stays independent of selection, marks the first stage as upcoming, and hides invalid ages', async () => {
  const date = new Date()
  date.setDate(1)
  date.setMonth(date.getMonth() - 20)
  const localDate = value => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-')
  for (const language of ['en', 'ar']) {
    const copy = (language === 'ar' ? ar : en).childHealth.milestones
    const view = await session(language)
    let tree = view.render(20, 'mother', localDate(date))
    let items = nodes(tree).filter(node => node.props.className === 'dm-timeline-item')
    const marked = () => items.findIndex(node => nodes(node).some(child => child.props.className === 'dm-current-stage'))
    assert.equal(marked(), months.indexOf(18))
    nodes(tree).filter(node => node.props.className === 'dm-timeline-node')[1].props.onClick()
    tree = view.render(20, 'mother', localDate(date))
    items = nodes(tree).filter(node => node.props.className === 'dm-timeline-item')
    assert.equal(marked(), months.indexOf(18))
    assert.equal(nodes(tree).filter(node => node.props.className === 'dm-timeline-node')[1].props['aria-pressed'], true)
    assert.equal(nodes(tree).find(node => node.props.className === 'dm-current-stage').props.children, copy.currentAgeStage)
    tree = view.render(0, 'mother', localDate(new Date()))
    assert.equal(nodes(tree).find(node => node.props.className === 'dm-current-stage').props.children, copy.upcomingAgeStage)
    assert.ok(nodes(tree).filter(node => node.props.className === 'dm-timeline-item')[0].props.children.some(child => child?.props?.className === 'dm-current-stage'))
    for (const invalid of [undefined, '', 'invalid', '2026-02-30', '2999-01-01']) {
      assert.ok(!nodes(view.render(20, 'mother', invalid)).some(node => node.props.className === 'dm-current-stage'))
    }
    tree = view.render(100, 'mother', '2000-01-01')
    assert.ok(nodes(tree).filter(node => node.props.className === 'dm-timeline-item')[9].props.children.some(child => child?.props?.className === 'dm-current-stage'))
    assert.ok(!nodes(view.render(20, 'doctor', localDate(date))).some(node => node.props.className === 'dm-stage-progress'))
  }
})

test('translated parent tips and browser-only manual save notice appear only on mother age selection', async () => {
  for (const language of ['en', 'ar']) {
    const copy = (language === 'ar' ? ar : en).childHealth.milestones.parentTips
    const view = await session(language)
    let tree = view.render(4)
    const tips = nodes(tree).find(node => node.props.className === 'dm-tip dm-parent-tips')
    assert.ok(tips)
    assert.equal(nodes(tips).filter(node => node.type === 'li').length, 3)
    const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : typeof node === 'string' ? node : ''
    for (const value of Object.values(copy)) assert.ok(text(tips).includes(value))
    assert.ok(nodes(tips).some(node => node.type === 'CircleCheck'))
    assert.ok(nodes(tips).some(node => node.type === 'Lightbulb'))
    nodes(tree).find(node => node.props.className === 'dm-stage-action').props.onClick()
    tree = view.render(4)
    assert.ok(!nodes(tree).some(node => node.props.className === 'dm-tip dm-parent-tips'))
    assert.ok(!nodes(view.render(4, 'doctor')).some(node => node.props.className === 'dm-tip dm-parent-tips'))
  }
})

test('drafts are editable but excluded from progress; age navigation can stay or discard and Save scopes skill IDs', async () => {
  for (const language of ['en', 'ar']) {
    let allowed = false, discarded = 0, savedIds
    const storage = { drafts: {}, discard() { discarded++; storage.drafts = {} }, save(ids) { savedIds = ids } }
    const view = await session(language, {}, { storage, window: { confirm: () => allowed } })
    nodes(view.render(2)).find(node => node.props.className === 'dm-stage-action').props.onClick()
    assert.equal(nodes(view.render(2)).find(node => node.props.className === 'dm-manual-save').props.children[0].props.disabled, true)
    storage.drafts = { '2m-social-settle': { answer: 'yes', note: 'Unsaved note' } }
    let tree = view.render(2)
    assert.equal(nodes(tree).filter(node => node.type === 'progress')[0].props.value, 0)
    assert.ok(nodes(tree).some(node => node.type === 'textarea' && node.props.value === 'Unsaved note'))
    const saveButton = nodes(tree).find(node => node.props.className === 'dm-manual-save').props.children[0]
    assert.equal(saveButton.props.disabled, false)
    saveButton.props.onClick()
    assert.equal(savedIds.length, 11)
    assert.ok(savedIds.every(id => id.startsWith('2m-')))
    nodes(tree).find(node => node.props.className === 'dm-back').props.onClick()
    assert.ok(view.render(2).props.className.includes('dm-details'))
    const beforeDiscard = discarded
    allowed = true
    nodes(tree).find(node => node.props.className === 'dm-back').props.onClick()
    tree = view.render(2)
    assert.equal(tree.props.className, 'dm')
    assert.equal(discarded, beforeDiscard + 1)
    assert.equal(nodes(tree).find(node => node.type === 'progress').props.value, 0)
  }
})

test('leave guard protects application navigation, links, indexed browser Back and reload, then cleans up', async () => {
  const browser = new EventTarget(), document = new EventTarget()
  let approved = false, pushes = 0, prompted = 0
  const moves = [], effects = []
  browser.confirm = () => { prompted++; return approved }
  browser.history = { state: { idx: 5 }, go: delta => moves.push(delta) }
  browser.location = { href: 'http://nomu.test/mother/children/adam/milestones', origin: 'http://nomu.test', pathname: '/mother/children/adam/milestones', search: '' }
  const push = () => { pushes++ }
  const navigator = { push, replace() {}, go() {} }
  const view = await session('en', {}, { effects, window: browser, document, navigation: { navigator } })
  view.MilestoneLeaveGuard({ dirty: true, saving: false, message: 'Unsaved' })
  const cleanup = effects.pop()()
  navigator.push('/mother')
  assert.equal(pushes, 0)
  const reload = new Event('beforeunload', { cancelable: true })
  browser.dispatchEvent(reload)
  assert.equal(reload.defaultPrevented, true)
  const pop = new Event('popstate')
  Object.defineProperty(pop, 'state', { value: { idx: 4 } })
  browser.dispatchEvent(pop)
  assert.deepEqual(moves, [1])
  browser.dispatchEvent(new Event('popstate'))
  const click = new Event('click', { cancelable: true })
  Object.defineProperties(click, { button: { value: 0 }, target: { value: { closest: () => ({ href: 'http://nomu.test/mother', target: '', hasAttribute: () => false }) } } })
  document.dispatchEvent(click)
  assert.equal(click.defaultPrevented, true)
  approved = true
  navigator.push('/mother')
  assert.equal(pushes, 1)
  assert.ok(prompted >= 3)
  cleanup()
  assert.equal(navigator.push, push)
  const cleanReload = new Event('beforeunload', { cancelable: true })
  browser.dispatchEvent(cleanReload)
  assert.equal(cleanReload.defaultPrevented, false)
})

test('routed milestone visits reopen their skills age and delegate protected Back without resetting the preview', async () => {
  for (const language of ['en', 'ar']) {
    const destinations = []
    const view = await session(language, {}, { milestones: { age: 18, preview: 18, changeAge: age => destinations.push(age) } })
    const tree = view.render(36)
    assert.ok(tree.props.className.includes('dm-details'))
    assert.ok(nodes(tree).some(node => node.type === 'h3' && String(node.props.id).includes('18m-')))
    nodes(tree).find(node => node.props.className === 'dm-back').props.onClick()
    assert.deepEqual(destinations, [null])
    const timeline = await session(language, {}, { milestones: { age: null, preview: 18 } })
    assert.equal(nodes(timeline.render(36)).filter(node => node.props.className === 'dm-timeline-node')[6].props['aria-pressed'], true)
    let allow = false
    const guardedDestinations = []
    const guarded = await session(language, {}, { window: { confirm: () => allow }, storage: { drafts: { '18m-social-check': { note: 'Unsaved' } }, discard() {} }, milestones: { age: 18, preview: 18, changeAge: age => guardedDestinations.push(age) } })
    nodes(guarded.render(36)).find(node => node.props.className === 'dm-back').props.onClick()
    assert.deepEqual(guardedDestinations, [])
    allow = true
    nodes(guarded.render(36)).find(node => node.props.className === 'dm-back').props.onClick()
    assert.deepEqual(guardedDestinations, [null])
  }
})
