import { canonicalChildId } from './demoChildAccess.js'
import { createChildHealthLog } from './childHealthLog.js'

const validPatch = patch => patch && typeof patch === 'object' && !Array.isArray(patch) && Object.keys(patch).length > 0 && Object.keys(patch).every(key => ['answer', 'note'].includes(key)) && (!Object.hasOwn(patch, 'answer') || [null, 'yes', 'notYet', 'unsure'].includes(patch.answer)) && (!Object.hasOwn(patch, 'note') || typeof patch.note === 'string')
export function createMilestonesRepository(options) {
  const log = createChildHealthLog('milestones', value => value && typeof value.skillId === 'string' && value.skillId.length > 0 && typeof value.motherId === 'string' && value.motherId.length > 0 && Boolean(canonicalChildId(value.childId)) && validPatch(value.patch) && typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt)), options)
  function bucket(id, motherId) {
    const childId = canonicalChildId(id)
    if (!childId) throw Error('missingChildId')
    if (typeof motherId !== 'string' || !motherId.trim()) throw Error('missingMotherId')
    return { childId, key: JSON.stringify([childId, motherId]) }
  }
  function read(id, motherId) {
    const { childId, key } = bucket(id, motherId), records = {}
    for (const { value } of log.read(key)) {
      if (value.childId !== childId || value.motherId !== motherId) throw Error('invalidStorage')
      Object.defineProperty(records, value.skillId, { value: { answer: null, note: '', ...records[value.skillId], ...value.patch, childId, motherId, milestoneId: value.skillId, updatedAt: value.updatedAt }, enumerable: true, configurable: true, writable: true })
    }
    return records
  }
  function saveResponse(id, motherId, skillId, patch) {
    const { childId, key } = bucket(id, motherId)
    const current = read(childId, motherId)[skillId]
    if (!validPatch(patch)) throw Error('invalidRecord')
    if (current && Object.entries(patch).every(([key, value]) => current[key] === value)) return current
    log.append(key, { childId, motherId, skillId, patch, updatedAt: new Date().toISOString() })
    return read(childId, motherId)[skillId]
  }
  return { read, saveResponse, subscribe: log.subscribe }
}
export const milestonesRepository = createMilestonesRepository()
