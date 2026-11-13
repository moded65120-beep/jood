import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialPatients } from './patientData.js'
import { ASSESSMENT_STORAGE_KEY, validateAssessment, saveAssessment, assessmentsFor, loadAssessments, persistAssessments, voidAssessment } from './clinicalAssessmentData.js'
import en from '../../locales/en/translations.js'
import ar from '../../locales/ar/translations.js'
const patient = initialPatients[0]
const draft = { id: 'assessment-test', date: '2026-01-01', type: '', findings: '  ملاحظات عربية\nEnglish findings  ', diagnosis: 'Original clinical impression', plan: 'خطة الطبيب' }
assert.ok(Object.keys(validateAssessment({ ...draft, date: '', findings: ' ', diagnosis: '' }, patient)).length === 3)
assert.ok(validateAssessment({ ...draft, date: '2999-01-01' }, patient).date)
const original = JSON.stringify(initialPatients)
const saved = saveAssessment(initialPatients, patient.id, draft, 'Original Doctor')
assert.equal(saved[0].clinicalAssessments.length, 1)
assert.equal(saved[0].clinicalAssessments[0].findings, draft.findings)
assert.equal(saved[1], initialPatients[1])
assert.equal(saveAssessment(saved, patient.id, draft, 'Doctor'), saved)
const updated = saveAssessment(saved, patient.id, { ...draft, findings: 'Updated ملاحظات', type: 'general' }, 'Different Doctor', true)
assert.equal(updated[0].clinicalAssessments.length, 1)
assert.equal(updated[0].clinicalAssessments[0].id, draft.id)
assert.equal(updated[0].clinicalAssessments[0].doctor, 'Original Doctor')
assert.equal(updated[0].clinicalAssessments[0].patientId, patient.id)
assert.equal(saveAssessment(updated, initialPatients[1].id, draft, 'Doctor', true), updated)
assert.equal(JSON.stringify(initialPatients), original)
const map = new Map([['unrelated', 'keep']])
const storage = { getItem: key => map.get(key) ?? null, setItem: (key,value) => map.set(key,value) }
assert.ok(persistAssessments(updated, storage))
assert.deepEqual(loadAssessments(initialPatients, storage).patients[0].clinicalAssessments, updated[0].clinicalAssessments)
assert.equal(map.get('unrelated'), 'keep')
const beforeVoid = JSON.stringify(updated)
assert.equal(voidAssessment(updated, patient.id, draft.id, '  ', 'Doctor'), updated)
assert.equal(voidAssessment(updated, initialPatients[1].id, draft.id, 'Reason', 'Doctor'), updated)
const voided = voidAssessment(updated, patient.id, draft.id, '  Original reason  ', 'Acting Doctor', new Date('2026-10-21T10:30:00Z'))
const voidRecord = voided[0].clinicalAssessments[0]
assert.equal(voidRecord.status, 'voided')
assert.equal(voidRecord.voidReason, '  Original reason  ')
assert.equal(voidRecord.voidedBy, 'Acting Doctor')
assert.equal(voidRecord.voidedAt, '2026-10-21T10:30:00.000Z')
for (const [key,value] of Object.entries(updated[0].clinicalAssessments[0])) if (key !== 'status') assert.equal(voidRecord[key], value)
assert.equal(voided[0].clinicalAssessments.length, 1)
assert.equal(voided[1], updated[1])
assert.equal(JSON.stringify(updated), beforeVoid)
assert.equal(voidAssessment(voided, patient.id, draft.id, 'Again', 'Doctor'), voided)
assert.equal(saveAssessment(voided, patient.id, draft, 'Doctor', true), voided)
assert.ok(persistAssessments(voided, storage))
assert.deepEqual(loadAssessments(initialPatients, storage).patients[0].clinicalAssessments, voided[0].clinicalAssessments)
const legacy = { ...updated[0].clinicalAssessments[0] }; delete legacy.status
map.set(ASSESSMENT_STORAGE_KEY, JSON.stringify({ version: 1, assessments: [legacy] }))
assert.equal(loadAssessments(initialPatients, storage).patients[0].clinicalAssessments[0].status, 'active')
map.set(ASSESSMENT_STORAGE_KEY, '{')
assert.equal(loadAssessments(initialPatients, storage).warning, 'invalidStorage')
assert.equal(persistAssessments(updated, { setItem() { throw Error() } }), false)
assert.equal(assessmentsFor({ id: patient.id, clinicalAssessments: [{ ...updated[0].clinicalAssessments[0], date: '2025-01-01' }, { ...updated[0].clinicalAssessments[0], id: 'newer', date: '2026-02-01' }] })[0].id, 'newer')
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const previousWindow = globalThis.window
try {
 const { LanguageProvider } = await server.ssrLoadModule('/src/contexts/LanguageContext.jsx')
 const { default: Page } = await server.ssrLoadModule('/src/pages/doctor/ChildClinicalAssessment.jsx')
 const { default: VoidModal } = await server.ssrLoadModule('/src/components/doctor/VoidAssessmentModal.jsx')
 for (const [language,locale] of Object.entries({ en, ar })) {
  globalThis.window = { localStorage: { getItem: () => language } }
  const html = renderToStaticMarkup(createElement(LanguageProvider, null, createElement(Page, { patient: updated[0] })))
  assert.ok(html.includes(locale.doctor.clinicalAssessment.history))
  assert.ok(html.includes('dir="' + (language === 'ar' ? 'rtl' : 'ltr') + '"'))
  assert.ok(html.includes('Updated ملاحظات'))
  assert.ok(html.includes('dir="auto"'))
  assert.ok(!html.includes('doctor.clinicalAssessment.'))
  assert.ok(!html.includes('dmr-quick-actions'))
  assert.ok(html.includes(locale.doctor.clinicalAssessment.voidAction))
  const voidHtml = renderToStaticMarkup(createElement(LanguageProvider, null, createElement(Page, { patient: voided[0] })))
  assert.ok(voidHtml.includes(locale.doctor.clinicalAssessment.voided))
  assert.ok(!voidHtml.includes('dca-void-button'))
  assert.ok(!voidHtml.includes('>' + locale.doctor.clinicalAssessment.edit + '</button>'))
  assert.ok(voidHtml.includes(locale.doctor.clinicalAssessment.view))
  const confirmation = renderToStaticMarkup(createElement(LanguageProvider, null, createElement(VoidModal, { patient, assessment: updated[0].clinicalAssessments[0], onConfirm() {}, onClose() {} })))
  for (const key of ['voidTitle','voidWarning','voidReason','confirmVoid']) assert.ok(confirmation.includes(locale.doctor.clinicalAssessment[key]))
  assert.ok(confirmation.includes('required=""'))
  const empty = renderToStaticMarkup(createElement(LanguageProvider, null, createElement(Page, { patient })))
  assert.ok(empty.includes(locale.doctor.clinicalAssessment.empty))
 }
 assert.deepEqual(Object.keys(ar.doctor.clinicalAssessment), Object.keys(en.doctor.clinicalAssessment))
} finally { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; await server.close() }
console.log('Assessment validation, child isolation, duplicate prevention, edit identity, exact bilingual text, storage reload, invalid storage, history ordering and en/ar rendering passed')
