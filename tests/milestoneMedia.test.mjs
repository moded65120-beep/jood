import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import * as jsx from 'react/jsx-runtime'
import { transformWithOxc } from 'vite'
import { ageMedia, skillMedia } from '../src/components/child-health/milestoneMedia.js'
import en from '../src/locales/en/translations.js'
import ar from '../src/locales/ar/translations.js'

const source = await readFile(new URL('../src/components/child-health/DevelopmentalMilestones.jsx', import.meta.url), 'utf8')
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : []

async function load(name, bindings) {
  const functionSource = source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))?.[0]
  assert.ok(functionSource, name)
  const transformed = await transformWithOxc(`export default ${functionSource}`, 'milestoneMedia.jsx')
  const code = transformed.code.replace(/^import .*;?\r?\n/gm, '').replace('export default ', '')
  const cropBindings = name === 'milestoneMediaCrop' ? {} : { milestoneMediaCrop: await load('milestoneMediaCrop', {}) }
  const runtime = { ...cropBindings, _jsx: jsx.jsx, _jsxs: jsx.jsxs, _Fragment: jsx.Fragment, ...bindings }
  return new Function(...Object.keys(runtime), code + `\nreturn ${name}`)(...Object.values(runtime))
}

async function mediaHost() {
  const states = []
  let cursor = 0
  const MediaPreview = () => null
  const Media = await load('Media', {
    useState(initial) {
      const index = cursor++
      if (!(index in states)) states[index] = initial
      return [states[index], next => { states[index] = next }]
    },
    useLanguage: () => ({ language: 'en', t: key => key.split('.').reduce((value, part) => value[part], en) }),
    milestoneText: await load('milestoneText', {}),
    MediaPreview, Play: 'play-icon', ZoomIn: 'zoom-icon', Baby: 'baby-icon', Sparkles: 'sparkles-icon',
  })
  return { MediaPreview, render(item, age = false) { cursor = 0; return Media({ item, age, label: 'Skill', text: 'Skill media coming soon' }) } }
}

test('all mapped videos remain clickable with missing or absent posters and open the existing preview', async () => {
  const videos = Object.entries(skillMedia).filter(([, item]) => item.mediaType === 'video')
  assert.equal(videos.length, 41)
  for (const [id, item] of videos) {
    const host = await mediaHost()
    let tree = host.render(item)
    const poster = nodes(tree).find(node => node.type === 'img')
    if (poster) poster.props.onError()
    tree = host.render(item)
    assert.ok(!nodes(tree).some(node => node.props.className?.includes('dm-placeholder')), id)
    assert.ok(!nodes(tree).some(node => node.type === 'img'), id)
    assert.ok(nodes(tree).some(node => node.type === 'play-icon'), id)
    const button = nodes(tree).find(node => node.type === 'button')
    assert.equal(button.props['aria-haspopup'], 'dialog', id)
    assert.equal(button.props['aria-label'], 'Open media preview: Skill', id)
    button.props.onClick()
    const preview = nodes(host.render(item)).find(node => node.type === host.MediaPreview)
    assert.equal(preview.props.item.mediaSrc, item.mediaSrc, id)
    preview.props.onDismiss()
    assert.ok(!nodes(host.render(item)).some(node => node.type === host.MediaPreview), id)
  }
})

test('images retain zoom previews and genuine image failures retain the existing fallback', async () => {
  for (const item of Object.values(skillMedia).filter(item => item.mediaType === 'image')) {
    const host = await mediaHost()
    let tree = host.render(item)
    assert.equal(nodes(tree).find(node => node.type === 'img').props.src, item.mediaSrc)
    assert.ok(nodes(tree).some(node => node.type === 'zoom-icon'))
    nodes(tree).find(node => node.type === 'button').props.onClick()
    assert.equal(nodes(host.render(item)).find(node => node.type === host.MediaPreview).props.item, item)
    nodes(tree).find(node => node.type === 'img').props.onError()
    tree = host.render(item)
    assert.ok(nodes(tree).some(node => node.props.className?.includes('dm-placeholder')))
  }
  const host = await mediaHost()
  const age = { mediaType: 'image', mediaSrc: '/milestones/ages/2-months.jpeg' }
  assert.equal(host.render(age, true).type, 'img')
})

