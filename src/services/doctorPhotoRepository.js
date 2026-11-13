import { getDoctorProfile } from './doctorDirectory.js'
import { currentDoctorProfile } from './currentDoctorProfile.js'
export const doctorPhotosChanged = 'nomu:doctor-photo-changed'
export const MAX_DOCTOR_PHOTO_BYTES = 2 * 1024 * 1024
function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('nomu.demo.doctorPhotos.v1', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('photos')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(Error('uploadFailed'))
    request.onblocked = () => reject(Error('uploadFailed'))
  })
}
export async function validateDoctorPhoto(file) {
  if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size === 0) throw Error('invalidFormat')
  if (file.size > MAX_DOCTOR_PHOTO_BYTES) throw Error('tooLarge')
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const signature = file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : file.type === 'image/png' ? [...bytes.slice(0,8)].join(',') === '137,80,78,71,13,10,26,10' : String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP'
  if (!signature) throw Error('invalidFormat')
}
export async function readDoctorPhoto(id) {
  if (!getDoctorProfile(id)) return null
  const db = await database()
  try { return await new Promise((resolve, reject) => { const transaction = db.transaction('photos','readonly'); const request = transaction.objectStore('photos').get(id); request.onsuccess=()=>resolve(request.result || null); request.onerror=()=>reject(Error('uploadFailed')) }) } finally { db.close() }
}
// Browser demo permissions only, not secure authorization. IndexedDB is local to this origin/device.
export async function saveOwnDoctorPhoto(id, file) {
  if (currentDoctorProfile()?.id !== id) throw Error('notAllowed')
  await validateDoctorPhoto(file)
  // Decode before persistence, not just MIME/extension validation.
  const bitmap = await createImageBitmap(file).catch(() => { throw Error('invalidFormat') })
  bitmap.close()
  if (currentDoctorProfile()?.id !== id) throw Error('notAllowed')
  const db = await database()
  try { if (currentDoctorProfile()?.id !== id) throw Error('notAllowed'); await new Promise((resolve,reject)=>{ const transaction=db.transaction('photos','readwrite'); transaction.objectStore('photos').put(file,id); transaction.oncomplete=resolve; transaction.onerror=()=>reject(Error('uploadFailed')); transaction.onabort=()=>reject(Error('uploadFailed')) }) } finally { db.close() }
  window.dispatchEvent(new Event(doctorPhotosChanged))
}
