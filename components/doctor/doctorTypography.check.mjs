import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { formatDate } from './patientData.js'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const html = read('../../../index.html')
assert.equal((html.match(/fonts\.googleapis\.com\/css2\?/g) || []).length, 1, 'Reuse one existing font stylesheet')
assert.ok(html.includes('family=Cairo:wght@400;600;700'))
assert.ok(html.includes('family=Inter:wght@400;600;700'))
const typography = read('../../pages/doctor/DoctorTypography.css').replace(/\/\*[\s\S]*?\*\//g, '')
assert.ok(typography.includes("'Inter', 'Cairo', system-ui, sans-serif"), 'Arabic glyph fallback precedes system fonts')
assert.match(typography, /\.doctor-dashboard\[lang="ar"\]\s*\{\s*--dd-font-family:\s*'Cairo', 'Inter'/)
assert.ok(typography.includes('[dir="auto"]):dir(ltr)'))
assert.ok(typography.includes('[dir="auto"]):dir(rtl)'))
assert.equal(formatDate('2026-10-21', 'en'), '21 Oct 2026')
assert.equal(formatDate('2026-10-21', 'ar'), '\u0662\u0661 \u0623\u0643\u062a\u0648\u0628\u0631 \u0662\u0660\u0662\u0666')
// Date inputs retain ISO values and native browser controls.
for (const path of ['./NewMedicalVisitModal.jsx', './NewMedicalNoteModal.jsx', './FollowUpModal.jsx', '../../pages/doctor/ChildClinicalAssessment.jsx']) {
  assert.match(read(path), /type(?:=|:)\s*["']date["']/)
}
assert.ok(typography.includes('.doctor-dashboard[lang] :where(*)'), 'All doctor content and nested dialogs use the same families')
assert.ok(!typography.includes('@import'))
assert.ok(!typography.includes('@font-face'))
assert.ok(!typography.includes('url('))
for (const block of typography.matchAll(/\{([^{}]*)\}/g)) {
  for (const declaration of block[1].split(';').map(value => value.trim()).filter(Boolean)) {
    assert.match(declaration, /^(--dd-font-family|font-family|font-weight)\s*:/, 'Typography rules cannot change layout, colors or sizing')
  }
}
const dashboard = read('../../pages/doctor/DoctorDashboard.jsx')
assert.ok(dashboard.indexOf("import './DoctorTypography.css'") > dashboard.indexOf("import './DoctorDashboard.css'"))
console.log('Doctor typography scope, existing font imports, mixed-script fallback, loaded weights and layout-free declarations passed')
