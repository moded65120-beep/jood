import { useId, useState, useSyncExternalStore } from 'react'
import { BadgeCheck, BriefcaseMedical, Mail, Pencil, Phone, UserRound } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import DoctorPhotoEditor from '../../components/doctor/DoctorPhotoEditor.jsx'
import { doctorContactErrors, doctorProfileRepository } from '../../services/doctorProfileRepository.js'
import './DoctorProfile.css'

const emptyProfile = JSON.stringify({ phone: '', email: '', bio: '' })

export default function DoctorProfile({ doctor }) {
  const { language, t } = useLanguage()
  const p = key => t('doctorProfilePage.' + key)
  const id = useId()
  const snapshot = useSyncExternalStore(doctorProfileRepository.subscribe, () => {
    try { return JSON.stringify(doctorProfileRepository.read(doctor.id)) } catch { return null }
  }, () => emptyProfile)
  const details = snapshot === null ? null : JSON.parse(snapshot)
  const [contact, setContact] = useState(null)
  const [bio, setBio] = useState(null)
  const [errors, setErrors] = useState({})
  const [contactMessage, setContactMessage] = useState('')
  const [bioMessage, setBioMessage] = useState('')
  const name = language === 'ar' ? doctor.nameAr || doctor.name : doctor.name
  const specialty = language === 'ar' ? doctor.specialtyAr || doctor.specialty : doctor.specialty
  const role = p(language === 'ar' && doctor.gender === 'female' ? 'femaleDoctor' : 'doctor')
  const experience = doctor.yearsOfExperience
  function saveContact(event) {
    event.preventDefault()
    if (!contact || !details) return
    const invalid = doctorContactErrors(contact)
    setErrors(invalid)
    setContactMessage('')
    if (invalid.phone || invalid.email) return
    try {
      doctorProfileRepository.save(doctor.id, contact)
      setContact(null)
      setContactMessage('saved')
    } catch (error) { setContactMessage(error.message === 'notAllowed' ? 'notAllowed' : 'saveFailed') }
  }
  function saveBio(event) {
    event.preventDefault()
    if (bio === null || !details) return
    setBioMessage('')
    try {
      doctorProfileRepository.save(doctor.id, { bio })
      setBio(null)
      setBioMessage('saved')
    } catch (error) { setBioMessage(['notAllowed', 'bioTooLong'].includes(error.message) ? error.message : 'saveFailed') }
  }
  return <section className="doctor-profile-page" lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'} aria-labelledby={id + '-title'}>
    <header className="doctor-profile-banner"><h2 id={id + '-title'}>{p('title')}</h2><p>{p('subtitle')}</p></header>
    <section className="doctor-profile-card doctor-profile-identity" aria-label={p('identity')}>
      <DoctorPhotoEditor key={doctor.id} doctorId={doctor.id} compact />
      <div className="doctor-profile-identity-copy"><span className="doctor-profile-role"><BadgeCheck size={16} aria-hidden="true" />{role}</span><h3>{name}</h3><p>{specialty}</p><small>{t('doctorProfiles.storageNote')}</small></div>
    </section>
    {!details && <p role="alert" className="doctor-profile-error">{p('loadFailed')}</p>}
    <div className="doctor-profile-columns">
      <section className="doctor-profile-card" aria-labelledby={id + '-contact'}>
        <header className="doctor-profile-card-heading"><h3 id={id + '-contact'}><span><Phone size={20} aria-hidden="true" /></span>{p('contact')}</h3>{contact === null && <button type="button" disabled={!details} onClick={() => { setContact({ phone: details.phone, email: details.email }); setErrors({}); setContactMessage('') }}><Pencil size={15} aria-hidden="true" />{p('editContact')}</button>}</header>
        {contact === null ? <dl className="doctor-profile-facts"><div><dt><Phone size={16} aria-hidden="true" />{p('phone')}</dt><dd><bdi dir="ltr">{details?.phone || p('notProvided')}</bdi></dd></div><div><dt><Mail size={16} aria-hidden="true" />{p('email')}</dt><dd><bdi dir="ltr">{details?.email || p('notProvided')}</bdi></dd></div></dl> : <form className="doctor-profile-form" noValidate onSubmit={saveContact}>
          {['phone', 'email'].map(field => <div key={field}><label htmlFor={id + '-' + field}>{p(field)}</label><input id={id + '-' + field} type={field === 'email' ? 'email' : 'tel'} autoComplete={field === 'email' ? 'email' : 'tel'} dir="ltr" maxLength={field === 'email' ? 254 : 40} value={contact[field]} aria-invalid={Boolean(errors[field]) || undefined} aria-describedby={errors[field] ? id + '-' + field + '-error' : undefined} onChange={event => { const next = { ...contact, [field]: event.target.value }; setContact(next); if (errors[field]) setErrors(previous => ({ ...previous, [field]: doctorContactErrors(next)[field] })) }} />{errors[field] && <p id={id + '-' + field + '-error'} className="doctor-profile-error" role="alert">{p(errors[field])}</p>}</div>)}
          <div className="doctor-profile-actions"><button type="submit" className="doctor-profile-save" disabled={!details}>{p('save')}</button><button type="button" onClick={() => { setContact(null); setErrors({}); setContactMessage('') }}>{p('cancel')}</button></div>
        </form>}
        {contactMessage && <p role={contactMessage === 'saved' ? 'status' : 'alert'} className={contactMessage === 'saved' ? 'doctor-profile-success' : 'doctor-profile-error'}>{p(contactMessage)}</p>}
      </section>
      <section className="doctor-profile-card" aria-labelledby={id + '-about'}>
        <header className="doctor-profile-card-heading"><h3 id={id + '-about'}><span><UserRound size={20} aria-hidden="true" /></span>{p('about')}</h3>{bio === null && <button type="button" disabled={!details} onClick={() => { setBio(details.bio); setBioMessage('') }}><Pencil size={15} aria-hidden="true" />{p('editAbout')}</button>}</header>
        {bio === null ? <p className={'doctor-profile-bio' + (details?.bio ? '' : ' doctor-profile-muted')} dir="auto">{details?.bio || p('emptyBio')}</p> : <form className="doctor-profile-form" onSubmit={saveBio}><label htmlFor={id + '-bio'}>{p('bioLabel')}</label><textarea id={id + '-bio'} value={bio} maxLength={2000} rows={5} dir="auto" onChange={event => setBio(event.target.value)} /><div className="doctor-profile-actions"><button type="submit" className="doctor-profile-save" disabled={!details}>{p('save')}</button><button type="button" onClick={() => { setBio(null); setBioMessage('') }}>{p('cancel')}</button></div></form>}
        {bioMessage && <p role={bioMessage === 'saved' ? 'status' : 'alert'} className={bioMessage === 'saved' ? 'doctor-profile-success' : 'doctor-profile-error'}>{p(bioMessage)}</p>}
      </section>
    </div>
    <section className="doctor-profile-card" aria-labelledby={id + '-professional'}><header className="doctor-profile-card-heading"><h3 id={id + '-professional'}><span><BriefcaseMedical size={20} aria-hidden="true" /></span>{p('professional')}</h3></header><dl className="doctor-profile-facts"><div><dt>{p('specialty')}</dt><dd>{specialty}</dd></div>{Number.isFinite(experience) && experience >= 0 && <div><dt>{p('experience')}</dt><dd>{new Intl.NumberFormat(language).format(experience)} {p('years')}</dd></div>}</dl></section>
  </section>
}
