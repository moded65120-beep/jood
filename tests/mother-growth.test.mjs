import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'
import * as dates from '../src/utils/growthDates.js'
import * as chartData from '../src/utils/growthChartData.js'
import * as insights from '../src/utils/growthInsights.js'
import { lmsValue, measurementZScore } from '../src/utils/whoZScores.js'

const child = { id: 'mother-test', name: { en: 'Sample child', ar: 'طفل افتراضي' }, sex: 'female', dateOfBirth: '2024-01-01' }
const record = (measurementDate, overrides = {}) => ({ childId: child.id, measurementDate, weightKg: 7.3, heightCm: 66.2, headCircumferenceCm: 42.5, measurementMethod: 'recumbent_length', ...overrides })
const loadWhoReference = async (indicator, sex) => JSON.parse(await readFile(new URL(`../src/data/who/reference/${indicator}-${sex}.json`, import.meta.url), 'utf8'))
const flush = () => new Promise((resolve) => setTimeout(resolve, 20))

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  return [tree, ...nodes(tree.props?.children)]
}
const textOf = (tree) => {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree)
  if (Array.isArray(tree)) return tree.map(textOf).join('')
  return tree && typeof tree === 'object' ? textOf(tree.props?.children) : ''
}

// Component handler/effect host, matching the project's existing test approach.
// Charts are composed below using the actual page props and actual chart handlers.
async function host(path, component, language = 'en', overrides = {}) {
  const dictionary = language === 'ar' ? ar : en
  let cursor = 0
  const states = [], effects = []
  const pending = []
  const bindings = {
    ...dates, ...chartData, ...insights,
    _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment,
    GrowthDoctorNotes: 'GrowthDoctorNotes', Card: 'Card', GrowthChart: 'GrowthChart', GrowthInsights: 'GrowthInsights', LanguageSwitcher: 'LanguageSwitcher',
    ...Object.fromEntries(['CartesianGrid', 'ComposedChart', 'Line', 'ResponsiveContainer', 'Tooltip', 'XAxis', 'YAxis'].map((name) => [name, name])),
    useLanguage: () => ({ language, t: (key) => key.split('.').reduce((value, part) => value?.[part], dictionary) }),
    useId: () => 'mother-test-id', useMemo: (factory) => factory(),
    useState(initial) {
      const index = cursor++
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
      return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next }]
    },
    useEffect(effect, deps) {
      const index = cursor++
      const previous = effects[index]
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
        previous?.cleanup?.()
        effects[index] = { deps, cleanup: effect() }
      }
    },
    loadWhoReference(indicator, sex) {
      const promise = loadWhoReference(indicator, sex)
      pending.push(promise)
      return promise
    },
    ...overrides,
  }
  let { code } = await transformWithOxc(await readFile(new URL(path, import.meta.url), 'utf8'), path)
  code = code.replace(/^import .*;?\r?\n/gm, '').replace(/export default /g, '')
  bindings.useMotherPageState = (_, initial) => bindings.useState(initial)
  const Component = new Function(...Object.keys(bindings), code + `\nreturn ${component}`)(...Object.values(bindings))
  return {
    render(props) { cursor = 0; return nodes(Component(props)) },
    async settled() { await Promise.allSettled(pending.splice(0)); await new Promise((resolve) => setImmediate(resolve)) },
  }
}

test('latest summaries sort by measurement date, keep raw values and exclude other children', async () => {
  const early = record('2024-03-01', { weightKg: 5.123456789 })
  const late = record('2025-04-01', { weightKg: 10.125, heightCm: 78.25, headCircumferenceCm: 46.125 })
  const records = [late, early, record('2025-06-01', { childId: 'other' })]
  const before = structuredClone(records)
  for (const language of ['en', 'ar']) {
    const app = await host('../src/pages/mother/MotherGrowthChart.jsx', 'MotherGrowthChart', language)
    const tree = app.render({ child, measurements: records })
    const content = textOf(tree[0])
    assert.equal(tree[0].props.dir, language === 'ar' ? 'rtl' : 'ltr')
    assert.ok(content.includes(child.name[language]))
    assert.ok(content.includes(dates.formatGrowthDate(child.dateOfBirth, language)))
    assert.ok(content.includes(dates.formatCalendarAge(dates.calendarAge(child.dateOfBirth, dates.localDateString()), language)))
    assert.ok(content.includes(dates.formatGrowthDate(late.measurementDate, language)))
    assert.ok(content.includes(dates.formatCalendarAge(dates.calendarAge(child.dateOfBirth, late.measurementDate), language)))
    for (const value of [10.125, 78.25, 46.125]) assert.ok(content.includes(new Intl.NumberFormat(language).format(value)))
    assert.equal(tree.some((node) => ['form', 'input', 'select', 'textarea', 'button'].includes(node.type)), false)
    assert.equal(tree.some((node) => /GrowthMeasurementForm|Edit|Delete/.test(String(node.type))), false)
    assert.equal(tree.find((node) => node.type === 'GrowthChart').props.measurements.length, 2)
  }
  assert.deepEqual(records, before)
  assert.equal(insights.latestMeasurement(child, records), late)
})

