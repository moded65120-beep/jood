import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test, { after } from 'node:test'
import { createServer, transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'
import * as dates from '../src/utils/growthDates.js'
import * as chartData from '../src/utils/growthChartData.js'
// Use the application's JSON module pipeline rather than native Node JSON imports.
const vite = await createServer({ server: { middlewareMode: true } })
after(() => vite.close())
const { loadWhoReference } = await vite.ssrLoadModule('/src/utils/whoReferenceLoader.js')

const child = { id: 'test-child', dateOfBirth: '2022-01-01', sex: 'female' }
const measurement = (measurementDate, overrides = {}) => ({ childId: child.id, measurementDate, weightKg: 5.75, heightCm: 73.5, headCircumferenceCm: 43.8, measurementMethod: 'recumbent_length', ...overrides })

test('date-only age handles leap days, month ends and DST boundaries', () => {
  assert.equal(dates.ageInDays('2020-02-28', '2020-03-01'), 2)
  assert.equal(dates.ageInDays('2021-02-28', '2021-03-01'), 1)
  assert.equal(dates.ageInDays('2024-01-31', '2024-02-29'), 29)
  assert.equal(dates.ageInDays('2024-03-09', '2024-03-11'), 2)
  assert.equal(dates.ageInDays('2024-11-02', '2024-11-04'), 2)
  assert.equal(dates.ageInDays('2024-01-01', '2024-01-01'), 0)
  for (const value of ['2023-02-29', '2024-04-31', '2024-13-01', '2024-00-01', '', undefined]) assert.equal(dates.dateOrdinal(value), null)
})

test('actual third birthday is inclusive, including Feb-29 anniversary policy', () => {
  for (const [birth, end, next, maxDays] of [
    ['2019-03-01', '2022-03-01', '2022-03-02', 1096],
    ['2020-03-01', '2023-03-01', '2023-03-02', 1095],
    ['2020-02-29', '2023-02-28', '2023-03-01', 1095],
  ]) {
    assert.equal(dates.thirdBirthday(birth), end)
    assert.equal(dates.ageInDays(birth, end), maxDays)
    assert.equal(dates.isSupportedMeasurementDate(birth, birth), true)
    assert.equal(dates.isSupportedMeasurementDate(birth, end), true)
    assert.equal(dates.isSupportedMeasurementDate(birth, next), false)
  }
  assert.equal(dates.isSupportedMeasurementDate('2022-01-01', '2021-12-31'), false)
})

test('both sexes and all indicators use every exact official daily curve value', async () => {
  for (const sex of ['male', 'female']) {
    for (const [metric, config] of Object.entries(chartData.GROWTH_METRICS)) {
      const data = await loadWhoReference(config.indicator, sex)
      assert.equal(data.sex, sex)
      assert.equal(data.indicator, config.indicator)
      const graph = chartData.buildGrowthChartData(data, { ...child, sex }, [], metric)
      assert.equal(graph.maxAgeDays, 1096)
      assert.equal(graph.rows.length, 1097)
      for (const row of graph.rows) {
        for (const score of [-3, -2, 0, 2, 3]) assert.equal(row[`sd${score}`], data.rows[row.ageDays].zScores[String(score)])
      }
    }
  }
  assert.notEqual((await loadWhoReference('wfa', 'male')).rows[0].M, (await loadWhoReference('wfa', 'female')).rows[0].M)
  await assert.rejects(loadWhoReference('wfa', 'unknown'))
  assert.equal(chartData.buildGrowthChartData(await loadWhoReference('wfa', 'male'), child, [], 'weightKg'), null)
})

test('one point stays one; multiple and same-day points preserve raw dates and chronological order', async () => {
  const data = await loadWhoReference('wfa', 'female')
  const first = measurement('2022-06-15')
  const second = measurement('2022-08-15', { weightKg: 6.125 })
  const sameDay = measurement('2022-06-15', { weightKg: 5.875 })
  const single = chartData.buildGrowthChartData(data, child, [first], 'weightKg')
  assert.equal(single.points.length, 1)
  assert.equal(single.rows.filter((row) => row.childValue !== null).length, 1)
  assert.equal(single.points[0].ageDays, dates.ageInDays(child.dateOfBirth, first.measurementDate))
  assert.equal(single.points[0].value, 5.75)
  const graph = chartData.buildGrowthChartData(data, child, [second, first, sameDay], 'weightKg')
  assert.deepEqual(graph.points.map((point) => point.measurementDate), [first.measurementDate, sameDay.measurementDate, second.measurementDate])
  assert.deepEqual(graph.points.map((point) => point.value), [5.75, 5.875, 6.125])
  assert.equal(graph.rows.filter((row) => row.childValue !== null).length, 3)
})

test('WHO day-730/731 transition remains separate and applies only official method adjustments', async () => {
  const data = await loadWhoReference('lhfa', 'female')
  const before = measurement('2024-01-01', { measurementMethod: 'standing_height' })
  const after = measurement('2024-01-02')
  const original = structuredClone([before, after])
  assert.equal(dates.ageInDays(child.dateOfBirth, before.measurementDate), 730)
  assert.equal(dates.ageInDays(child.dateOfBirth, after.measurementDate), 731)
  const graph = chartData.buildGrowthChartData(data, child, [before, after], 'heightCm')
  assert.equal(graph.points[0].adjustmentCm, 0.7)
  assert.equal(graph.points[1].adjustmentCm, -0.7)
  assert.ok(Math.abs(graph.points[0].value - 74.2) < 1e-10)
  assert.ok(Math.abs(graph.points[1].value - 72.8) < 1e-10)
  assert.deepEqual([before, after], original)
  const d730 = graph.rows.find((row) => row.ageDays === 730)
  const d731 = graph.rows.find((row) => row.ageDays === 731)
  for (const score of [-3, -2, 0, 2, 3]) {
    assert.equal(d730[`sd${score}Height`], null)
    assert.equal(d731[`sd${score}Length`], null)
    assert.equal(d730[`sd${score}Length`], data.rows[730].zScores[String(score)])
    assert.equal(d731[`sd${score}Height`], data.rows[731].zScores[String(score)])
  }
  assert.equal(d730.childHeight, null)
  assert.equal(d731.childLength, null)
  assert.equal(chartData.plotMeasurement(measurement('2024-01-01'), child, 'heightCm').adjustmentCm, 0)
  assert.equal(chartData.plotMeasurement(measurement('2024-01-02', { measurementMethod: 'standing_height' }), child, 'heightCm').adjustmentCm, 0)
  assert.equal(chartData.plotMeasurement(measurement('2024-01-01', { measurementMethod: undefined }), child, 'heightCm'), null)
})

test('records outside age range, wrong child, invalid numbers or invalid dates are not plotted', async () => {
  const data = await loadWhoReference('wfa', 'female')
  const records = [measurement('2025-01-02'), measurement('2021-12-31'), measurement('2022-02-30'), measurement('2022-06-15', { childId: 'other' }), measurement('2022-06-15', { weightKg: Infinity })]
  assert.equal(chartData.buildGrowthChartData(data, child, records, 'weightKg').points.length, 0)
  assert.equal(chartData.buildGrowthChartData(data, child, [measurement('2025-01-01')], 'weightKg').points[0].ageDays, 1096)
  assert.equal(24 * chartData.WHO_DAYS_PER_MONTH, 730.5)
})

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  return [tree, ...nodes(tree.props?.children)]
}

