import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import fs from 'node:fs'
import test from 'node:test'
import { transformWithOxc } from 'vite'
import * as jsx from 'react/jsx-runtime'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'
import { GROWTH_METRICS } from '../src/utils/growthChartData.js'
import { evaluateGrowthMeasurement } from '../src/utils/growthWarnings.js'
import { calendarAge, formatCalendarAge, dateOrdinal, localDateString, thirdBirthday } from '../src/utils/growthDates.js'

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  return [tree, ...nodes(tree.props?.children)]
}

async function form(dateOfBirth = '2024-06-15', method = 'recumbent_length', unavailable = false) {
  const states = []
  const saved = []
  let cursor = 0
  let effectStarted = false
  let dictionary = en
  let { code } = await transformWithOxc(await readFile(new URL('../src/components/doctor/GrowthMeasurementForm.jsx', import.meta.url), 'utf8'), 'GrowthMeasurementForm.jsx')
  code = code.replace(/^import .*;?\r?\n/gm, '').replace(/export default /g, '')
  const bindings = {
    _jsx: jsx.jsx, _jsxs: jsx.jsxs, Input: 'input', Button: 'button',
    calendarAge, formatCalendarAge, dateOrdinal, localDateString, thirdBirthday, GROWTH_METRICS, evaluateGrowthMeasurement,
    useEffect(effect) { if (!effectStarted) { effectStarted = true; effect() } },
    async loadWhoReference(indicator, sex) {
      if (unavailable) throw new Error('Unavailable')
      return JSON.parse(fs.readFileSync(new URL('../src/data/who/reference/' + indicator + '-' + sex + '.json', import.meta.url), 'utf8'))
    },
    useLanguage: () => ({ language: dictionary === en ? 'en' : 'ar', t: (key) => key.split('.').reduce((value, part) => value[part], dictionary) }),
    useState(initial) {
      const index = cursor++
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
      return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next }]
    },
  }
  const Component = new Function(...Object.keys(bindings), code + '\nreturn GrowthMeasurementForm')( ...Object.values(bindings))
  const render = () => { cursor = 0; return nodes(Component({ child: { id: 'test', dateOfBirth, sex: 'female' }, onSave: (value) => saved.push(value) })) }
  const api = {
    saved, render,
    confirm() { for (const node of render().filter((node) => node.props.type === 'checkbox')) node.props.onChange({ target: { checked: true } }) },
    arabic() { dictionary = ar },
    change(name, value) { render().find((node) => node.props.name === name).props.onChange({ target: { name, value } }) },
    submit() { render().find((node) => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { elements: { namedItem: () => ({ focus() {} }) } } }) },
  }
  if (method) api.change('measurementMethod', method)
  render()
  await new Promise((resolve) => setImmediate(resolve))
  return api
}

test('dot and comma decimals save unchanged with one submission', async () => {
  for (const inputs of [['8.75', '73.5', '43.8'], ['8,75', '73,5', '43,8'], ['8.123456789', '73.56789', '43.87654']]) {
    const app = await form()
    app.change('measurementDate', '2025-06-15')
    ;['weightKg', 'heightCm', 'headCircumferenceCm'].forEach((key, index) => app.change(key, inputs[index]))
    app.submit()
    assert.equal(app.saved.length, 1)
    assert.deepEqual(['weightKg', 'heightCm', 'headCircumferenceCm'].map((key) => app.saved[0][key]), inputs.map((value) => Number(value.replace(',', '.'))))
    assert.ok(app.render().filter((node) => node.props.inputMode === 'decimal').every((node) => node.props.type === 'text'))
  }
})

test('measurement form no longer embeds notes and the Save button retains its styling hook', async () => {
  const app = await form()
  app.change('measurementDate', '2025-06-15')
  app.change('weightKg', '8.75'); app.change('heightCm', '73.5'); app.change('headCircumferenceCm', '43.8')
  assert.ok(!app.render().some(node => node.props.name === 'doctorNote'))
  app.submit()
  assert.equal(app.saved[0].doctorNote, undefined)
  assert.equal(app.saved[0].childId, 'test')
  assert.equal(app.render().find(node => node.props.type === 'submit').props.className, 'growth-measurement-form__save')
  app.submit()
  assert.equal(app.saved[1].doctorNote, undefined)
})

