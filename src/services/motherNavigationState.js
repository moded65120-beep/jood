const entries = new Map()

export function readMotherVisit(key, history = globalThis.window?.history) {
  const state = history?.state
  if ((state?.key || 'default') === key && state?.nomuMotherVisit) return state.nomuMotherVisit
  return entries.get(key) || { ui: {} }
}

export function writeMotherVisit(key, patch, history = globalThis.window?.history) {
  const previous = readMotherVisit(key, history)
  const next = { ...previous, ...patch, ui: { ...previous.ui, ...patch.ui } }
  entries.set(key, next)
  if (entries.size > 100) entries.delete(entries.keys().next().value)
  if (history && (history.state?.key || 'default') === key) {
    try { history.replaceState({ ...history.state, nomuMotherVisit: next }, '') } catch { }
  }
  return next
}

export function motherBack(navigate, fallback, history = globalThis.window?.history) {
  if (Number.isInteger(history?.state?.idx) && history.state.idx > 0) navigate(-1)
  else navigate(fallback, { replace: true })
}

export function captureMotherScroll(main, host = window) {
  const containers = []
  for (const element of [main, ...main.querySelectorAll('*')]) {
    if (!element.scrollTop && !element.scrollLeft) continue
    const path = []
    let current = element
    while (current !== main) {
      path.unshift([...current.parentElement.children].indexOf(current))
      current = current.parentElement
    }
    containers.push({ path, top: element.scrollTop, left: element.scrollLeft })
  }
  return { x: host.scrollX, y: host.scrollY, containers }
}

export function restoreMotherScroll(main, position, host = window) {
  host.scrollTo(position.x || 0, position.y || 0)
  let ready = Math.abs(host.scrollY - (position.y || 0)) < 2
  for (const item of position.containers || []) {
    const element = item.path.reduce((parent, index) => parent?.children[index], main)
    if (!element) { ready = false; continue }
    element.scrollTop = item.top
    element.scrollLeft = item.left
    if (Math.abs(element.scrollTop - item.top) > 1 || Math.abs(element.scrollLeft - item.left) > 1) ready = false
  }
  return ready
}