test('all sex/indicator combinations use exact WHO scores and latest valid records', async () => {
  for (const sex of ['male', 'female']) for (const [metric, { indicator }] of Object.entries(chartData.GROWTH_METRICS)) {
    const selected = { ...child, sex }
    const dataset = await loadWhoReference(indicator, sex)
    const date = '2024-07-01'
    const row = dataset.rows[dates.ageInDays(child.dateOfBirth, date)]
    for (const [score, expected] of [[0, 'median'], [1, 'above'], [-1, 'below'], [3.5, 'review'], [-3.5, 'review'], [7, 'review']]) {
      const latest = record(date, { [metric]: lmsValue(score, row) })
      const invalidLater = record('2025-01-01', { [metric]: -1 })
      const records = [latest, record('2024-03-01'), invalidLater]
      const result = insights.buildGrowthInsight(dataset, selected, records, metric)
      assert.equal(result.status, 'ready')
      assert.equal(result.position, expected)
      assert.equal(result.latest, latest)
      assert.equal(result.assessment.zScore, measurementZScore(dataset, selected, latest, metric).zScore)
      assert.equal(result.hasExcludedRecords, true)
    }
  }
})

test('one or multiple measurements describe the latest point without inventing a trend', async () => {
  const dataset = await loadWhoReference('wfa', child.sex)
  const latest = record('2024-07-01')
  const single = insights.buildGrowthInsight(dataset, child, [latest], 'weightKg')
  const multiple = insights.buildGrowthInsight(dataset, child, [latest, record('2024-03-01')], 'weightKg')
  assert.equal(single.position, multiple.position)
  assert.equal(single.assessment.zScore, multiple.assessment.zScore)
  assert.equal('trend' in multiple, false)
})

test('empty, invalid and missing-reference cases never yield an interpretation', async () => {
  const dataset = await loadWhoReference('wfa', child.sex)
  assert.equal(insights.buildGrowthInsight(dataset, child, [], 'weightKg').status, 'empty')
  for (const invalid of [
    record('2024-02-30'), record('2027-01-02'), record('2023-12-31'), record('2999-01-01'),
    record('2024-07-01', { weightKg: NaN }), record('2024-07-01', { weightKg: 0 }), record('2024-07-01', { weightKg: '7.3' }),
  ]) assert.equal(insights.buildGrowthInsight(dataset, child, [invalid], 'weightKg').status, 'invalid')
  const valid = [record('2024-07-01')]
  for (const unavailable of [null, { ...dataset, sex: 'male' }, { ...dataset, indicator: 'lhfa' }, { ...dataset, rows: [] }]) {
    const result = insights.buildGrowthInsight(unavailable, child, valid, 'weightKg')
    assert.equal(result.status, 'unavailable')
    assert.equal(result.position, undefined)
  }
  assert.equal(insights.buildGrowthInsight(dataset, child, [record('2024-07-01', { measurementMethod: undefined })], 'heightCm').status, 'invalid')
})

test('length method adjustments are reused and raw insight values stay unchanged', async () => {
  const dataset = await loadWhoReference('lhfa', child.sex)
  const entry = record('2024-07-01', { heightCm: 65.5, measurementMethod: 'standing_height' })
  const result = insights.buildGrowthInsight(dataset, child, [entry], 'heightCm')
  assert.equal(result.assessment.adjustmentCm, 0.7)
  assert.equal(result.assessment.rawValue, 65.5)
  assert.equal(entry.heightCm, 65.5)
})

test('page, actual chart handlers and insights stay synchronized in both languages and sexes', async () => {
  for (const language of ['en', 'ar']) for (const sex of ['male', 'female']) {
    const dictionary = language === 'ar' ? ar : en
    const selected = { ...child, sex }
    const props = { child: selected, measurements: [record('2024-07-01'), record('2024-03-01')] }
    const page = await host('../src/pages/mother/MotherGrowthChart.jsx', 'MotherGrowthChart', language)
    const chart = await host('../src/components/child-health/GrowthChart.jsx', 'GrowthChart', language)
    const insight = await host('../src/components/mother/GrowthInsights.jsx', 'GrowthInsights', language)
    for (const metric of ['weightKg', 'heightCm', 'headCircumferenceCm', 'weightKg']) {
      let pageTree = page.render(props)
      let chartTree = chart.render(pageTree.find((node) => node.type === 'GrowthChart').props)
      chartTree.find((node) => node.props.id === `mother-test-id-${metric}`).props.onClick()
      pageTree = page.render(props)
      const chartProps = pageTree.find((node) => node.type === 'GrowthChart').props
      const insightProps = pageTree.find((node) => node.type === 'GrowthInsights').props
      assert.equal(chartProps.selectedMetric, metric)
      assert.equal(insightProps.metric, metric)
      chart.render(chartProps); insight.render(insightProps)
      await Promise.all([chart.settled(), insight.settled()])
      chartTree = chart.render(chartProps)
      const insightTree = insight.render(insightProps)
      assert.equal(insightTree[0].props.dir, language === 'ar' ? 'rtl' : 'ltr')
      assert.ok(textOf(insightTree[0]).includes(dictionary.growth[metric + 'Tab']))
      const dataset = await loadWhoReference(chartData.GROWTH_METRICS[metric].indicator, sex)
      const result = insights.buildGrowthInsight(dataset, selected, props.measurements, metric)
      assert.ok(textOf(insightTree[0]).includes(dictionary.motherGrowth[metric][result.position]))
      assert.ok(textOf(insightTree[0]).includes(dictionary.motherGrowth.disclaimer))
      assert.equal(chartTree.filter((node) => node.type === 'Line').length, metric === 'heightCm' ? 12 : 6)
      const rows = chartTree.find((node) => node.type === 'ComposedChart').props.data
      assert.equal(rows.filter((row) => row.childValue !== null).length, 2)
      const days = rows.filter((row) => row.childValue !== null).map((row) => row.ageDays)
      assert.deepEqual(days, [...days].sort((a, b) => a - b))
      assert.equal(rows[days[1]].sd0, dataset.rows[days[1]].zScores['0'])
    }
  }
})