test('invalid values and dates block saving and errors translate', async () => {
  const app = await form()
  app.change('heightCm', '73.5'); app.change('headCircumferenceCm', '43.8')
  for (const value of ['', ' ', '0', '-1', 'NaN', 'Infinity', '1e3', '0x10', '4abc', '1,2.3', '1,2,3', '1 2', '9'.repeat(400)]) {
    app.change('weightKg', value); app.submit()
    assert.equal(app.saved.length, 0)
    assert.ok(app.render().find((node) => node.props.name === 'weightKg').props['aria-invalid'])
  }
  app.arabic()
  assert.ok(app.render().some((node) => node.props.children === ar.growth.positiveNumber))
  app.change('weightKg', '5.75')
  for (const value of ['2024-06-14', '2999-01-01', '2025-02-30', '']) {
    app.change('measurementDate', value); app.submit()
    assert.ok(app.render().find((node) => node.props.name === 'measurementDate').props['aria-invalid'])
    assert.equal(app.saved.length, 0)
  }
})

test('flagged values require per-field confirmation, reset on edits, and translate', async () => {
  const app = await form()
  app.change('measurementDate', '2025-06-15')
  app.change('weightKg', '8.75'); app.change('heightCm', '73.5'); app.change('headCircumferenceCm', '4')
  assert.equal(app.render().filter((node) => node.props.type === 'checkbox').length, 1)
  assert.ok(app.render().some((node) => node.props.children === en.growth.warningPotentialError))
  app.submit()
  assert.equal(app.saved.length, 0)
  app.confirm(); app.submit()
  assert.equal(app.saved.length, 1)
  assert.equal(app.saved[0].headCircumferenceCm, 4)
  app.change('headCircumferenceCm', '4.1'); app.submit()
  assert.equal(app.saved.length, 1)
  app.arabic()
  assert.ok(app.render().some((node) => node.props.children === ar.growth.warningPotentialError))
  assert.ok(app.render().some((node) => Array.isArray(node.props.children) && node.props.children.includes(ar.growth.warningConfirmation)))
  app.confirm()
  app.change('measurementDate', '2025-06-14'); app.submit()
  assert.equal(app.saved.length, 1)
  app.change('headCircumferenceCm', '43,8'); app.submit()
  assert.equal(app.saved[1].headCircumferenceCm, 43.8)
  assert.equal(app.render().some((node) => node.props.type === 'checkbox'), false)
})

test('missing references show a neutral localized notice and allow raw saving', async () => {
  const app = await form('2024-06-15', 'recumbent_length', true)
  app.change('measurementDate', '2025-06-15')
  app.change('weightKg', '8.75'); app.change('heightCm', '73.5'); app.change('headCircumferenceCm', '4')
  assert.ok(app.render().some((node) => node.props.children === en.growth.warningUnavailable))
  app.arabic()
  assert.ok(app.render().some((node) => node.props.children === ar.growth.warningUnavailable))
  assert.equal(app.render().some((node) => node.props.type === 'checkbox'), false)
  app.submit()
  assert.equal(app.saved[0].headCircumferenceCm, 4)
})

test('clinical review is distinct from potential error and method edits reset height review', async () => {
  const app = await form()
  app.change('measurementDate', '2025-06-15')
  app.change('weightKg', '8.75'); app.change('heightCm', '95'); app.change('headCircumferenceCm', '43.8')
  app.confirm()
  assert.equal(app.render().find((node) => node.props.name === 'review-heightCm').props.checked, true)
  app.change('measurementMethod', 'standing_height')
  assert.equal(app.render().find((node) => node.props.name === 'review-heightCm').props.checked, false)
  app.submit()
  assert.equal(app.saved.length, 0)
  app.confirm(); app.submit()
  assert.equal(app.saved[0].heightCm, 95)
  app.change('heightCm', '73.5')
  app.change('weightKg', '5.75')
  assert.ok(app.render().some((node) => node.props.children === en.growth.warningClinicalReview))
  assert.ok(!app.render().some((node) => node.props.children === en.growth.warningPotentialError))
  app.arabic()
  assert.ok(app.render().some((node) => node.props.children === ar.growth.warningClinicalReview))
})

test('supported measurement age includes birth and third birthday but excludes later dates', async () => {
  for (const [birth, end] of [['2020-06-15', '2023-06-15'], ['2020-02-29', '2023-02-28']]) {
    const app = await form(birth)
    app.change('weightKg', '5.75'); app.change('heightCm', '73.5'); app.change('headCircumferenceCm', '43.8')
    assert.equal(app.render().find((node) => node.props.name === 'measurementDate').props.max, end)
    for (const value of [birth, end]) {
      app.change('measurementDate', value); app.confirm(); app.submit()
    }
    assert.equal(app.saved.length, 2)
    app.change('measurementDate', birth === '2020-02-29' ? '2023-03-01' : '2023-06-16'); app.submit()
    assert.equal(app.saved.length, 2)
    assert.ok(app.render().some((node) => node.props.children === en.growth.ageRange))
    app.arabic()
    assert.ok(app.render().some((node) => node.props.children === ar.growth.ageRange))
  }
})

