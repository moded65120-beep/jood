// Browser-only fictional development accounts. This is not production authentication.
export const parentAccountsKey = 'nomu.demo.parentAccounts.v1'
const roles = { mother: '300', father: '400' }
const reservedIds = ['1000000001', '2000000001', '3000000001', '4000000001', '9876543210', '1234567890']
const error = key => 'parentRegistration.' + key

export function readParentAccounts(storage) {
  const raw = storage.getItem(parentAccountsKey)
  if (raw === null) return []
  const records = JSON.parse(raw)
  if (!Array.isArray(records)) throw Error('Invalid demo account storage')
  const ids = new Set(), emails = new Set()
  for (const account of records) {
    if (!account || !Object.hasOwn(roles, account.role) || !/^\d{10}$/.test(account.id) || !account.id.startsWith(roles[account.role]) || reservedIds.includes(account.id) || typeof account.name !== 'string' || !account.name.trim() || typeof account.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email) || !/^[a-f0-9]{32}$/.test(account.salt) || !/^[a-f0-9]{64}$/.test(account.hash) || ids.has(account.id) || emails.has(account.email.toLowerCase())) throw Error('Invalid demo account record')
    ids.add(account.id); emails.add(account.email.toLowerCase())
  }
  return records
}

export async function parentPasswordHash(password, salt, cryptoApi = globalThis.crypto) {
  const bytes = new TextEncoder()
  const key = await cryptoApi.subtle.importKey('raw', bytes.encode(password), 'PBKDF2', false, ['deriveBits'])
  const result = await cryptoApi.subtle.deriveBits({ name: 'PBKDF2', salt: bytes.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256)
  return Array.from(new Uint8Array(result), value => value.toString(16).padStart(2, '0')).join('')
}

export async function registerParentDemo(values, storage = window.localStorage, cryptoApi = globalThis.crypto) {
  const errors = {}
  for (const field of ['fullName', 'email', 'nationalId', 'password', 'confirmPassword']) {
    if (typeof values[field] !== 'string' || !values[field].trim()) errors[field] = `mother.registration.${field}Required`
  }
  if (!Object.hasOwn(roles, values.role)) errors.role = error('roleRequired')
  if (values.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'mother.registration.emailInvalid'
  if (values.nationalId?.trim() && (!/^\d{10}$/.test(values.nationalId.trim()) || !Object.hasOwn(roles, values.role) || !values.nationalId.trim().startsWith(roles[values.role]))) errors.nationalId = error('idInvalid')
  if (values.password && values.password.length < 8) errors.password = 'mother.registration.passwordShort'
  if (values.confirmPassword && values.password !== values.confirmPassword) errors.confirmPassword = 'mother.registration.passwordMismatch'
  if (values.phone !== undefined && (typeof values.phone !== 'string' || !/^\+?\d{7,15}$/.test(values.phone))) errors.phone = error('phoneInvalid')
  if (Object.keys(errors).length) return { errors }
  try {
    const id = values.nationalId.trim(), email = values.email.trim().toLowerCase()
    const duplicates = records => {
      if (reservedIds.includes(id) || records.some(account => account.id === id)) errors.nationalId = error('duplicateId')
      if (records.some(account => account.email.toLowerCase() === email)) errors.email = error('duplicateEmail')
    }
    duplicates(readParentAccounts(storage))
    if (Object.keys(errors).length) return { errors }
    const salt = Array.from(cryptoApi.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join('')
    const hash = await parentPasswordHash(values.password, salt, cryptoApi)
    // Reread after async hashing to preserve registrations made while awaiting it.
    const records = readParentAccounts(storage)
    duplicates(records)
    if (Object.keys(errors).length) return { errors }
    storage.setItem(parentAccountsKey, JSON.stringify([...records, { id, email, name: values.fullName.trim(), role: values.role, salt, hash, ...(values.phone !== undefined ? { phone: values.phone } : {}) }]))
    return { success: true }
  } catch { return { errors: { form: error('storageError') } } }
}
