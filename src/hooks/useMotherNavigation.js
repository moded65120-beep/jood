import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { captureMotherScroll, motherBack, readMotherVisit, restoreMotherScroll, writeMotherVisit } from '../services/motherNavigationState.js'

export function useMotherScrollRestoration() {
  const location = useLocation()
  const type = useNavigationType()
  const main = useRef(null)
  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => { window.history.scrollRestoration = previous }
  }, [])
  useLayoutEffect(() => {
    const element = main.current
    if (!element) return
    const position = type === 'POP' ? readMotherVisit(location.key).scroll : null
    let frame, timer, observer, mutations, stopped = false
    function queue() { cancelAnimationFrame(frame); frame = requestAnimationFrame(apply) }
    const stop = () => { stopped = true; cancelAnimationFrame(frame); clearTimeout(timer); observer?.disconnect(); mutations?.disconnect(); element.removeEventListener('load', queue, true) }
    const apply = () => {
      if (stopped) return
      if (restoreMotherScroll(element, position || { x: 0, y: 0 })) stop()
    }
    apply()
    if (!stopped && position) {
      observer = new ResizeObserver(queue)
      observer.observe(element)
      observer.observe(document.body)
      mutations = new MutationObserver(queue)
      mutations.observe(element, { childList: true, subtree: true, attributes: true })
      element.addEventListener('load', queue, true)
      timer = setTimeout(stop, 1500)
    }
    const save = () => {
      if (!stopped && position) return
      writeMotherVisit(location.key, { scroll: captureMotherScroll(element) })
    }
    const leave = () => { stop(); save() }
    const interact = () => stop()
    window.addEventListener('scroll', save, true)
    document.addEventListener('click', leave, true)
    window.addEventListener('pagehide', leave)
    for (const event of ['wheel', 'touchstart', 'keydown', 'pointerdown']) window.addEventListener(event, interact, { passive: true })
    return () => {
      if (element.isConnected) writeMotherVisit(location.key, { scroll: captureMotherScroll(element) })
      stop()
      window.removeEventListener('scroll', save, true)
      document.removeEventListener('click', leave, true)
      window.removeEventListener('pagehide', leave)
      for (const event of ['wheel', 'touchstart', 'keydown', 'pointerdown']) window.removeEventListener(event, interact)
    }
  }, [location.key, type])
  return main
}

export function useMotherPageState(name, initial) {
  const { key } = useLocation()
  const [value, setValue] = useState(() => readMotherVisit(key).ui?.[name] ?? (typeof initial === 'function' ? initial() : initial))
  useEffect(() => { writeMotherVisit(key, { ui: { [name]: value } }) }, [key, name, value])
  return [value, setValue]
}

export function useMotherMilestoneNavigation(enabled) {
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  if (!enabled) return undefined
  const stage = Number(params.get('stage'))
  return {
    age: params.get('view') === 'skills' ? stage : null,
    preview: readMotherVisit(location.key).ui?.milestonePreview ?? (stage || null),
    previewChanged(months) { writeMotherVisit(location.key, { ui: { milestonePreview: months } }) },
    changeAge(months) {
      if (months == null) {
        const index = window.history.state?.idx
        const timeline = location.state?.milestoneTimelineIndex
        if (Number.isInteger(timeline) && Number.isInteger(index) && timeline >= 0 && timeline < index) navigate(timeline - index)
        else {
          params.delete('view')
          navigate({ pathname: location.pathname, search: params.toString() }, { replace: true })
        }
      } else {
        params.set('stage', String(months))
        params.set('view', 'skills')
        navigate({ pathname: location.pathname, search: params.toString() }, { state: { ...location.state, milestoneTimelineIndex: location.state?.milestoneTimelineIndex ?? window.history.state?.idx } })
      }
    },
    backToChild(fallback) { motherBack(navigate, fallback) },
  }
}