test('video preview passes the original MP4 to the player and preserves playback controls', async () => {
  const MilestoneVideo = await load('MilestoneVideo', {
    useLanguage: () => ({ language: 'en', t: key => key.split('.').reduce((value, part) => value[part], en) }),
    milestoneText: await load('milestoneText', {}),
    useRef: () => ({ current: null }), useImperativeHandle() {}, useEffect() {},
    useState: initial => [initial, () => {}], resetPreviewVideo() {}, Play: 'play-icon', Pause: 'pause-icon',
  })
  for (const item of Object.values(skillMedia).filter(item => item.mediaType === 'video')) {
    const tree = MilestoneVideo({ src: item.mediaSrc, label: 'Skill', poster: item.posterSrc, cropBottom: item.videoCropBottom })
    const video = nodes(tree).find(node => node.type === 'video')
    assert.equal(video.props.src, item.mediaSrc)
    assert.equal(typeof video.props.onError, 'function')
    assert.ok(nodes(tree).some(node => node.type === 'button' && node.props.onClick))
    assert.ok(nodes(tree).some(node => node.type === 'input' && node.props.type === 'range'))
    const viewport = nodes(tree).find(node => node.props.className === 'dm-video-viewport')
    const crop = (await load('milestoneMediaCrop', {}))(item.mediaSrc)
    assert.equal(viewport.props.style['--dm-video-visible'], 1 - (crop ? crop.bottom / crop.height : (item.videoCropBottom || 0)))
    assert.ok(!nodes(viewport).some(node => node.props.className === 'dm-player-controls'))
    assert.ok(!nodes(viewport).some(node => node.type === 'figcaption'))
  }
})

test('every supplied 6-, 9- and 12-month asset maps once to an existing skill and every media URL resolves to a real file', async () => {
  const definitions = JSON.parse(source.slice(source.indexOf('const definitions = ') + 'const definitions = '.length, source.indexOf('const categories = ')).trim())
  for (const [age, count, videoCount] of [[6, 12, 6], [9, 13, 9], [12, 10, 9]]) {
    const entries = Object.entries(skillMedia).filter(([id]) => id.startsWith(age + 'm-'))
    assert.equal(entries.length, count)
    assert.equal(entries.filter(([, media]) => media.mediaType === 'video').length, videoCount)
    assert.equal(definitions[age].length, 4)
    for (const [id, media] of entries) {
      assert.ok(definitions[age].flat().includes(id), id)
      assert.ok(en.childHealth.milestones.skills[id]?.description, id)
      assert.ok(ar.childHealth.milestones.skills[id]?.description, id)
      assert.ok(media.mediaSrc.startsWith('/milestones/skills/' + age + '-months/'), id)
      if (media.mediaType === 'video') assert.deepEqual((await load('milestoneMediaCrop', {}))(media.mediaSrc), { width: 1280, height: 720, bottom: 112 })
      else assert.equal(media.videoCropBottom, undefined)
    }
    const files = (await readdir(new URL('../public/milestones/skills/' + age + '-months/', import.meta.url))).filter(file => /\.(mp4|png|jpe?g|webp)$/i.test(file))
    assert.deepEqual(entries.map(([, media]) => media.mediaSrc.split('/').at(-1)).sort(), files.sort())
  }
  const paths = Object.values(skillMedia).map(media => media.mediaSrc)
  assert.equal(new Set(paths).size, paths.length)
  for (const media of [...Object.values(skillMedia), ...Object.values(ageMedia)]) {
    const url = new URL('../public' + media.mediaSrc, import.meta.url)
    await access(url)
    assert.equal(decodeURI(encodeURI(media.mediaSrc)), media.mediaSrc)
  }
  assert.equal(Object.keys(skillMedia).filter(id => /^[24]m-/.test(id)).length, 24)
  assert.ok(Object.entries(skillMedia).filter(([id]) => /^[24]m-/.test(id)).every(([, media]) => media.videoCropBottom === undefined))
})

test('source attribution is visible below the player in Arabic and English while video metadata adapts its viewport aspect', async () => {
  for (const language of ['en', 'ar']) {
    const dictionary = language === 'ar' ? ar : en
    const states = []
    let cursor = 0
    const MilestoneVideo = await load('MilestoneVideo', {
      useLanguage: () => ({ language, t: key => key.split('.').reduce((value, part) => value[part], dictionary) }),
      milestoneText: await load('milestoneText', {}), useRef: () => ({ current: null }),
      useImperativeHandle() {}, useEffect() {},
      useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value }] },
      resetPreviewVideo() {}, Play: 'play-icon', Pause: 'pause-icon',
    })
    const render = () => { cursor = 0; return MilestoneVideo({ src: '/example.mp4', label: 'Skill', cropBottom: 0.15 }) }
    let tree = render()
    const caption = nodes(tree).find(node => node.type === 'figcaption')
    assert.equal(caption.props.dir, 'ltr')
    const link = nodes(caption).find(node => node.type === 'a')
    assert.equal(link.props.children, 'Source: CDC — cdc.gov/Milestones')
    assert.equal(link.props.href, 'https://www.cdc.gov/Milestones')
    const video = nodes(tree).find(node => node.type === 'video')
    video.props.onLoadedMetadata({ currentTarget: { duration: 15, videoWidth: 640, videoHeight: 480 } })
    tree = render()
    assert.equal(nodes(tree).find(node => node.props.className === 'dm-video-viewport').props.style['--dm-video-aspect'], 640 / 480)
    assert.equal(nodes(tree).find(node => node.type === 'input' && node.props.type === 'range').props.max, 15)
  }
})

