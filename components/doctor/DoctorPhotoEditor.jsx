import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import DoctorPortrait from '../common/DoctorPortrait.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { saveOwnDoctorPhoto, validateDoctorPhoto } from '../../services/doctorPhotoRepository.js'
import './DoctorPhotoEditor.css'
export default function DoctorPhotoEditor({ doctorId, compact = false }) {
  const { t }=useLanguage()
  const [file,setFile]=useState(null),[preview,setPreview]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  const input=useRef(null)
  const pt=key=>t('doctorProfiles.'+key)
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview])
  async function choose(event) {
    const selected=event.target.files?.[0];event.target.value='';setMessage('')
    if(!selected)return
    try {await validateDoctorPhoto(selected);setFile(selected);setPreview(URL.createObjectURL(selected))}catch(error){setFile(null);setPreview('');setMessage(['invalidFormat','tooLarge'].includes(error.message)?error.message:'uploadFailed')}
  }
  async function save(){setBusy(true);setMessage('');try{await saveOwnDoctorPhoto(doctorId,file);setFile(null);setPreview('');setMessage('updated')}catch(error){setMessage(['invalidFormat','tooLarge','notAllowed'].includes(error.message)?error.message:'uploadFailed')}finally{setBusy(false)}}
  return <div className={`doctor-photo-editor${compact ? ' doctor-photo-editor--compact' : ''}`}><input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={choose} aria-label={pt('uploadPhoto')}/><div className={compact ? 'doctor-profile-photo' : undefined}>{compact && (preview ? <img src={preview} alt={pt('preview')}/> : <DoctorPortrait doctorId={doctorId} />)}<button type="button" disabled={busy} aria-label={pt('changePhoto')} title={pt('changePhoto')} onClick={()=>input.current?.click()}>{compact ? <Camera size={18} aria-hidden="true"/> : pt('changePhoto')}</button></div><small>{pt('sizeLimit')}</small>{!compact && <small>{pt('storageNote')}</small>}{file&&<div className="doctor-photo-editor__actions">{!compact && <img src={preview} alt={pt('preview')}/>}<button type="button" disabled={busy} onClick={save}>{pt('savePhoto')}</button><button type="button" disabled={busy} onClick={()=>{setFile(null);setPreview('');setMessage('')}}>{t('common.cancel')}</button></div>}{message&&<p role="status">{pt(message)}</p>}</div>
}
