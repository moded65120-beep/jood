import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createUnifiedDemoAuth, unifiedAuthKey, loginUnifiedDemo, logoutUnifiedDemo, getUnifiedDemoUser } from './unifiedDemoAuth.js'
import { createDoctorDemoAuth, isDoctorAuthenticated, loginDoctorDemo } from './doctorDemoAuth.js'
import { createMotherDemoAuth, isMotherAuthenticated, loginMotherDemo } from './motherDemoAuth.js'
import en from '../locales/en/translations.js'
import ar from '../locales/ar/translations.js'

const values = new Map([['unrelated-medical-data', 'unchanged']])
const storage = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key) }
const auth = createUnifiedDemoAuth(storage, webcrypto)
for (const [id, role, password, route] of [
  ['1000000001', 'doctor', 'NomuDoctor123!', '/doctor'], ['2000000001', 'nurse', 'NomuNurse123!', '/doctor'],
  ['3000000001', 'mother', 'NomuMother123!', '/mother'], ['4000000001', 'father', 'NomuFather123!', '/mother'],
]) {
  const demoUser = await auth.login(id, 'Demo@1234')
  assert.equal(demoUser.role, role)
  assert.equal(demoUser.dashboard, route)
  assert.equal(createUnifiedDemoAuth(storage, webcrypto).getUser().id, id)
  if (role === 'nurse') assert.equal(demoUser.clinicalEditing, false)
  if (role === 'mother' || role === 'father') assert.equal(demoUser.familyScope, 'demo-mother-sara')
  assert.ok(!JSON.stringify([...values]).includes('Demo@1234'))
  // Preserve the previously working per-role demo passwords as well.
  const user = await auth.login(id, password)
  assert.equal(user.role, role); assert.equal(user.dashboard, route)
  assert.equal(new Set(values.keys()).has(unifiedAuthKey), true)
  assert.equal(values.get(unifiedAuthKey), id)
  assert.ok(!JSON.stringify([...values]).includes(password))
  assert.equal(createUnifiedDemoAuth(storage, webcrypto).getUser().role, role, 'Tab refresh restores the explicit authenticated identity')
  if (role === 'nurse') assert.equal(user.clinicalEditing, false)
  assert.equal(await auth.login(id, 'incorrect'), null)
  assert.equal(auth.getUser(), null)
}
assert.equal(await auth.login('1009999999', 'NomuDoctor123!'), null)
assert.equal(await auth.login('1009999999', 'Demo@1234'), null)
assert.equal(await auth.login('9990000001', 'Demo@1234'), null)
assert.equal(await auth.login('9990000001', 'NomuDoctor123!'), null)
assert.equal(await auth.login('1000000001', ''), null)
assert.equal(await auth.login('2000000001', 'NomuDoctor123!'), null, 'Role does not substitute for credentials')
values.set(unifiedAuthKey, JSON.stringify({ id: '2000000001', role: 'doctor' }))
assert.equal(createUnifiedDemoAuth(storage, webcrypto).getUser(), null, 'A forged role payload is not an account ID')
auth.logout(); assert.equal(auth.getUser(), null)
assert.equal(values.get('unrelated-medical-data'), 'unchanged')
const blocked = createUnifiedDemoAuth({ getItem() { throw Error() }, setItem() { throw Error() }, removeItem() { throw Error() } }, webcrypto)
assert.equal((await blocked.login('2000000001','NomuNurse123!')).role, 'nurse')
blocked.logout(); assert.equal(blocked.getUser(), null)
assert.equal(createDoctorDemoAuth(storage).login('9876543210','Doctor123!'), true)
assert.equal(createDoctorDemoAuth(storage).login('9876543210','wrong'), false)
assert.equal(createMotherDemoAuth(storage).login('1234567890','Demo123!'), true)
assert.equal(createMotherDemoAuth(storage).login('1234567890','wrong'), false)

