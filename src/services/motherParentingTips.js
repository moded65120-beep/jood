import { parentingTips } from '../pages/mother/parentingTipsData.js'

export const tipSessionKey = 'nomu.demo.parentingTip.session.v1'
export const lastTipKey = 'nomu.demo.parentingTip.last.v1'

// A tip session is per browser tab, separate from authentication. A new router entry
// into MotherLayout starts a fresh tip; nested page navigation keeps that layout mounted.
// A page refresh is a POP entry and preserves the tab's saved tip. This is not an auth session.
export function createTipSession({ sessionStorage, localStorage, random = Math.random }) {
  let currentTip = null
  let lastDisplayedTip = null
  let lastPortalEntryKey = null
  const find = id => parentingTips.find(tip => tip.id === id)
  const read = (storage, key) => { try { return storage.getItem(key) } catch { return null } }
  const write = (storage, key, value) => { try { storage.setItem(key, value) } catch { /* Keep the in-memory tip usable when storage is blocked. */ } }
  const remember = tip => {
    currentTip = tip
    lastDisplayedTip = tip.id
    write(sessionStorage, tipSessionKey, tip.id)
    write(localStorage, lastTipKey, tip.id)
    return tip
  }
  const choose = previous => {
    const choices = parentingTips.filter(tip => tip.id !== previous)
    return choices[Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)))]
  }
  return {
    enter(navigationType, entryKey) {
      // The demo login navigates with PUSH. Deduplicate React StrictMode initializers.
      if (['PUSH', 'REPLACE'].includes(navigationType) && entryKey && entryKey !== lastPortalEntryKey) {
        this.end()
        lastPortalEntryKey = entryKey
      }
      return this.current()
    },
    current() {
      if (currentTip) return currentTip
      const saved = find(read(sessionStorage, tipSessionKey))
      return remember(saved || choose(read(localStorage, lastTipKey) || lastDisplayedTip))
    },
    next() {
      const previous = this.current()
      return remember(choose(previous.id))
    },
    end() {
      currentTip = null
      try { sessionStorage.removeItem(tipSessionKey) } catch { /* No auth or booking data is cleared. */ }
    },
  }
}

const storageProxy = name => ({
  getItem: key => window[name].getItem(key),
  setItem: (key, value) => window[name].setItem(key, value),
  removeItem: key => window[name].removeItem(key),
})
const tips = createTipSession({ sessionStorage: storageProxy('sessionStorage'), localStorage: storageProxy('localStorage') })
export const getSessionParentingTip = () => tips.current()
export const nextParentingTip = () => tips.next()
export const endParentingTipSession = () => tips.end()
export const beginParentingTipVisit = (navigationType, entryKey) => tips.enter(navigationType, entryKey)
