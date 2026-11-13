import { useEffect, useState } from 'react'
import { demoBookingsChanged, demoBookingsKey, readDemoBookings } from '../services/motherDemoBookings.js'

// All booking consumers read the same service and subscribe to same-tab and storage events.
export default function useDemoBookings() {
  const read = () => {
    try { return { records: readDemoBookings(), error: '' } } catch { return { records: [], error: 'storageError' } }
  }
  const [state, setState] = useState(read)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => { setState(read()); setNow(new Date()) }
    const storage = event => { if (!event.key || event.key === demoBookingsKey) refresh() }
    window.addEventListener(demoBookingsChanged, refresh)
    window.addEventListener('storage', storage)
    window.addEventListener('focus', refresh)
    const timer = setInterval(refresh, 30000)
    return () => {
      window.removeEventListener(demoBookingsChanged, refresh)
      window.removeEventListener('storage', storage)
      window.removeEventListener('focus', refresh)
      clearInterval(timer)
    }
  }, [])
  return { ...state, now }
}
