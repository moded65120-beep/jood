import assert from 'node:assert/strict'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import en from '../locales/en/translations.js'
import ar from '../locales/ar/translations.js'
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
const oldWindow = globalThis.window
try {
  const { LanguageProvider } = await server.ssrLoadModule('/src/contexts/LanguageContext.jsx')
  const { default: Home } = await server.ssrLoadModule('/src/pages/Home.jsx')
  const { default: PublicPage } = await server.ssrLoadModule('/src/pages/PublicPages.jsx')
  for (const [language, dictionary] of Object.entries({ en, ar })) {
    globalThis.window = { localStorage: { getItem: () => language } }
    const render = (component, props, state) => renderToStaticMarkup(h(LanguageProvider, null, h(MemoryRouter, { initialEntries: [{ pathname: props?.loginMode ? '/login' : '/', state }] }, h(component, props))))
    const home = render(Home)
    assert.ok(home.includes('nomu-logo-transparent-test.png'))
    assert.ok(home.includes(dictionary.publicNavigation.staff))
    assert.ok(home.includes(dictionary.publicNavigation.parent))
    assert.ok(!home.includes('class="nomu-public-start"'))
    assert.equal((home.match(/href="\/login"/g) || []).length, 2)
    assert.ok(home.includes('images/home/nomu-family-pastel-preview.png'))
    assert.ok(home.includes(dictionary.publicNavigation.upAbout))
    assert.ok(!home.includes('class="nemo-intro"'))
    assert.ok(!home.includes('Nemo is a medical platform'))
    for (const audience of ['doctor', 'parent']) {
      const login = render(Home, { loginMode: true }, { audience })
      assert.equal((login.match(/<img[^>]*nomu-logo-transparent-test\.png/g) || []).length, 1, 'Exactly one approved transparent logo for either login path')
      assert.ok(!login.includes('unified-login__brand'))
      assert.match(login, /<section class="unified-login"[^>]*><h1/)
      assert.ok(login.includes(dictionary.unifiedLogin.title))
      assert.ok(login.includes('id="unified-password"'))
      assert.equal((login.match(/href="\/mother\/register"/g) || []).length, audience === 'parent' ? 1 : 0, 'Registration is available in the Parent entry only')
    }
    for (const state of [undefined, {}, { audience: 'unknown' }]) {
      assert.ok(!render(Home, { loginMode: true }, state).includes('id="unified-password"'), 'Direct/missing/invalid category must return to Home, not offer an unrestricted login')
    }
    const role = render(PublicPage)
    assert.equal((role.match(/href="\/login"/g) || []).length, 2)
    assert.ok(role.includes(dictionary.publicNavigation.staff)); assert.ok(role.includes(dictionary.publicNavigation.parent))
    const about = render(PublicPage, { about: true })
    assert.ok(about.includes('nomu-logo-transparent-test.png'))
    assert.ok(about.includes('nomu-public-about-hero'))
    assert.ok(about.includes('images/home/nomu-family-pastel-preview.png'))
    const escaped = value => renderToStaticMarkup(h('span', null, value)).slice(6, -7)
    for (const key of ['aboutTitle', 'aboutHeadline', 'introduction', 'mission', 'offers', 'records', 'growth', 'appointments', 'downHome']) assert.ok(about.includes(escaped(dictionary.publicNavigation[key])))
    for (const html of [home, role, about]) {
      assert.ok(html.includes('nomu-logo-transparent-test.png'))
      assert.ok(html.includes(`dir="${language === 'ar' ? 'rtl' : 'ltr'}"`))
      assert.ok(!html.includes('publicNavigation.'))
    }
  }
  assert.deepEqual(Object.keys(en.publicNavigation), Object.keys(ar.publicNavigation))
  console.log('Home, role selection and About: official logo, preserved illustration, bilingual content/direction, two unified-login links and independent page content passed')
} finally { globalThis.window = oldWindow; await server.close() }
