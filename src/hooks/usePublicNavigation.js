import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function attachPublicSwipe(element, direction, navigate, clock = Date.now) {
  let touch = null, total = 0, last = 0, eligible = false, done = false
  const readyAt = clock() + 350 // Ignore route-entry momentum without a long dead interval.
  const selected = () => element.ownerDocument?.getSelection?.()?.isCollapsed === false
  const blocked = target => Boolean(target?.closest?.('a,button,input,textarea,select,[contenteditable="true"]'))
  const nestedScroll = target => {
    for (let node = target; node && node !== element; node = node.parentElement) {
      if (node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY)) return true
    }
    return false
  }
  const available = event => !event.defaultPrevented && !selected() && !blocked(event.target) && !nestedScroll(event.target) && (direction === 'up' || element.scrollTop <= 1)
  const fire = () => { if (!done) { done = true; navigate() } }
  const wheel = event => {
    if (done || clock() < readyAt || event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
    const time = clock()
    if (time - last > 280) { total = 0; eligible = available(event) }
    last = time
    if (!eligible || !available(event)) return
    const delta = direction === 'up' ? event.deltaY : -event.deltaY
    if (delta <= 0) { total = 0; eligible = false; return }
    total += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1)
    if (total >= 90) fire()
  }
  const start = event => { touch = event.touches.length === 1 && available(event) && clock() >= readyAt ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null }
  const end = event => {
    if (!touch || !event.changedTouches[0]) return
    const dx = event.changedTouches[0].clientX - touch.x, dy = event.changedTouches[0].clientY - touch.y
    touch = null
    if (available(event) && Math.abs(dy) >= 70 && Math.abs(dy) > Math.abs(dx) * 1.5 && (direction === 'up' ? dy < 0 : dy > 0)) fire()
  }
  const cancel = () => { touch = null }
  const move = event => { if (event.touches.length !== 1 || selected()) touch = null }
  const handlers = { wheel, touchstart: start, touchmove: move, touchend: end, touchcancel: cancel }
  for (const [type, handler] of Object.entries(handlers)) element.addEventListener(type, handler, { passive: true })
  return () => { for (const [type, handler] of Object.entries(handlers)) element.removeEventListener(type, handler) }
}

export default function usePublicNavigation(ref, { direction, to, enabled = true }) {
  const navigate = useNavigate()
  const timer = useRef(null)
  const busy = useRef(false)
  const [leaving, setLeaving] = useState(false)
  const go = useCallback(() => {
    if (busy.current) return
    busy.current = true
    setLeaving(true)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    timer.current = window.setTimeout(() => navigate(to), reduced ? 0 : 180)
  }, [navigate, to])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => enabled && ref.current ? attachPublicSwipe(ref.current, direction, go) : undefined, [ref, direction, go, enabled])
  return { go, leaving }
}