const oldWindow = globalThis.window
globalThis.window = { sessionStorage: storage, localStorage: { getItem: () => 'en' }, dispatchEvent() {} }
try {
  logoutUnifiedDemo()
  assert.equal(isDoctorAuthenticated(), false); assert.equal(isMotherAuthenticated(), false)
  for (const [id,password,staff] of [['1000000001','NomuDoctor123!',true],['2000000001','NomuNurse123!',true],['3000000001','NomuMother123!',false],['4000000001','NomuFather123!',false]]) {
    assert.ok(await loginUnifiedDemo(id,password,staff ? 'doctor' : 'parent'))
    await loginUnifiedDemo(id,'Demo@1234',staff ? 'doctor' : 'parent')
    assert.equal(isDoctorAuthenticated(),staff); assert.equal(isMotherAuthenticated(),!staff)
    assert.equal(getUnifiedDemoUser().id,id)
  }
  await loginUnifiedDemo('1000000001','wrong','doctor')
  assert.equal(isDoctorAuthenticated(),false); assert.equal(isMotherAuthenticated(),false)
  assert.ok(loginDoctorDemo('9876543210','Doctor123!')); assert.equal(isDoctorAuthenticated(),true)
  assert.ok(loginMotherDemo('1234567890','Demo123!')); assert.equal(isMotherAuthenticated(),true)
  logoutUnifiedDemo(); assert.equal(isDoctorAuthenticated(),false); assert.equal(isMotherAuthenticated(),false)
} finally { globalThis.window = oldWindow }

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
// Catch literal question-mark substitution even when a file is valid UTF-8.
for (const group of [ar.home, ar.unifiedLogin]) {
  for (const value of Object.values(group)) {
    if (typeof value === 'string') assert.ok(!/\?{2,}|\uFFFD/.test(value), 'Arabic public copy must retain its Unicode characters')
  }
}
assert.equal(ar.home.heroHeading, '\u0646\u0645\u0648 \u0637\u0641\u0644\u0643\u060c \u0631\u0639\u0627\u064a\u062a\u0646\u0627')
try {
  const { LanguageProvider } = await server.ssrLoadModule('/src/contexts/LanguageContext.jsx')
  const { default: Home } = await server.ssrLoadModule('/src/pages/Home.jsx')
  for (const [language, dictionary] of Object.entries({ en, ar })) {
    globalThis.window = { localStorage: { getItem: () => language } }
    const html = renderToStaticMarkup(createElement(LanguageProvider, null, createElement(MemoryRouter, { initialEntries: [{ pathname: '/login', state: { audience: 'parent' } }] }, createElement(Home, { loginMode: true }))))
    assert.ok(!html.includes('<video'))
    assert.ok(html.includes(dictionary.unifiedLogin.userId))
    assert.ok(!/\?{2,}|\uFFFD/.test(html), 'Rendered public screens must not contain corrupted text')
    assert.equal((html.match(/class="language-switcher"/g) || []).length, 1)
    assert.ok(html.includes('id="unified-password"'))
    assert.ok(html.includes('type="password"'))
    assert.ok(html.includes(dictionary.unifiedLogin.login))
    assert.equal((html.match(/href="\/mother\/register"/g)||[]).length, 1)
    assert.ok(html.includes('dir="'+(language === 'ar' ? 'rtl' : 'ltr')+'"'))
    assert.ok(!html.includes('unifiedLogin.title'))
  }
  for (const [language, dictionary] of Object.entries({ en, ar })) {
    globalThis.window = { localStorage: { getItem: () => language } }
    const html = renderToStaticMarkup(createElement(LanguageProvider, null, createElement(MemoryRouter, null, createElement(Home))))
    const escaped = value => renderToStaticMarkup(createElement('span', null, value)).slice(6, -7)
    for (const key of ['heading','headingAccent','track','parent','doctor']) assert.ok(html.includes(escaped(dictionary.home.nemo[key])))
    assert.ok(html.includes(escaped(dictionary.publicNavigation.staff)))
    assert.ok(html.includes(escaped(dictionary.publicNavigation.parent)))
    assert.ok(html.includes(escaped(dictionary.publicNavigation.upAbout)))
    assert.ok(html.includes('images/home/nomu-family-pastel-preview.png'))
    assert.ok(!html.includes('home-services'))
    assert.ok(!/\?{2,}|\uFFFD/.test(html))
    assert.ok(html.includes('class="nemo-parent"'))
    assert.ok(html.includes('class="nemo-doctor"'))
    assert.equal((html.match(/class="language-switcher"/g) || []).length, 1)
    assert.deepEqual(readFileSync(new URL('../../public/images/home/nemo-family-flat.png', import.meta.url)).subarray(0,8), Buffer.from([137,80,78,71,13,10,26,10]))
  }
  assert.deepEqual(Object.keys(en.unifiedLogin),Object.keys(ar.unifiedLogin))
  assert.deepEqual(Object.keys(en.home),Object.keys(ar.home))
  const home = readFileSync(new URL('../pages/Home.jsx',import.meta.url),'utf8')
  assert.ok(home.includes('setPortalOpen(next)'))
  assert.ok(!home.includes("addEventListener('wheel'"), 'Normal homepage scrolling must not open a portal')
  assert.ok(!home.includes('onKeyDown='), 'Normal keyboard scrolling must not navigate')
  const { default: PortalSelection } = await server.ssrLoadModule('/src/components/common/PortalSelection.jsx')
  for (const [language, dictionary] of Object.entries({ en, ar })) {
    globalThis.window = { localStorage: { getItem: () => language } }
    const html = renderToStaticMarkup(createElement(LanguageProvider, null, createElement(MemoryRouter, null, createElement(PortalSelection, { active: true }))))
    assert.ok(html.includes(dictionary.home.portals.title))
    assert.ok(html.includes(dictionary.home.portals.family))
    assert.ok(html.includes(dictionary.home.portals.clinical))
    assert.equal((html.match(/href="\/login"/g) || []).length, 2, 'Both portal choices must retain trusted unified authentication')
  }
  const doctor = readFileSync(new URL('../pages/doctor/DoctorDashboard.jsx',import.meta.url),'utf8')
  assert.ok(doctor.includes("if (!canEditMedical) { setModal('permissions'); return }"))
  assert.ok(!doctor.includes('return patientId === selectedPatientId && medical.act'))
} finally { globalThis.window = oldWindow; await server.close() }
console.log('Four exact demo logins, wrong passwords/IDs/prefixes, role separation, nurse denial, protected-route predicates, legacy compatibility, logout, refresh, no stored passwords and bilingual welcome and unified login rendering passed')