async function chartHost(language = 'en', measurements = [], selectedChild = child) {
  const dictionary = language === 'ar' ? ar : en
  let cursor = 0
  const states = []
  let previousDeps, cleanup
  const bindings = {
    ...chartData, ...dates, loadWhoReference, _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment,
    useLanguage: () => ({ language, t: (key) => key.split('.').reduce((value, part) => value[part], dictionary) }),
    useId: () => 'test-chart', useMemo: (factory) => factory(),
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], (next) => { states[index] = next }] },
    useEffect(effect, deps) { if (!previousDeps || deps.some((value, index) => value !== previousDeps[index])) { cleanup?.(); cleanup = effect(); previousDeps = deps } },
    ...Object.fromEntries(['CartesianGrid', 'ComposedChart', 'Line', 'ResponsiveContainer', 'Tooltip', 'XAxis', 'YAxis'].map((name) => [name, name])),
  }
  let { code } = await transformWithOxc(await readFile(new URL('../src/components/child-health/GrowthChart.jsx', import.meta.url), 'utf8'), 'GrowthChart.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace(/export default /g, '')
  const components = new Function(...Object.keys(bindings), code + '\nreturn { GrowthChart, GrowthTooltip }')(...Object.values(bindings))
  const render = async () => {
    cursor = 0; components.GrowthChart({ child: selectedChild, measurements })
    await new Promise((resolve) => setImmediate(resolve))
    cursor = 0; return nodes(components.GrowthChart({ child: selectedChild, measurements }))
  }
  return { render, tooltip: components.GrowthTooltip }
}