test('measurement display preserves significant digits in both languages', () => {
  for (const language of ['en', 'ar']) {
    const formatter = new Intl.NumberFormat(language, { maximumSignificantDigits: 21, useGrouping: false })
    assert.equal(formatter.formatToParts(5.123456789).find((part) => part.type === 'fraction').value.length, 9)
  }
})

test('actual measurement method is required and preserved alongside raw decimals', async () => {
  const app = await form('2024-06-15', null)
  app.change('measurementDate', '2025-06-15')
  app.change('weightKg', '5,75'); app.change('heightCm', '73,5'); app.change('headCircumferenceCm', '43,8')
  app.submit()
  assert.equal(app.saved.length, 0)
  assert.ok(app.render().some((node) => node.props.children === en.growth.methodRequired))
  app.change('measurementMethod', 'standing_height'); app.confirm(); app.submit()
  assert.equal(app.saved.length, 1)
  assert.equal(app.saved[0].heightCm, 73.5)
  assert.equal(app.saved[0].measurementMethod, 'standing_height')
})

test('calendar age handles month ends, leap anniversaries and invalid dates', () => {
  for (const [birth, measured, expected] of [
    ['2024-06-15', '2024-10-23', { years: 0, months: 4, days: 8 }],
    ['2023-01-31', '2023-02-28', { years: 0, months: 1, days: 0 }],
    ['2024-01-31', '2024-02-29', { years: 0, months: 1, days: 0 }],
    ['2024-01-31', '2024-03-30', { years: 0, months: 1, days: 30 }],
    ['2024-01-31', '2024-03-31', { years: 0, months: 2, days: 0 }],
    ['2024-02-29', '2025-02-28', { years: 1, months: 0, days: 0 }],
    ['2024-02-29', '2025-03-01', { years: 1, months: 0, days: 1 }],
    ['2023-02-28', '2024-02-29', { years: 1, months: 0, days: 1 }],
    ['2024-06-15', '2024-06-15', { years: 0, months: 0, days: 0 }],
    ['2024-06-15', '2027-06-15', { years: 3, months: 0, days: 0 }],
  ]) assert.deepEqual(calendarAge(birth, measured), expected)
  for (const date of ['', '2025-02-29', '2024-04-31', '2024-06-14', undefined]) assert.equal(calendarAge('2024-06-15', date), null)
  assert.equal(calendarAge('invalid', '2024-06-15'), null)
})

test('measurement age updates below date input and formats in English and Arabic', async () => {
  const app = await form()
  const ageNode = () => app.render().find((node) => node.props.id === 'growth-measurement-age')
  app.change('measurementDate', '2024-10-23')
  assert.equal(ageNode().props.children.join(''), 'Age at Measurement: 4 months and 8 days')
  const field = app.render().find((node) => node.props.name === 'measurementDate')
  assert.ok(field.props['aria-describedby'].includes('growth-measurement-age'))
  app.change('measurementDate', '2025-07-16')
  assert.equal(ageNode().props.children.join(''), 'Age at Measurement: 1 year, 1 month, and 1 day')
  app.arabic()
  assert.equal(ageNode().props.children.join(''), ar.growth.ageAtMeasurement + ': ' + formatCalendarAge({ years: 1, months: 1, days: 1 }, 'ar'))
  app.change('measurementDate', '2024-10-23')
  // Arabic's default digits can vary with the runtime's ICU locale data.
  assert.match(ageNode().props.children.join(''), /^العمر وقت القياس: [4٤] أشهر و[8٨] أيام$/)
  for (const date of ['', '2025-02-30', '2024-06-14']) {
    app.change('measurementDate', date)
    assert.equal(ageNode(), undefined)
  }
  assert.equal(formatCalendarAge(null, 'en'), '')
  assert.equal(formatCalendarAge({ years: 0, months: 0, days: 0 }, 'en'), '0 days')
})

test('warning copy matches the requested short English and Arabic messages', () => {
  assert.equal(en.growth.warningClinicalReview, 'This measurement is outside the usual WHO reference range. Please review it.')
  assert.equal(en.growth.warningPotentialError, 'This measurement is highly unusual. Please verify the value and unit.')
  assert.equal(ar.growth.warningClinicalReview, 'هذا القياس خارج النطاق المرجعي المعتاد لمنظمة الصحة العالمية. يرجى مراجعته.')
  assert.equal(ar.growth.warningPotentialError, 'هذا القياس غير معتاد بدرجة كبيرة. يرجى التأكد من القيمة ووحدة القياس.')
  assert.notEqual(en.growth.warningClinicalReview, en.growth.warningPotentialError)
  assert.notEqual(ar.growth.warningClinicalReview, ar.growth.warningPotentialError)
})
