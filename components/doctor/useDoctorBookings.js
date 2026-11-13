import { useRef, useState } from 'react'
import { loadBookings, persistBookings } from './appointmentsStorage.js'
import { submitBooking, decideBooking, saveAvailability } from './appointmentsData.js'

export default function useDoctorBookings(doctorId) {
  const [loaded] = useState(() => loadBookings(doctorId))
  const [state, setState] = useState(loaded.state)
  const current = useRef(loaded.state)
  const [warning, setWarning] = useState(loaded.warning)
  function transact(operation) {
    const result = operation(current.current)
    if (result.error) return result
    const next = { ...result.state, revision: current.current.revision + 1 }
    const error = persistBookings(next, current.current.revision)
    if (error) { setWarning(error); return { error } }
    current.current = next
    setState(next); setWarning(null)
    return { ...result, state: next }
  }
  return { state, warning, save: availability => transact(value => saveAvailability(value, availability)), submit: draft => transact(value => submitBooking(value, draft)), decide: (id, decision, reason) => transact(value => decideBooking(value, id, decision, reason)) }
}