test('insights localize loading/error/empty/invalid states and contain no doctor controls', async () => {
  for (const language of ['en', 'ar']) {
    const dictionary = language === 'ar' ? ar : en
    const app = await host('../src/components/mother/GrowthInsights.jsx', 'GrowthInsights', language, {
      loadWhoReference: () => Promise.reject(new Error('offline')),
    })
    const props = { child, measurements: [record('2024-07-01')], metric: 'weightKg' }
    let tree = app.render(props)
    assert.ok(textOf(tree[0]).includes(dictionary.common.loading))
    await flush()
    tree = app.render(props)
    assert.ok(textOf(tree[0]).includes(dictionary.motherGrowth.unavailable))
    assert.equal(tree.some((node) => ['form', 'input', 'button'].includes(node.type)), false)
    tree = app.render({ ...props, measurements: [] })
    assert.ok(textOf(tree[0]).includes(dictionary.motherGrowth.empty))
    tree = app.render({ ...props, measurements: [record('2027-01-02')] })
    assert.ok(textOf(tree[0]).includes(dictionary.motherGrowth.invalid))
  }
})

test('stale WHO responses cannot replace the selected indicator insight', async () => {
  const pending = []
  const app = await host('../src/components/mother/GrowthInsights.jsx', 'GrowthInsights', 'en', {
    loadWhoReference: (indicator, sex) => new Promise((resolve) => pending.push(async () => resolve(await loadWhoReference(indicator, sex)))),
  })
  const props = { child, measurements: [record('2024-07-01')] }
  app.render({ ...props, metric: 'weightKg' })
  app.render({ ...props, metric: 'heightCm' })
  await pending[1](); await flush()
  await pending[0](); await flush()
  const tree = app.render({ ...props, metric: 'heightCm' })
  const dataset = await loadWhoReference('lhfa', child.sex)
  const result = insights.buildGrowthInsight(dataset, child, props.measurements, 'heightCm')
  assert.ok(textOf(tree[0]).includes(en.motherGrowth.heightCm[result.position]))
  assert.ok(!textOf(tree[0]).includes(en.motherGrowth.unavailable))
})

test('mother page handles missing child and empty or unusable measurement summaries', async () => {
  const app = await host('../src/pages/mother/MotherGrowthChart.jsx', 'MotherGrowthChart')
  let tree = app.render({})
  assert.ok(textOf(tree[0]).includes(en.motherGrowth.childUnavailable))
  assert.ok(!tree.some((node) => node.type === 'GrowthChart'))
  tree = app.render({ child, measurements: [] })
  assert.ok(textOf(tree[0]).includes(en.motherGrowth.empty))
  tree = app.render({ child, measurements: [null, record('2027-01-02')] })
  assert.ok(textOf(tree[0]).includes(en.motherGrowth.invalidMeasurements))
})

test('controlled keyboard tabs update the parent selection and respect RTL', async () => {
  for (const language of ['en', 'ar']) {
    const app = await host('../src/components/child-health/GrowthChart.jsx', 'GrowthChart', language)
    let metric = 'weightKg'
    let focused = -1
    const props = () => ({ child, measurements: [], selectedMetric: metric, onMetricChange: (next) => { metric = next } })
    let tree = app.render(props())
    const event = (key) => ({ key, preventDefault() {}, currentTarget: { parentElement: { children: [0, 1, 2].map((index) => ({ focus() { focused = index } })) } } })
    tree.find((node) => node.props.role === 'tab' && node.props['aria-selected']).props.onKeyDown(event('ArrowRight'))
    assert.equal(metric, language === 'ar' ? 'headCircumferenceCm' : 'heightCm')
    assert.equal(focused, language === 'ar' ? 2 : 1)
    tree = app.render(props())
    tree.find((node) => node.props.role === 'tab' && node.props['aria-selected']).props.onKeyDown(event('Home'))
    assert.equal(metric, 'weightKg')
    await app.settled()
  }
})