test('English and Arabic render translated tabs, units, legends, empty states and correct series', async () => {
  for (const language of ['en', 'ar']) {
    const dictionary = language === 'ar' ? ar : en
    const app = await chartHost(language)
    let tree = await app.render()
    assert.equal(tree[0].props.dir, language === 'ar' ? 'rtl' : 'ltr')
    assert.equal(tree.filter((node) => node.props.role === 'tab' && node.props['aria-selected']).length, 1)
    assert.ok(tree.some((node) => node.props.children === dictionary.growth.noMeasurements))
    assert.equal(tree.filter((node) => node.type === 'Line').length, 6)
    for (const key of ['sdMinus3', 'sdMinus2', 'sdMedian', 'sdPlus2', 'sdPlus3']) assert.ok(tree.some((node) => node.type === 'Line' && node.props.name === dictionary.growth[key]))
    for (const metric of ['heightCm', 'headCircumferenceCm', 'weightKg']) {
      tree.find((node) => node.props.id === `test-chart-${metric}`).props.onClick()
      tree = await app.render()
      assert.ok(tree.find((node) => node.props.id === `test-chart-${metric}`).props['aria-selected'])
      assert.ok(tree.some((node) => node.props.children === dictionary.growth[metric]))
      assert.equal(tree.filter((node) => node.type === 'Line').length, metric === 'heightCm' ? 12 : 6)
    }
    const xAxis = tree.find((node) => node.type === 'XAxis')
    assert.equal(xAxis.props.tickFormatter(730.5), new Intl.NumberFormat(language).format(24))
  }
})

test('localized tooltips show real date, exact days, raw decimal, unit and explicit method adjustment', async () => {
  const data = await loadWhoReference('lhfa', 'female')
  const record = measurement('2024-01-01', { measurementMethod: 'standing_height' })
  const graph = chartData.buildGrowthChartData(data, child, [record], 'heightCm')
  for (const language of ['en', 'ar']) {
    const dictionary = language === 'ar' ? ar : en
    const app = await chartHost(language)
    const tree = nodes(app.tooltip({ active: true, payload: [{ payload: graph.rows[730] }], points: graph.points, metric: 'heightCm' }))
    const content = JSON.stringify(tree)
    for (const expected of [dictionary.growth.measurementDate, dates.formatGrowthDate(record.measurementDate, language), dictionary.growth.measuredValue, dictionary.growth.cm, dictionary.growth.whoAdjustment, dictionary.growth.standing_height]) assert.ok(content.includes(expected), expected)
    assert.ok(content.includes(new Intl.NumberFormat(language).format(73.5)))
  }
})

test('tooltips order exact WHO values highest to lowest for every metric and locale', async () => {
  const scores = [3, 2, 0, -2, -3]
  const labels = ['sdPlus3', 'sdPlus2', 'sdMedian', 'sdMinus2', 'sdMinus3']
  for (const language of ['en', 'ar']) {
    const dictionary = language === 'ar' ? ar : en
    const app = await chartHost(language)
    const format = new Intl.NumberFormat(language, { maximumSignificantDigits: 21, useGrouping: false })
    for (const sex of ['male', 'female']) {
      for (const [metric, config] of Object.entries(chartData.GROWTH_METRICS)) {
        const data = await loadWhoReference(config.indicator, sex)
        // Include both sides of the length/height transition.
        for (const day of [730, 731]) {
          const record = measurement(day === 730 ? '2024-01-01' : '2024-01-02')
          const graph = chartData.buildGrowthChartData(data, { ...child, sex }, [record], metric)
          const tree = nodes(app.tooltip({ active: true, payload: [{ payload: graph.rows[day] }], points: graph.points, metric }))
          const referenceRows = tree.filter((node) => node.type === 'p' && Array.isArray(node.props.children) && labels.some((label) => node.props.children[0] === dictionary.growth[label]))
          assert.deepEqual(referenceRows.map((node) => node.props.children.join('')), scores.map((score, index) => `${dictionary.growth[labels[index]]}: ${format.format(data.rows[day].zScores[String(score)])} ${dictionary.growth[config.unitKey]}`))
          assert.ok(JSON.stringify(tree).includes(dictionary.growth.childMeasurements))
          assert.ok(JSON.stringify(tree).includes(format.format(record[metric])))
        }
      }
    }
  }
})

