import { useEffect } from 'react'

// Exported separately so real window event behavior can be tested without a DOM package.
export function attachNemoGestures({ target, document, mode, onUp, onDown, now = Date.now }) {
  if (mode === 'disabled') return () => {}
  let gesture = null, triggered = false, wheelTotal = 0, wheelTime = 0
  const controls = 'input,textarea,select,button,a,label,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="button"],[role="slider"]'
  const selected = () => document.getSelection?.()?.isCollapsed === false
  function ignore(event) {
    if (selected() || document.querySelector?.('dialog[open], .nemo-auth form[aria-busy="true"]')) return true
    const element = event.target?.closest ? event.target : event.target?.parentElement
    if (mode === 'home' && element?.closest?.('.nomu-home__continue')) return false
    return Boolean(element?.closest?.(controls))
  }
  const prevent = event => { if (event.cancelable) event.preventDefault() }
  function trigger(direction) {
    if (triggered) return
    if (mode === 'home' && direction === 'up') triggered = onUp() !== false
    else if (mode !== 'home' && direction === 'down') triggered = onDown() !== false
  }
  function begin(event, point, source) {
    gesture = !triggered && !ignore(event) ? { x: point.clientX, y: point.clientY, source } : null
  }
  function move(event, point) {
    if (!gesture) return
    if (selected()) { gesture = null; return }
    const dy = point.clientY - gesture.y, dx = point.clientX - gesture.x
    if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      const intended = mode === 'home' ? dy < 0 : dy > 0
      if (intended) prevent(event)
    }
  }
  function end(event, point) {
    const start = gesture
    gesture = null
    if (!start || selected() || ignore(event)) return
    const dy = point.clientY - start.y, dx = point.clientX - start.x
    if (Math.abs(dy) >= 40 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      prevent(event)
      trigger(dy < 0 ? 'up' : 'down')
    }
  }
  const touchStart = event => {
    if (event.touches.length !== 1) { gesture = null; return }
    begin(event, event.touches[0], 'touch')
  }
  const touchMove = event => {
    if (event.touches.length !== 1) { gesture = null; return }
    if (gesture?.source === 'touch') move(event, event.touches[0])
  }
  const touchEnd = event => { if (gesture?.source === 'touch' && event.changedTouches[0]) end(event, event.changedTouches[0]) }
  const cancel = () => { gesture = null; wheelTotal = 0 }
  const pointerDown = event => {
    if (event.pointerType === 'touch' || event.isPrimary === false || event.button !== 0) return
    begin(event, event, event.pointerId)
  }
  const pointerMove = event => {
    if (gesture?.source !== event.pointerId) return
    if (event.buttons === 0) { gesture = null; return }
    move(event, event)
  }
  const pointerUp = event => { if (gesture?.source === event.pointerId) end(event, event) }
  const pointerCancel = event => { if (gesture?.source === event.pointerId) gesture = null }
  const wheel = event => {
    if (event.ctrlKey || event.metaKey || ignore(event) || Math.abs(event.deltaX || 0) > Math.abs(event.deltaY)) { wheelTotal = 0; return }
    const direction = event.deltaY > 0 ? 'up' : 'down'
    const intended = mode === 'home' ? direction === 'up' : direction === 'down'
    if (!intended) { wheelTotal = 0; return }
    prevent(event)
    const time = now()
    if (time - wheelTime > 250) wheelTotal = 0
    wheelTime = time
    wheelTotal += Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 600 : 1)
    if (wheelTotal >= 60) trigger(direction)
  }
  const keyDown = event => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || ignore(event)) return
    if (mode === 'home' && ['ArrowUp', 'ArrowDown'].includes(event.key)) { prevent(event); trigger('up') }
    else if (mode !== 'home' && ['ArrowDown', 'Escape'].includes(event.key)) { prevent(event); trigger('down') }
  }
  const dragStart = event => { if (gesture) prevent(event) }
  const events = { touchstart: touchStart, touchmove: touchMove, touchend: touchEnd, touchcancel: cancel,
    pointerdown: pointerDown, pointermove: pointerMove, pointerup: pointerUp, pointercancel: pointerCancel,
    wheel, keydown: keyDown, dragstart: dragStart, blur: cancel }
  for (const [name, listener] of Object.entries(events)) target.addEventListener(name, listener, { passive: false, capture: true })
  return () => { for (const [name, listener] of Object.entries(events)) target.removeEventListener(name, listener, true) }
}

export default function useNemoGestures({ mode, onUp, onDown }) {
  useEffect(() => attachNemoGestures({ target: window, document, mode, onUp, onDown }), [mode, onUp, onDown])
}
