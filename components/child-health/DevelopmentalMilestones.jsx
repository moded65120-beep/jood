import { canonicalChildId, demoMotherId } from '../../services/demoChildAccess.js'
import { useMilestonesStorage } from './useChildHealthStorage.js'
import { useContext, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import { UNSAFE_NavigationContext } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import { Baby, Heart, MessageCircle, Brain, Footprints, ArrowLeft, ArrowRight, Info, Lightbulb, Sparkles, Blocks, Play, Pause, X, ZoomIn, Star, CircleCheck } from 'lucide-react'
import { LanguageProvider, useLanguage } from '../../contexts/LanguageContext.jsx'
import './DevelopmentalMilestones.css'
import './VaccinationSchedule.css'
import { ageMedia, skillMedia } from './milestoneMedia.js'
import { ageFromBirthDate } from '../doctor/medicalRecordData.js'

function milestoneText(translate, key) {
  return translate(`childHealth.milestones.${key}`)
}

const definitions = {
  "2": [
    [
      "2m-social-settle",
      "2m-social-face",
      "2m-social-greet",
      "2m-social-smile"
    ],
    [
      "2m-language-sounds",
      "2m-language-loud"
    ],
    [
      "2m-cognitive-watch",
      "2m-cognitive-toy"
    ],
    [
      "2m-movement-head",
      "2m-movement-limbs",
      "2m-movement-hands"
    ]
  ],
  "4": [
    [
      "4m-social-smile",
      "4m-social-chuckle",
      "4m-social-attention"
    ],
    [
      "4m-language-coo",
      "4m-language-reply",
      "4m-language-voice"
    ],
    [
      "4m-cognitive-feed",
      "4m-cognitive-hands"
    ],
    [
      "4m-movement-head",
      "4m-movement-grip",
      "4m-movement-reach",
      "4m-movement-mouth",
      "4m-movement-elbows"
    ]
  ],
  "6": [
    [
      "6m-social-people",
      "6m-social-mirror",
      "6m-social-laugh"
    ],
    [
      "6m-language-turns",
      "6m-language-raspberry",
      "6m-language-squeal"
    ],
    [
      "6m-cognitive-explore",
      "6m-cognitive-reach",
      "6m-cognitive-full"
    ],
    [
      "6m-movement-roll",
      "6m-movement-push",
      "6m-movement-sit"
    ]
  ],
  "9": [
    [
      "9m-social-strangers",
      "9m-social-expressions",
      "9m-social-name",
      "9m-social-leaving",
      "9m-social-peekaboo"
    ],
    [
      "9m-language-babble",
      "9m-language-arms"
    ],
    [
      "9m-cognitive-search",
      "9m-cognitive-bang"
    ],
    [
      "9m-movement-situp",
      "9m-movement-transfer",
      "9m-movement-rake",
      "9m-movement-sit"
    ]
  ],
  "12": [
    [
      "12m-social-games"
    ],
    [
      "12m-language-wave",
      "12m-language-parent",
      "12m-language-no"
    ],
    [
      "12m-cognitive-container",
      "12m-cognitive-hidden"
    ],
    [
      "12m-movement-stand",
      "12m-movement-cruise",
      "12m-movement-cup",
      "12m-movement-pinch"
    ]
  ],
  "15": [
    [
      "15m-social-copy",
      "15m-social-show",
      "15m-social-clap",
      "15m-social-hugtoy",
      "15m-social-affection"
    ],
    [
      "15m-language-words",
      "15m-language-named",
      "15m-language-direction",
      "15m-language-point"
    ],
    [
      "15m-cognitive-use",
      "15m-cognitive-stack"
    ],
    [
      "15m-movement-steps",
      "15m-movement-food"
    ]
  ],
  "18": [
    [
      "18m-social-check",
      "18m-social-point",
      "18m-social-wash",
      "18m-social-book",
      "18m-social-dress"
    ],
    [
      "18m-language-words",
      "18m-language-direction"
    ],
    [
      "18m-cognitive-chores",
      "18m-cognitive-play"
    ],
    [
      "18m-movement-walk",
      "18m-movement-scribble",
      "18m-movement-cup",
      "18m-movement-fingers",
      "18m-movement-spoon",
      "18m-movement-climb"
    ]
  ],
  "24": [
    [
      "24m-social-feelings",
      "24m-social-reaction"
    ],
    [
      "24m-language-book",
      "24m-language-words",
      "24m-language-body",
      "24m-language-gestures"
    ],
    [
      "24m-cognitive-hands",
      "24m-cognitive-switch",
      "24m-cognitive-toys"
    ],
    [
      "24m-movement-kick",
      "24m-movement-run",
      "24m-movement-stairs",
      "24m-movement-spoon"
    ]
  ],
  "30": [
    [
      "30m-social-play",
      "30m-social-show",
      "30m-social-routine"
    ],
    [
      "30m-language-words",
      "30m-language-combine",
      "30m-language-name",
      "30m-language-pronouns"
    ],
    [
      "30m-cognitive-pretend",
      "30m-cognitive-solve",
      "30m-cognitive-steps",
      "30m-cognitive-color"
    ],
    [
      "30m-movement-twist",
      "30m-movement-undress",
      "30m-movement-jump",
      "30m-movement-pages"
    ]
  ],
  "36": [
    [
      "36m-social-settle",
      "36m-social-join"
    ],
    [
      "36m-language-conversation",
      "36m-language-questions",
      "36m-language-action",
      "36m-language-name",
      "36m-language-speech"
    ],
    [
      "36m-cognitive-circle",
      "36m-cognitive-hot"
    ],
    [
      "36m-movement-string",
      "36m-movement-dress",
      "36m-movement-fork"
    ]
  ]
}
const categories = [
  { id: 'social', Icon: Heart },
  { id: 'language', Icon: MessageCircle },
  { id: 'cognitive', Icon: Brain },
  { id: 'movement', Icon: Footprints },
]
const motherSkillContent = {
  "2m-social-settle": {
    "sentenceKey": "skills.2m-social-settle.motherSentence",
    "media": skillMedia["2m-social-settle"]
  },
  "2m-social-face": {
    "sentenceKey": "skills.2m-social-face.motherSentence",
    "media": skillMedia["2m-social-face"]
  },
  "2m-social-greet": {
    "sentenceKey": "skills.2m-social-greet.motherSentence",
    "media": skillMedia["2m-social-greet"]
  },
  "2m-social-smile": {
    "sentenceKey": "skills.2m-social-smile.motherSentence",
    "media": skillMedia["2m-social-smile"]
  },
  "2m-language-sounds": {
    "sentenceKey": "skills.2m-language-sounds.motherSentence",
    "explanationKey": "skills.2m-language-sounds.motherExplanation",
    "media": skillMedia["2m-language-sounds"]
  },
  "2m-language-loud": {
    "sentenceKey": "skills.2m-language-loud.motherSentence",
    "explanationKey": "skills.2m-language-loud.motherExplanation",
    "media": skillMedia["2m-language-loud"]
  },
  "2m-cognitive-watch": {
    "sentenceKey": "skills.2m-cognitive-watch.motherSentence",
    "explanationKey": "skills.2m-cognitive-watch.motherExplanation",
    "media": skillMedia["2m-cognitive-watch"]
  },
  "2m-cognitive-toy": {
    "sentenceKey": "skills.2m-cognitive-toy.motherSentence",
    "media": skillMedia["2m-cognitive-toy"]
  },
  "2m-movement-head": {
    "sentenceKey": "skills.2m-movement-head.motherSentence",
    "explanationKey": "skills.2m-movement-head.motherExplanation",
    "media": skillMedia["2m-movement-head"]
  },
  "2m-movement-limbs": {
    "sentenceKey": "skills.2m-movement-limbs.motherSentence",
    "media": skillMedia["2m-movement-limbs"]
  },
  "2m-movement-hands": {
    "sentenceKey": "skills.2m-movement-hands.motherSentence",
    "explanationKey": "skills.2m-movement-hands.motherExplanation",
    "media": skillMedia["2m-movement-hands"]
  }
}
const ages = [2, 4, 6, 9, 12, 15, 18, 24, 30, 36].map((months, index) => ({
  months, mediaType: 'image', mediaSrc: null, ...ageMedia[months], tone: index % 5,
  source: `https://www.cdc.gov/act-early/milestones/${months === 12 ? '1-year' : months === 24 ? '2-years' : months === 36 ? '3-years' : `${months}-months`}.html`,
  sections: definitions[months].map(skills => skills.map(id => ({
    id, mediaType: 'image', mediaSrc: null, ...skillMedia[id],
  }))),
}))
function milestoneMediaCrop(src) {
  if (!/^\/milestones\/skills\/(6|9|12)-months\//.test(src || '')) return null
  if (/\.mp4$/i.test(src)) return { width: 1280, height: 720, bottom: 112 }
  const bottoms = {
    '1-Year-Pulls-up-to-stand_2.png': 128,
    '6-Months_Knows-familiar-people-1.png': 128,
    '6-months_Leans-on-hands-to-support-herself-when-sitting.png': 128,
    '6-Months_Likes-to-look-at-self-in-a-mirror.png': 136,
    '6-Months_Pushes-up-with-straight-arms-when-on-tummy.png': 128,
    '6-Months_Puts-things-in-her-mouth-to-explore-them.png': 144,
    '6-Months_Reaches-to-grab-a-toy-she-wants.png': 136,
    '9-months-shows-several-facial-expressions_2.png': 120,
    '9-Months_Moves-things-from-one-hand-to-the-other_1.png': 144,
    '9-Months_Sits-without-support.png': 144,
    '9-months_smiles-or-laughs-when-you-play-peekaboo_2.png': 128,
  }
  const bottom = bottoms[src.split('/').at(-1)]
  return bottom ? { width: 800, height: 800, bottom } : null
}

function Media({ item, label, age = false, text }) {
  const [failed, setFailed] = useState(false)
  const [failedPoster, setFailedPoster] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const { t: translate } = useLanguage()
  const openLabel = `${milestoneText(translate, 'mediaPlayer.open')}: ${label}`
  const crop = !age && milestoneMediaCrop(item.mediaSrc)
  if (item.mediaSrc && !failed) {
    if (age) return <img className="dm-media dm-age-art dm-age-image" src={item.mediaSrc} alt={label} loading="lazy" onError={() => setFailed(true)} />
    return <>
      {item.mediaType === 'video'
        ? <button type="button" className="dm-media dm-player dm-player-thumbnail dm-video-thumbnail" aria-label={openLabel} aria-haspopup="dialog" onClick={() => setPreviewOpen(true)}>{item.posterSrc && item.posterSrc !== failedPoster && <img className="dm-video-poster" src={item.posterSrc} alt={label} loading="lazy" onError={() => setFailedPoster(item.posterSrc)} />}<span className="dm-player-open" aria-hidden="true"><Play size={26} fill="currentColor" /></span></button>
        : <button type="button" className={`dm-media dm-media-image-trigger${crop ? ' dm-cropped-image-trigger' : ''}`} aria-label={openLabel} aria-haspopup="dialog" onClick={() => setPreviewOpen(true)}>{crop ? <span className="dm-cropped-image-frame" style={{ '--dm-image-aspect': crop.width / (crop.height - crop.bottom) }}><img src={item.mediaSrc} alt={label} loading="lazy" onError={() => setFailed(true)} /></span> : <img src={item.mediaSrc} alt={label} loading="lazy" onError={() => setFailed(true)} />}<ZoomIn size={18} aria-hidden="true" /></button>}
      {previewOpen && <MediaPreview item={item} label={label} onDismiss={() => setPreviewOpen(false)} />}
    </>
  }
  return <div className={`dm-media dm-placeholder ${age ? 'dm-age-art' : ''}`}><span className="dm-orbit" /><Baby size={age ? 86 : 52} strokeWidth={1.3} aria-hidden="true" /><Sparkles className="dm-sparkle" size={23} aria-hidden="true" /><span>{text}</span></div>
}

function resetPreviewVideo(video) {
  if (!video) return
  video.pause()
  try { video.currentTime = 0 } catch {  }
}

function MilestoneVideo({ src, label, preload = 'metadata', onError, onPreview, videoRef, poster, cropBottom = 0 }) {
  const { t: translate } = useLanguage()
  const t = key => milestoneText(translate, `mediaPlayer.${key}`)
  const video = useRef(null)
  useImperativeHandle(videoRef, () => video.current, [])
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)
  const [playError, setPlayError] = useState(false)
  const [aspectRatio, setAspectRatio] = useState(16 / 9)
  const [volume, setVolume] = useState(1)
  const crop = milestoneMediaCrop(src)
  const visibleHeight = 1 - (crop ? crop.bottom / crop.height : Math.min(0.2, Math.max(0, Number(cropBottom) || 0)))
  useEffect(() => {
    const element = video.current
    return () => { resetPreviewVideo(element) }
  }, [])
  const toggle = async () => {
    const element = video.current
    if (!element) return
    setPlayError(false)
    if (!element.paused) { element.pause(); return }
    try { await element.play() }
    catch { if (video.current === element) setPlayError(true) }
  }
  const time = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`
  return <figure className="dm-video-figure"><div className={`dm-player${onPreview ? ' dm-media dm-player-thumbnail' : ''}`}>
    <div className="dm-video-viewport" style={{ '--dm-video-visible': visibleHeight, '--dm-video-aspect': aspectRatio }}><video ref={video} className="dm-player-video" src={src} poster={poster} aria-label={label} playsInline preload={preload} disablePictureInPicture disableRemotePlayback onContextMenu={event => event.preventDefault()} onLoadedMetadata={event => { const element = event.currentTarget; setDuration(Number.isFinite(element.duration) ? element.duration : 0); if (element.videoWidth > 0 && element.videoHeight > 0) setAspectRatio(element.videoWidth / element.videoHeight) }} onDurationChange={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onTimeUpdate={event => setPosition(event.currentTarget.currentTime)} onVolumeChange={event => setVolume(event.currentTarget.muted ? 0 : event.currentTarget.volume)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={onError || (() => setPlayError(true))} /></div>
    {onPreview && <button type="button" className="dm-player-open" aria-label={`${t('open')}: ${label}`} aria-haspopup="dialog" onClick={() => { video.current?.pause(); onPreview() }}><Play size={26} fill="currentColor" aria-hidden="true" /></button>}
    <div className="dm-player-controls" dir="ltr">
      <button type="button" className="dm-player-toggle" aria-label={`${t(playing ? 'pause' : 'play')}: ${label}`} onClick={toggle}>{playing ? <Pause size={18} fill="currentColor" aria-hidden="true" /> : <Play size={18} fill="currentColor" aria-hidden="true" />}</button>
      <input className="dm-player-progress" type="range" min="0" max={duration || 1} step="0.05" value={Math.min(position, duration || 1)} disabled={!duration} aria-label={`${t('seek')}: ${label}`} aria-valuetext={`${time(position)} / ${time(duration)}`} onChange={event => { if (video.current && duration) { video.current.currentTime = Number(event.target.value); setPosition(video.current.currentTime) } }} />
      {crop && <input className="dm-player-volume" type="range" min="0" max="1" step="0.05" value={volume} aria-label={t('volume')} onChange={event => { const value = Number(event.target.value); if (video.current) { video.current.volume = value; video.current.muted = false; setVolume(value) } }} />}
    </div>
    {playError && <span className="dm-player-error" role="alert">{t('error')}</span>}
  </div><figcaption className="dm-video-source" lang="en" dir="ltr"><a href="https://www.cdc.gov/Milestones" target="_blank" rel="noopener noreferrer">{t('source')}</a></figcaption></figure>
}

function MediaPreview({ item, label, onDismiss }) {
  const { language, t: translate } = useLanguage()
  const dialog = useRef(null)
  const closeButton = useRef(null)
  const previewVideo = useRef(null)
  const backdropPointer = useRef(false)
  const [imageError, setImageError] = useState(false)
  const crop = milestoneMediaCrop(item.mediaSrc)
  const close = () => {
    resetPreviewVideo(previewVideo.current)
    dialog.current?.close()
    onDismiss()
  }
  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element.showModal()
    closeButton.current?.focus()
    const video = previewVideo.current
    let active = true
    if (video) {
      resetPreviewVideo(video)
      try {
        Promise.resolve(video.play()).then(() => {
          if (!active) resetPreviewVideo(video)
        }).catch(() => {})
      } catch {  }
    }
    return () => {
      active = false
      resetPreviewVideo(video)
      element.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])
  const isBackdrop = event => {
    if (event.target !== event.currentTarget) return false
    const bounds = event.currentTarget.getBoundingClientRect()
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom
  }
  return createPortal(<dialog ref={dialog} className="dm-media-modal" dir={language === 'ar' ? 'rtl' : 'ltr'} aria-label={label} onCancel={event => { event.preventDefault(); close() }} onPointerDown={event => { backdropPointer.current = isBackdrop(event); event.stopPropagation() }} onClick={event => { event.stopPropagation(); if (backdropPointer.current && isBackdrop(event)) close(); backdropPointer.current = false }}>
    <button ref={closeButton} type="button" className="dm-media-close" aria-label={milestoneText(translate, 'mediaPlayer.close')} onClick={close}><X size={22} aria-hidden="true" /></button>
    {item.mediaType === 'video' ? <MilestoneVideo src={item.mediaSrc} label={label} preload="metadata" videoRef={previewVideo} poster={item.posterSrc} cropBottom={item.videoCropBottom} /> : imageError ? <p role="alert">{milestoneText(translate, 'media')}</p> : crop ? <figure className="dm-cropped-image-figure"><div className="dm-cropped-image-frame" style={{ '--dm-image-aspect': crop.width / (crop.height - crop.bottom) }}><img src={item.mediaSrc} alt={label} onError={() => setImageError(true)} /></div><figcaption className="dm-video-source" lang="en" dir="ltr"><a href="https://www.cdc.gov/Milestones" target="_blank" rel="noopener noreferrer">{milestoneText(translate, 'mediaPlayer.source')}</a></figcaption></figure> : <img className="dm-media-modal-image" src={item.mediaSrc} alt={label} onError={() => setImageError(true)} />}
  </dialog>, document.body)
}


export default function DevelopmentalMilestones({ motherId = demoMotherId, childId, child: suppliedChild = {}, currentAge, role = 'mother', onBack: suppliedOnBack, stickyOffset: suppliedOffset = 0, navigation }) {
  const child = suppliedChild && typeof suppliedChild === 'object' && !Array.isArray(suppliedChild) ? suppliedChild : {}
  const onBack = typeof suppliedOnBack === 'function' ? suppliedOnBack : undefined
  const offset = typeof suppliedOffset === 'number' || typeof suppliedOffset === 'string' ? Number(suppliedOffset) : 0
  const stickyOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0
  const providedAge = currentAge === undefined ? child.currentAge : currentAge
  const ageMonths = Number.isInteger(providedAge) && providedAge >= 0 ? providedAge : null
  const sessionId = canonicalChildId(childId ?? child.id) || ''
  return <MilestoneSession key={JSON.stringify([sessionId, motherId, role])} childId={sessionId} motherId={motherId} child={child} currentAge={ageMonths} role={role} onBack={onBack} stickyOffset={stickyOffset} navigation={navigation} />
}
function MilestoneLeaveGuard({ dirty, saving, message, approvedNavigation }) {
  const context = useContext(UNSAFE_NavigationContext)
  useEffect(() => {
    if (!dirty) return
    let approved = false
    let restoring = false
    let index = window.history.state?.idx
    const allow = () => {
      if (saving) return false
      if (approved || approvedNavigation?.current) return true
      approved = window.confirm(message)
      return approved
    }
    const unload = event => { event.preventDefault(); event.returnValue = '' }
    const click = event => {
      const link = event.target.closest?.('a[href]')
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return
      const url = new URL(link.href, window.location.href)
      if (url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search) return
      if (!allow()) { event.preventDefault(); event.stopImmediatePropagation() }
    }
    const pop = event => {
      if (restoring) { restoring = false; event.stopImmediatePropagation(); return }
      const next = event.state?.idx
      if (allow()) { index = next; return }
      if (Number.isInteger(index) && Number.isInteger(next) && index !== next) {
        event.stopImmediatePropagation()
        restoring = true
        window.history.go(index - next)
      }
    }
    const navigator = context?.navigator
    const originals = {}
    const wrappers = {}
    for (const method of ['push', 'replace', 'go']) if (navigator?.[method]) {
      originals[method] = navigator[method]
      wrappers[method] = (...args) => { if (allow()) return originals[method].apply(navigator, args) }
      // eslint-disable-next-line react/immutability
      navigator[method] = wrappers[method]
    }
    window.addEventListener('beforeunload', unload)
    document.addEventListener('click', click, true)
    window.addEventListener('popstate', pop, true)
    return () => {
      window.removeEventListener('beforeunload', unload)
      document.removeEventListener('click', click, true)
      window.removeEventListener('popstate', pop, true)
      for (const method of Object.keys(originals)) if (navigator[method] === wrappers[method]) navigator[method] = originals[method]
    }
  }, [context, dirty, saving, message, approvedNavigation])
  return null
}

function MilestoneSession({ childId, motherId, child, currentAge, role, onBack, stickyOffset, navigation }) {
  const { language, t: translate } = useLanguage()
  const ar = language === 'ar'
  const t = key => milestoneText(translate, key)
  const label = age => t(`ages.${age.months}`)
  const destinationLabel = age => label(age).replace(/[0-9]+/g, value => new Intl.NumberFormat(language, { useGrouping: false }).format(Number(value)))
  const { records, drafts = {}, status, loadError, update: saveResponse, save, discard, retry } = useMilestonesStorage(childId, motherId)
  const editable = role === 'mother' && !!childId && !loadError
  const [selected, setSelected] = useState(() => ages.find(age => age.months === navigation?.age) || null)
  const [previewMonths, setPreviewMonths] = useState(navigation?.preview ?? null)
  const approvedNavigation = useRef(false)
  const timelinePosition = useRef(null)
  const previewAge = ages.find(age => age.months === previewMonths) || ages.filter(age => age.months <= currentAge).at(-1) || ages[0]
  const birthAge = ageFromBirthDate(child.dateOfBirth)
  const birthMonths = birthAge ? birthAge.years * 12 + birthAge.months : null
  const currentStage = birthMonths == null ? null : ages.filter(age => age.months <= birthMonths).at(-1) || ages[0]
  const selectedIndex = selected ? ages.findIndex(age => age.months === selected.months) : -1
  const previousAge = selectedIndex > 0 ? ages[selectedIndex - 1] : null
  const nextAge = selectedIndex >= 0 ? ages[selectedIndex + 1] : null
  const [active, setActive] = useState('social')
  const [openNotes, setOpenNotes] = useState({})
  const top = useRef(null)
  const nav = useRef(null)
  const sections = useRef({})
  const instance = useId()
  const [navHeight, setNavHeight] = useState(70)

  function update(skillId, patch) {
    if (editable) saveResponse(skillId, patch)
  }
  useEffect(() => {
    if (!selected || !nav.current) return
    const resize = new ResizeObserver(() => setNavHeight(nav.current.getBoundingClientRect().height))
    resize.observe(nav.current)
    let frame
    const track = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const threshold = (nav.current?.getBoundingClientRect().bottom || 0) + 28
        let next = 'social'
        for (const category of categories) if (sections.current[category.id]?.getBoundingClientRect().top <= threshold) next = category.id
        setActive(next)
      })
    }
    window.addEventListener('scroll', track, true)
    track()
    return () => { resize.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('scroll', track, true) }
  }, [selected, language])
  function changeAge(age) {
    if (status === 'saving') return
    if (Object.keys(drafts).length) {
      if (!window.confirm(t('manualSave.leaveWarning'))) return
    }
    discard?.()
    if (navigation) {
      approvedNavigation.current = true
      navigation.changeAge(age?.months ?? null)
      return
    }
    if (age && !selected && typeof window !== 'undefined') timelinePosition.current = { x: window.scrollX, y: window.scrollY }
    setSelected(age)
    setActive('social')
    requestAnimationFrame(() => { if (!age && timelinePosition.current) window.scrollTo(timelinePosition.current.x, timelinePosition.current.y); else top.current?.scrollIntoView({ block: 'start' }); top.current?.focus({ preventScroll: true }) })
  }
  const scrollTo = category => {
    const section = sections.current[category]
    section?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
    section?.focus({ preventScroll: true })
    setActive(category)
  }
  const answeredCount = skills => skills.filter(skill => ['yes', 'notYet', 'unsure'].includes(records[skill.id]?.answer)).length
  const previewSkills = previewAge.sections.flat()
  const previewAnswered = answeredCount(previewSkills)
  const responseProgress = t('stageResponseProgress').replace('{answered}', new Intl.NumberFormat(language).format(previewAnswered)).replace('{total}', new Intl.NumberFormat(language).format(previewSkills.length))
  if (role === 'doctor') return <>{loadError && <p className="dm-notice" role="alert" dir={ar ? 'rtl' : 'ltr'}>{t('loadError')}<button type="button" onClick={retry}>{t('retry')}</button></p>}<DoctorMilestones child={child} currentAge={currentAge} records={records} onBack={onBack} stickyOffset={stickyOffset} /></>
  return <section className={`dm${selected ? ' dm-details' : ''}`} dir={ar ? 'rtl' : 'ltr'} lang={language} style={{ '--dm-offset': `${Math.max(0, Number(stickyOffset) || 0)}px`, '--dm-nav-height': `${navHeight}px` }}>
    <MilestoneLeaveGuard dirty={Object.keys(drafts).length > 0} saving={status === 'saving'} message={t('manualSave.leaveWarning')} approvedNavigation={approvedNavigation} />
    <div ref={top} tabIndex={-1} className="dm-top">
      {selected && <button className="dm-back" onClick={() => changeAge(null)}><ArrowLeft size={19} />{t('back')}</button>}
      <header className="dm-section-heading"><Star size={24} strokeWidth={1.6} aria-hidden="true" /><h2>{t('title')}</h2></header>
    </div>
    {!childId && <p className="dm-notice" role="status">{t('missing')}</p>}
    {loadError && <p className="dm-notice" role="alert">{t('loadError')}<button type="button" onClick={retry}>{t('retry')}</button></p>}
    {!selected ? <>
      <div className="dm-banner"><Info size={31} /><strong>{t('banner')}</strong></div>
      <nav className="dm-timeline" aria-label={t('ageNavigation')}><ol className="dm-timeline-track">{ages.map((age, index) => {
        const Icon = [Baby, Heart, MessageCircle, Brain, Footprints, Blocks, Star, Footprints, Blocks, Star][index]
        const marked = currentStage?.months === age.months
        return <li className="dm-timeline-item" key={age.months}><button type="button" className="dm-timeline-node" aria-pressed={previewAge.months === age.months} aria-controls={`${instance}-stage-preview`} aria-describedby={marked ? `${instance}-current-stage` : undefined} onClick={() => { setPreviewMonths(age.months); navigation?.previewChanged(age.months) }}><span className="dm-timeline-circle"><Icon size={23} strokeWidth={1.6} aria-hidden="true" /></span><span>{label(age)}</span></button>{marked && <span className="dm-current-stage" id={`${instance}-current-stage`}>{t(birthMonths < 2 ? 'upcomingAgeStage' : 'currentAgeStage')}</span>}</li>
      })}</ol></nav>
      <section className="dm-stage-preview" id={`${instance}-stage-preview`} aria-labelledby={`${instance}-stage-title`}>
        <Media key={previewAge.months} item={previewAge} label={label(previewAge)} age text={t('ageMedia')} />
        <div className="dm-stage-copy"><h3 id={`${instance}-stage-title`} aria-live="polite">{label(previewAge)}</h3><p className="dm-stage-description">{t(`ageDescriptions.${previewAge.months}`)}</p><div className="dm-stage-progress"><span role="status">{responseProgress}</span><progress value={previewAnswered} max={previewSkills.length} aria-label={responseProgress} /></div><button type="button" className="dm-stage-action" onClick={() => changeAge(previewAge)}>{t('viewStageSkills')}<ArrowRight size={19} aria-hidden="true" /></button></div>
      </section>
      <section className="dm-tip dm-parent-tips" aria-labelledby={`${instance}-parent-tips`}><div className="dm-parent-tips-content"><h3 id={`${instance}-parent-tips`}><Lightbulb size={20} aria-hidden="true" />{t('parentTips.title')}</h3><ul>{['pace', 'observe', 'lostSkill'].map(key => <li key={key}>{t(`parentTips.${key}`)}</li>)}</ul><p className="dm-parent-tips-save"><CircleCheck size={16} aria-hidden="true" />{t('parentTips.autosave')}</p></div></section>
    </> : <>
      <nav ref={nav} className="dm-nav" aria-label={t('categoryNavigation')}>{categories.map(({ id: categoryId, Icon }) => <button key={categoryId} aria-current={active === categoryId ? 'location' : undefined} onClick={() => scrollTo(categoryId)}><Icon size={25} /><span>{t(`categories.${categoryId}.title`)}</span></button>)}</nav>
      {categories.map(({ id: categoryId, Icon }, categoryIndex) => <section key={categoryId} ref={element => { sections.current[categoryId] = element }} tabIndex={-1} className={`dm-category dm-category-${categoryIndex}`} aria-labelledby={`${instance}-${categoryId}`}>
        <header className="dm-category-heading"><span><Icon size={27} /></span><div><h2 id={`${instance}-${categoryId}`}>{t(`categories.${categoryId}.title`)}</h2><p>{t(`categories.${categoryId}.description`)}</p></div><div className="dm-category-completion"><span role="status">{t('answeredCount').replace('{answered}', new Intl.NumberFormat(language).format(answeredCount(selected.sections[categoryIndex]))).replace('{total}', new Intl.NumberFormat(language).format(selected.sections[categoryIndex].length))}</span><progress aria-label={t(`categories.${categoryId}.title`)} value={answeredCount(selected.sections[categoryIndex])} max={selected.sections[categoryIndex].length} /></div></header>
        <div className="dm-skills">{selected.sections[categoryIndex].map((skill, skillIndex) => {
          const record = { ...records[skill.id], ...drafts[skill.id] }
          const content = motherSkillContent[skill.id]
          const media = content?.media || skill
          const sentence = t(content?.sentenceKey || `skills.${skill.id}.title`)
          const explanation = content ? (content.explanationKey ? t(content.explanationKey) : null) : t(`skills.${skill.id}.description`)
          return <article className={`dm-skill${media.mediaSrc ? ' dm-skill-with-media' : ''}${content ? ' dm-skill-approved-content' : ''}`} key={skill.id} aria-labelledby={`${instance}-${skill.id}`}>
            {media.mediaSrc && <Media key={skill.id + media.mediaSrc} item={media} label={sentence} text={t('media')} preload={content ? 'metadata' : 'none'} />}
            <div className="dm-skill-copy"><h3 id={`${instance}-${skill.id}`}>{skillIndex + 1}. {sentence}</h3>{explanation && <p>{explanation}</p>}</div>
            <div className="dm-observation">{role === 'mother' ? <>
              <fieldset disabled={!editable || status === 'saving'}><legend>{t('question')}</legend><div className="dm-answers">{['yes', 'notYet', 'unsure'].map(answer => <label key={answer} className={`dm-answer ${record.answer === answer ? `dm-answer-${answer}` : ''}`}><input type="radio" name={`${instance}-${skill.id}`} value={answer} checked={record.answer === answer} onClick={() => { if (record.answer === answer) update(skill.id, { answer: null }) }} onChange={() => update(skill.id, { answer })} />{t(answer)}</label>)}</div></fieldset>
              {openNotes[skill.id] || record.note ? <><label className="dm-note-label" htmlFor={`${instance}-${skill.id}-note`}>{t('notes')}</label><textarea id={`${instance}-${skill.id}-note`} value={record.note || ''} onFocus={() => setOpenNotes(value => value[skill.id] ? value : { ...value, [skill.id]: true })} disabled={!editable || status === 'saving'} placeholder={t('placeholder')} onChange={event => update(skill.id, { note: event.target.value })} /></> : <button type="button" className="dm-add-note" disabled={!editable} aria-expanded={false} aria-controls={`${instance}-${skill.id}-note`} onClick={() => { setOpenNotes(value => ({ ...value, [skill.id]: true })); requestAnimationFrame(() => document.getElementById(`${instance}-${skill.id}-note`)?.focus()) }}>{t('addNote')}</button>}
            </> : <>
              <div className="dm-response"><strong>{t('response')}</strong><span className={`dm-answer dm-answer-${record.answer || 'empty'}`}>{t(record.answer || 'unanswered')}</span></div>
              <strong className="dm-note-label">{t('motherNotes')}</strong><p className="dm-read-note">{record.note || t('emptyNote')}</p>
              <small>{t('updated')}: {record.updatedAt ? <time dateTime={record.updatedAt}>{new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(record.updatedAt))}</time> : '—'}</small>
            </>}</div>
          </article>
        })}</div>
      </section>)}
      <div className="dm-manual-save"><button type="button" disabled={!editable || status === 'saving' || !selected.sections.flat().some(skill => drafts[skill.id])} onClick={() => save(selected.sections.flat().map(skill => skill.id))}>{t(status === 'saving' ? 'manualSave.saving' : 'manualSave.button')}</button>{status && <p role={status === 'failed' ? 'alert' : 'status'}>{t(`manualSave.${status}`)}</p>}</div>
      <nav className="dm-age-navigation" aria-label={t('ageNavigation')}>
        <button type="button" className="dm-previous-age" disabled={!previousAge} aria-hidden={!previousAge || undefined} style={previousAge ? undefined : { visibility: 'hidden' }} onClick={() => { if (previousAge) changeAge(previousAge) }}><ArrowLeft size={18} aria-hidden="true" />{previousAge && destinationLabel(previousAge)}</button>
        <button type="button" className="dm-next-age" disabled={!nextAge} aria-hidden={!nextAge || undefined} style={nextAge ? undefined : { visibility: 'hidden' }} onClick={() => { if (nextAge) changeAge(nextAge) }}>{nextAge && destinationLabel(nextAge)}<ArrowRight size={18} aria-hidden="true" /></button>
      </nav>
    </>}
    <p className="dm-medical">{t('medical')}</p>
  </section>
}

function DoctorNote({ note, language }) {
  const { t: translate } = useLanguage()
  const textRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const textId = useId()
  useEffect(() => {
    const element = textRef.current
    if (!element) return
    const measure = () => setOverflows(element.scrollHeight > parseFloat(getComputedStyle(element).lineHeight) * 3 + 1)
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    return () => observer.disconnect()
  }, [note, language])
  if (!note?.trim()) return <span>{milestoneText(translate, 'doctorUi.noNotes')}</span>
  return <><div id={textId} ref={textRef} className={`dd-note-text${expanded ? ' dd-note-expanded' : ''}`}>{note}</div>{overflows && <button type="button" className="dd-note-toggle" aria-expanded={expanded} aria-controls={textId} onClick={() => setExpanded(value => !value)}>{milestoneText(translate, expanded ? 'doctorUi.showLess' : 'doctorUi.showMore')}</button>}</>
}

function DoctorMilestones({ child, records, stickyOffset }) {
  const { language, t: translate } = useLanguage()
  const t = key => milestoneText(translate, key)
  const [browsedAge, setBrowsedAge] = useState(null)
  const [responseSelection, setResponseSelection] = useState(null)
  const [category, setCategory] = useState('all')
  const panelId = useId()
  const selected = ages.find(age => age.months === browsedAge) || ages[0]
  const responseFilter = responseSelection?.age === selected.months && responseSelection?.childId === child.id ? responseSelection.value : 'all'
  const allSkills = selected.sections.flatMap((skills, index) => skills.map(skill => ({ ...skill, category: categories[index].id })))
  const visible = allSkills.filter(skill => (category === 'all' || skill.category === category) && (responseFilter === 'all' || (records[skill.id]?.answer || 'unanswered') === responseFilter))
  const counts = { yes: 0, notYet: 0, unsure: 0, unanswered: 0 }
  for (const skill of allSkills) counts[records[skill.id]?.answer || 'unanswered']++
  const number = value => new Intl.NumberFormat(language).format(value)
  return <section className="dm-doctor" lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'} style={{ '--dd-offset': `${Math.max(0, Number(stickyOffset) || 0)}px` }}>
    <header className="dd-header"><h1><span className="vaccination__titleIcon"><Star size={24} aria-hidden="true" /></span>{t('title')}</h1><p>{t('doctorUi.subtitle')}</p></header>
    <nav className="dd-ages" aria-label={t('ageSelectorLabel')}>{ages.map(age => <button type="button" key={age.months} aria-current={selected.months === age.months ? 'true' : undefined} onClick={() => { setBrowsedAge(age.months); setCategory('all'); setResponseSelection(null) }}>{t(`ages.${age.months}`)}</button>)}</nav>
    <>
      <div className="dd-summary" aria-label={t('reported')}>{Object.entries(counts).map(([response, count]) => <div key={response} className={`dd-summary-card dd-${response}`} data-response={response}><span>{t(response === 'unanswered' ? 'doctorUi.unanswered' : response)}</span><strong>{number(count)}</strong></div>)}</div>
      <p className="dd-reviewed">{t('doctorUi.reviewed')}: <strong>{number(allSkills.length - counts.unanswered)}</strong> · {t('doctorUi.totalSkills')}: <strong>{number(allSkills.length)}</strong></p>
      <div className="dd-filter-bar">
        <nav className="dd-categories" aria-label={t('categoryNavigation')}>
          <button type="button" aria-current={category === 'all' ? 'true' : undefined} onClick={() => setCategory('all')}><Blocks size={17} />{t('doctorUi.allSkills')}</button>
          {categories.map(({ id, Icon }) => <button type="button" key={id} aria-current={category === id ? 'true' : undefined} onClick={() => setCategory(id)}><Icon size={17} />{t(`categories.${id}.title`)}</button>)}
        </nav>
        <label className="dd-response-filter" htmlFor={`${panelId}-response`}>{t('doctorUi.responseFilter')}<select id={`${panelId}-response`} value={responseFilter} onChange={event => setResponseSelection({ age: selected.months, childId: child.id, value: event.target.value })}>{['all', 'yes', 'notYet', 'unsure', 'unanswered'].map(value => <option key={value} value={value}>{t(value === 'all' ? 'doctorUi.allResponses' : value === 'unanswered' ? 'doctorUi.unanswered' : value)}</option>)}</select></label>
      </div>
      <p className="dd-result-count" role="status">{number(visible.length)} / {number(allSkills.length)} ? {t(`ages.${selected.months}`)}</p>
      {!visible.length ? <div className="dd-empty" role="status"><strong>{t('doctorUi.noFilteredSkills')}</strong><button type="button" onClick={() => { setCategory('all'); setResponseSelection(null) }}>{t('doctorUi.clearFilters')}</button></div> : <div className="dd-assessments">{categories.map(({ id, Icon }) => {
        const skills = visible.filter(skill => skill.category === id)
        if (!skills.length) return null
        return <section key={id} className="dd-category" aria-labelledby={`${panelId}-${id}`}>
          <header className="dd-category-heading"><span><Icon size={26} /></span><div><h2 id={`${panelId}-${id}`}>{t(`categories.${id}.title`)}</h2><p>{t(`categories.${id}.description`)}</p></div></header>
          <div className="dd-skill-list">{skills.map(skill => {
            const record = records[skill.id] || {}
            const response = record.answer || 'unanswered'
            const content = motherSkillContent[skill.id]
            const statement = t(content?.sentenceKey || `skills.${skill.id}.title`)
            const description = content ? (content.explanationKey ? t(content.explanationKey) : null) : t(`skills.${skill.id}.description`)
            const updatedAt = typeof record.updatedAt === 'string' && Number.isFinite(Date.parse(record.updatedAt)) ? new Date(record.updatedAt) : null
            return <article key={skill.id} data-skill-id={skill.id} className="dd-skill-card" aria-labelledby={`${panelId}-${skill.id}`}>
              <div className="dd-statement"><h3 id={`${panelId}-${skill.id}`}>{statement}</h3>{description && <p>{description}</p>}</div>
              <div className="dd-assessment"><span className={`dd-response dd-${response}`}>{t(response === 'unanswered' ? 'doctorUi.unanswered' : response)}</span><div className="dd-notes"><strong>{t('motherNotes')}</strong><div className="dd-note"><DoctorNote note={record.note} language={language} /></div></div>{updatedAt && <p className="dd-last-updated">{t('doctorUi.lastUpdated')}: <time dateTime={record.updatedAt}>{new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(updatedAt)}</time></p>}</div>
            </article>
          })}</div>
        </section>
      })}</div>}
    </>
  </section>
}




// eslint-disable-next-line react/only-export-components
export function preview() {
  if (!import.meta.env.DEV) throw new Error('Preview is available only in development')
  window.__nomuMilestonesPreview?.()
  const host = document.createElement('div')
  const app = document.getElementById('root')
  const display = app?.style.display
  if (app) app.style.display = 'none'
  document.body.append(host)
  const root = createRoot(host)
  const close = () => { root.unmount(); host.remove(); if (app) app.style.display = display; delete window.__nomuMilestonesPreview }
  window.__nomuMilestonesPreview = close
  root.render(<LanguageProvider><MilestonesPreview onClose={close} /></LanguageProvider>)
  return 'Milestones preview opened. Close with the toolbar or refresh.'
}
function MilestonesPreview({ onClose }) {
  const { language, toggleLanguage, t: translate } = useLanguage()
  const t = key => milestoneText(translate, key)
  const [role, setRole] = useState('mother')
  const [person, setPerson] = useState('a')
  const [dob, setDob] = useState('2026-01-15')
  return <><div className="dm-preview-bar" dir={language === 'ar' ? 'rtl' : 'ltr'}><strong>{t('preview')}</strong><select aria-label={t('roleLabel')} value={role} onChange={event => setRole(event.target.value)}><option value="mother">{t('mother')}</option><option value="doctor">{t('doctor')}</option></select><label>{t('child')}<select value={person} onChange={event => setPerson(event.target.value)}><option value="a">A</option><option value="b">B</option></select></label><label>{t('dob')}<input type="date" value={dob} onChange={event => setDob(event.target.value)} /></label><button onClick={toggleLanguage}>{t('switchLanguage')}</button><button onClick={onClose}>{t('closePreview')}</button></div><DevelopmentalMilestones child={{ id: `demo-milestones-${person}`, name: `${t('demoChildName')} ${person.toUpperCase()}`, dateOfBirth: dob }} role={role} onBack={onClose} /></>
}
