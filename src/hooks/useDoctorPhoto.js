import { useEffect, useState } from 'react'
import { getDoctorProfile } from '../services/doctorDirectory.js'
import { readDoctorPhoto, doctorPhotosChanged } from '../services/doctorPhotoRepository.js'
export default function useDoctorPhoto(id) {
  const fallback = getDoctorProfile(id)?.defaultImage || ''
  const [photo, setPhoto] = useState(null)
  useEffect(() => {
    let disposed=false, revision=0, url=null
    async function refresh() {
      const current=++revision
      let blob
      try { blob=await readDoctorPhoto(id) } catch { blob=null }
      if (disposed || current!==revision) return
      if (url) URL.revokeObjectURL(url)
      url=blob ? URL.createObjectURL(blob) : null
      setPhoto({id,src:url || fallback})
    }
    refresh()
    window.addEventListener(doctorPhotosChanged,refresh)
    window.addEventListener('focus',refresh)
    return ()=>{disposed=true; if(url)URL.revokeObjectURL(url);window.removeEventListener(doctorPhotosChanged,refresh);window.removeEventListener('focus',refresh)}
  },[id,fallback])
  return photo?.id===id ? photo.src : fallback
}
