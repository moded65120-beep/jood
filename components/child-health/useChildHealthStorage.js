import { useCallback, useEffect, useRef, useState } from 'react'
import { vaccinationRepository } from '../../services/vaccinationRepository.js'
import { milestonesRepository } from '../../services/milestonesRepository.js'

export function useVaccinationStorage(childId, parentRecords) {
  const source = JSON.stringify(parentRecords)
  const read = useCallback(() => {
    const records = JSON.parse(source)
    try { return { records: childId ? vaccinationRepository.read(childId, records) : [], error: false } }
    catch { return { records, error: true } }
  }, [childId, source])
  const [state, setState] = useState(read)
  const recordsRef = useRef(state.records)
  const refresh = useCallback(() => {
    const next = read()
    recordsRef.current = next.records
    setState(next)
  }, [read])
  useEffect(() => {
    const unsubscribe = vaccinationRepository.subscribe(refresh)
    try {
      if (childId) vaccinationRepository.importRecords(childId, JSON.parse(source))
    } catch {
      // Keep the existing records visible, but disable editing on a failed import.
      // eslint-disable-next-line react/set-state-in-effect
      setState(previous => ({ ...previous, error: true }))
      return unsubscribe
    }
    // Reconcile external browser storage between render and subscription.
    // eslint-disable-next-line react/set-state-in-effect
    refresh()
    return unsubscribe
  }, [refresh, childId, source])
  function applyVisit(record, expectedRecords) {
    const saved = vaccinationRepository.saveVisit(childId, record, { sourceRecords: JSON.parse(source), expectedRecords })
    refresh()
    return saved
  }
  function applyDose(record, expectedRecords) {
    const saved = vaccinationRepository.saveDose(childId, record, { sourceRecords: JSON.parse(source), expectedRecords })
    refresh()
    return saved
  }
  function correctDose(record, expectedRecords, actor, confirmReversal) {
    const saved = vaccinationRepository.correctDose(childId, record, { sourceRecords: JSON.parse(source), expectedRecords, actor, confirmReversal })
    refresh()
    return saved
  }
  function manageVisit(record, expectedRecords, actor, confirmReversal, cancelAppointment = false) {
    const saved = vaccinationRepository.manageVisit(childId, record, { sourceRecords: JSON.parse(source), expectedRecords, actor, confirmReversal, cancelAppointment })
    refresh()
    return saved
  }
  return { ...state, recordsRef, applyVisit, applyDose, correctDose, manageVisit }
}

export function useMilestonesStorage(childId, motherId) {
  const pending = useRef(new Map())
  const saving = useRef(false)
  const [state, setState] = useState(() => {
    try { return { records: childId && motherId ? milestonesRepository.read(childId, motherId) : {}, drafts: {}, status: '', loadError: false } }
    catch { return { records: {}, drafts: {}, status: '', loadError: true } }
  })
  const saved = useRef(state.records)
  const refresh = useCallback(() => {
    try {
      const records = childId && motherId ? milestonesRepository.read(childId, motherId) : {}
      saved.current = records
      setState(previous => ({ ...previous, records, loadError: false }))
      return true
    } catch { setState(previous => ({ ...previous, loadError: true })); return false }
  }, [childId, motherId])
  useEffect(() => {
    const unsubscribe = milestonesRepository.subscribe(refresh)
    // eslint-disable-next-line react/set-state-in-effect
    refresh()
    return unsubscribe
  }, [refresh])
  function update(skillId, patch) {
    if (state.loadError || saving.current || !childId || !motherId) return
    const draft = { ...pending.current.get(skillId), ...patch }
    for (const key of Object.keys(draft)) if (draft[key] === (saved.current[skillId]?.[key] ?? (key === 'answer' ? null : ''))) delete draft[key]
    if (Object.keys(draft).length) pending.current.set(skillId, draft)
    else pending.current.delete(skillId)
    setState(previous => ({ ...previous, drafts: Object.fromEntries(pending.current), status: '' }))
  }
  function discard(skillIds) {
    if (saving.current) return
    for (const id of skillIds || pending.current.keys()) pending.current.delete(id)
    setState(previous => ({ ...previous, drafts: Object.fromEntries(pending.current), status: '' }))
  }
  async function save(skillIds) {
    if (saving.current || state.loadError || !childId || !motherId) return false
    const entries = [...pending.current].filter(([id]) => skillIds.includes(id))
    if (!entries.length) return false
    saving.current = true
    setState(previous => ({ ...previous, status: 'saving' }))
    await new Promise(resolve => setTimeout(resolve, 0))
    try {
      for (const [id, patch] of entries) milestonesRepository.saveResponse(childId, motherId, id, patch)
      const records = milestonesRepository.read(childId, motherId)
      if (!entries.every(([id, patch]) => Object.entries(patch).every(([key, value]) => records[id]?.[key] === value))) throw Error('saveNotConfirmed')
      for (const [id] of entries) pending.current.delete(id)
      saved.current = records
      setState(previous => ({ ...previous, records, drafts: Object.fromEntries(pending.current), status: 'saved', loadError: false }))
      return true
    } catch {
      refresh()
      setState(previous => ({ ...previous, drafts: Object.fromEntries(pending.current), status: 'failed' }))
      return false
    } finally { saving.current = false }
  }
  return { ...state, update, save, discard, retry: refresh }
}