test('Doctor page saves immediately, preserves session history and passes it to the shared chart', async () => {
  let cursor = 0
  const states = []
  const bindings = {
    _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment,
    NotebookPen: 'note-icon', GrowthNotesPanel: 'notes-panel', GrowthDoctorNotes: 'GrowthDoctorNotes', Card: 'Card', LanguageSwitcher: 'LanguageSwitcher', GrowthMeasurementForm: 'GrowthMeasurementForm', GrowthChart: 'GrowthChart',
    formatGrowthDate: dates.formatGrowthDate, useRef: () => ({ current: null }),
    useLanguage: () => ({ language: 'en', t: (key) => key.split('.').reduce((value, part) => value[part], en) }),
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next }] },
  }
  let { code } = await transformWithOxc(await readFile(new URL('../src/pages/doctor/DoctorGrowthChart.jsx', import.meta.url), 'utf8'), 'DoctorGrowthChart.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace(/export default /g, '')
  const Page = new Function(...Object.keys(bindings), code + '\nreturn DoctorGrowthChart')(...Object.values(bindings))
  const render = () => { cursor = 0; return nodes(Page()) }
  let tree = render()
  assert.equal(tree.find((node) => node.type === 'GrowthChart').props.measurements.length, 0)
  const sampleChild = tree.find((node) => node.type === 'GrowthChart').props.child
  for (const record of [measurement('2025-01-15', { childId: sampleChild.id }), measurement('2025-02-15', { childId: sampleChild.id, weightKg: 6.125 })]) {
    tree.find((node) => node.type === 'GrowthMeasurementForm').props.onSave(record)
    tree = render()
  }
  assert.equal(tree.find((node) => node.type === 'GrowthChart').props.measurements.length, 2)
  assert.ok(tree.some((node) => node.props.children === en.growth.latestEntry))
  assert.ok(tree.some((node) => node.props.children === '6.125'))
  assert.ok(tree.some((node) => node.props.role === 'status'))
})


test('development WHO imports match Vite JavaScript responses for all six datasets', async () => {
  const transformed = await vite.transformRequest('/src/utils/whoReferenceLoader.js')
  const imports = [...transformed.code.matchAll(/import\(([^)]+)\)/g)]
  assert.equal(imports.length, 6)
  for (const [, argument] of imports) {
    // Parsing a single URL also rejects native JSON attributes, which break browsers.
    const url = JSON.parse(argument)
    assert.match(url, /\/reference\/(wfa|lhfa|hcfa)-(male|female)\.json\?import$/)
    const response = await vite.transformRequest(url)
    assert.match(response.code, /export default/)
  }
})

test('saved points and exact daily curves survive tab changes for boys and girls', async () => {
  for (const sex of ['male', 'female']) {
    const selectedChild = { ...child, sex }
    const record = measurement('2022-06-15')
    const app = await chartHost('en', [record], selectedChild)
    for (const metric of ['weightKg', 'heightCm', 'headCircumferenceCm', 'weightKg']) {
      let tree = await app.render()
      tree.find((node) => node.props.id === 'test-chart-' + metric).props.onClick()
      tree = await app.render()
      assert.ok(!tree.some((node) => node.props.children === en.growth.referenceUnavailable))
      const rows = tree.find((node) => node.type === 'ComposedChart').props.data
      const day = dates.ageInDays(selectedChild.dateOfBirth, record.measurementDate)
      const dataset = await loadWhoReference(chartData.GROWTH_METRICS[metric].indicator, sex)
      assert.equal(rows[day].sd0, dataset.rows[day].zScores['0'])
      assert.equal(rows[day].childValue, record[metric])
      assert.equal(rows.filter((row) => row.childValue !== null).length, 1)
    }
  }
})
