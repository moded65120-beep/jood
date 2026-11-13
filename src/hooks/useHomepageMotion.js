import { useEffect } from 'react'

// One passive listener and one animation frame update for the public scroll surface.
export default function useHomepageMotion(scrollRoot, active) {
  useEffect(() => {
    const surface = scrollRoot.current
    if (!active || !surface) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const photos = [...surface.querySelectorAll('[data-parallax]')]
    const journey = surface.querySelector('.home-services')
    let frame = 0
    let furthest = 0
    function update() {
      frame = 0
      if (preference.matches) return
      const viewport = surface.getBoundingClientRect()
      photos.forEach(photo => {
        const rect = photo.getBoundingClientRect()
        if (rect.bottom < viewport.top || rect.top > viewport.bottom) return
        const progress = Math.max(-1, Math.min(1, (viewport.top + viewport.height / 2 - rect.top - rect.height / 2) / viewport.height))
        photo.style.setProperty('--photo-drift', `${(progress * 14).toFixed(2)}px`)
        photo.style.setProperty('--accent-drift', `${(progress * -9).toFixed(2)}px`)
      })
      if (journey) {
        const rect = journey.getBoundingClientRect()
        furthest = Math.max(furthest, Math.min(1, Math.max(0, (viewport.bottom - rect.top) / rect.height)))
        journey.style.setProperty('--journey-progress', furthest.toFixed(4))
      }
    }
    const schedule = () => { if (!frame && !preference.matches) frame = window.requestAnimationFrame(update) }
    const resetMotion = () => {
      if (preference.matches) {
        window.cancelAnimationFrame(frame); frame = 0
        photos.forEach(photo => { photo.style.removeProperty('--photo-drift'); photo.style.removeProperty('--accent-drift') })
        journey?.style.setProperty('--journey-progress', '1')
      } else schedule()
    }
    surface.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    preference.addEventListener('change', resetMotion)
    resetMotion()
    return () => {
      window.cancelAnimationFrame(frame)
      surface.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      preference.removeEventListener('change', resetMotion)
    }
  }, [scrollRoot, active])
}
