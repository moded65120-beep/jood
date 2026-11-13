// Frontend demo persistence, not authentication or authorization. Append-only
// entries avoid cross-tab read/modify/write loss; repository APIs are the API boundary.
export function createChildHealthLog(namespace, validate, options = {}) {
  const target = () => options.storage || window.localStorage
  const events = () => options.events || (typeof window !== 'undefined' ? window : null)
  const prefix = `nomu.demo.${namespace}.v1.`
  const changed = `nomu:${namespace}-changed`
  function read(bucket) {
    const storage = target(), entries = [], start = prefix + encodeURIComponent(bucket) + '.'
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index)
      if (!key?.startsWith(start)) continue
      const raw = storage.getItem(key)
      if (raw === null) continue
      const entry = JSON.parse(raw)
      if (entry?.version !== 1 || typeof entry.id !== 'string' || key !== start + entry.id || !Number.isSafeInteger(entry.order) || entry.order < 1 || !validate(entry.value)) throw Error('invalidStorage')
      entries.push(entry)
    }
    return entries.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  }
  function append(bucket, value) {
    if (!validate(value)) throw Error('invalidRecord')
    const entries = read(bucket) // Fail closed on malformed or inaccessible storage.
    const id = (options.uuid || (() => crypto.randomUUID()))()
    const entry = { version: 1, id, order: (entries.at(-1)?.order || 0) + 1, value }
    const storage = target(), key = prefix + encodeURIComponent(bucket) + '.' + id
    if (storage.getItem(key) !== null) throw Error('recordConflict')
    storage.setItem(key, JSON.stringify(entry))
    events()?.dispatchEvent(new Event(changed))
    return entry
  }
  function subscribe(listener) {
    const host = events()
    const onStorage = event => { if (!event.key || event.key.startsWith(prefix)) listener() }
    host?.addEventListener(changed, listener)
    host?.addEventListener('storage', onStorage)
    host?.addEventListener('focus', listener)
    host?.addEventListener('pageshow', listener)
    return () => {
      host?.removeEventListener(changed, listener)
      host?.removeEventListener('storage', onStorage)
      host?.removeEventListener('focus', listener)
      host?.removeEventListener('pageshow', listener)
    }
  }
  return { read, append, subscribe, prefix }
}