test('6-, 9- and 12-month image previews clip only the inspected bottom strip and keep attribution outside the frame', async () => {
  const cropFor = await load('milestoneMediaCrop', {})
  const boundaries = new Set()
  for (const language of ['en', 'ar']) {
    const dictionary = language === 'ar' ? ar : en
    const MediaPreview = await load('MediaPreview', {
      useLanguage: () => ({ language, t: key => key.split('.').reduce((value, part) => value[part], dictionary) }),
      milestoneText: await load('milestoneText', {}), useRef: () => ({ current: null }),
      useState: initial => [initial, () => {}], useEffect() {}, createPortal: node => node,
      document: { body: {} }, X: 'close-icon', MilestoneVideo: 'milestone-video',
    })
    for (const item of Object.values(skillMedia).filter(item => item.mediaType === 'image')) {
      const crop = cropFor(item.mediaSrc)
      const tree = MediaPreview({ item, label: 'Skill', onDismiss() {} })
      const image = nodes(tree).find(node => node.type === 'img')
      assert.equal(image.props.src, item.mediaSrc)
      const frame = nodes(tree).find(node => node.props.className === 'dm-cropped-image-frame')
      if (!crop) {
        assert.equal(frame, undefined)
        assert.equal(image.props.className, 'dm-media-modal-image')
        continue
      }
      boundaries.add(crop.bottom)
      assert.equal(crop.width, 800)
      assert.equal(crop.height, 800)
      assert.ok(crop.bottom >= 120 && crop.bottom <= 144)
      assert.equal(frame.props.style['--dm-image-aspect'], crop.width / (crop.height - crop.bottom))
      assert.ok(!nodes(frame).some(node => node.type === 'figcaption'))
      assert.equal(nodes(tree).find(node => node.type === 'a').props.children, 'Source: CDC — cdc.gov/Milestones')
    }
  }
  assert.ok(boundaries.size > 1)
  for (const [id, item] of Object.entries(skillMedia).filter(([id]) => /^[24]m-/.test(id))) {
    assert.equal(cropFor(item.mediaSrc), null, id)
  }
})

test('cropped videos keep working play, seek and volume controls outside their clipping viewport', async () => {
  const element = { paused: true, volume: 1, muted: true, currentTime: 0, play() { this.paused = false }, pause() { this.paused = true } }
  const states = []
  let cursor = 0
  const MilestoneVideo = await load('MilestoneVideo', {
    useLanguage: () => ({ t: key => key.split('.').reduce((value, part) => value[part], en) }),
    milestoneText: await load('milestoneText', {}), useRef: () => ({ current: element }),
    useImperativeHandle() {}, useEffect() {}, resetPreviewVideo() {}, Play: 'play-icon', Pause: 'pause-icon',
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value }] },
  })
  const item = skillMedia['6m-movement-roll']
  const render = () => { cursor = 0; return MilestoneVideo({ src: item.mediaSrc, label: 'Skill', cropBottom: item.videoCropBottom }) }
  let tree = render()
  const video = nodes(tree).find(node => node.type === 'video')
  video.props.onLoadedMetadata({ currentTarget: { duration: 20, videoWidth: 1280, videoHeight: 720 } })
  tree = render()
  const frame = nodes(tree).find(node => node.props.className === 'dm-video-viewport')
  assert.equal(frame.props.style['--dm-video-visible'], (720 - 112) / 720)
  assert.ok(!nodes(frame).some(node => node.type === 'input' || node.type === 'button'))
  await nodes(tree).find(node => node.type === 'button').props.onClick()
  assert.equal(element.paused, false)
  nodes(tree).find(node => node.props.className === 'dm-player-progress').props.onChange({ target: { value: '7' } })
  assert.equal(element.currentTime, 7)
  const volume = nodes(tree).find(node => node.props.className === 'dm-player-volume')
  assert.equal(volume.props['aria-label'], 'Volume')
  volume.props.onChange({ target: { value: '0.4' } })
  assert.equal(element.volume, 0.4)
  assert.equal(element.muted, false)
})
