import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, Eye, EyeOff, Users, Stethoscope } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { loginNemoPortal, registerNemoParent } from '../../services/nemoPortalFlow.js'
import './NemoAuthScreen.css'

const initialValues = { nationalId: '', fullName: '', email: '', password: '', phone: '' }

export default function NemoAuthScreen({ audience, leaving = false }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [values, setValues] = useState(initialValues)
  const [visible, setVisible] = useState(false)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const heading = useRef(null)
  const form = useRef(null)
  const isParent = audience === 'parent'
  const signup = isParent && mode === 'signup'
  const titleKey = signup ? 'signupTitle' : isParent ? 'parentTitle' : 'doctorTitle'
  const fields = [
    { name: 'nationalId', label: isParent ? 'nationalId' : 'doctorId', autoComplete: 'username', inputMode: 'numeric' },
    ...(signup ? [{ name: 'fullName', label: 'fullName', autoComplete: 'name' }, { name: 'email', label: 'email', type: 'email', autoComplete: 'email' }] : []),
    { name: 'password', label: 'password', type: visible ? 'text' : 'password', autoComplete: signup ? 'new-password' : 'current-password' },
    ...(signup ? [{ name: 'phone', label: 'phone', type: 'tel', autoComplete: 'tel' }] : []),
  ]

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => heading.current?.focus({ preventScroll: true }), reduced ? 0 : 650)
    return () => window.clearTimeout(timer)
  }, [])

  function switchMode(next) {
    if (pending.current) return
    setMode(next); setErrors({}); setVisible(false); setSuccess(false)
    setValues(previous => ({ ...previous, password: '' }))
  }

  async function submit(event) {
    event.preventDefault()
    if (pending.current) return
    const next = {}
    for (const { name } of fields) if (!values[name].trim()) next[name] = `home.nemoAuth.${name}Required`
    setErrors(next); setSuccess(false)
    if (Object.keys(next).length) { form.current?.elements[Object.keys(next)[0]]?.focus(); return }
    pending.current = true; setBusy(true)
    try {
      if (signup) {
        const result = await registerNemoParent(values)
        if (result.errors) {
          setErrors(result.errors)
          form.current?.elements[Object.keys(result.errors)[0]]?.focus()
          return
        }
        setMode('login'); setSuccess(true); setVisible(false)
        setValues(previous => ({ ...previous, password: '' }))
      } else {
        const result = await loginNemoPortal(audience, values.nationalId, values.password)
        if (result.error) { setErrors({ form: result.error }); return }
        navigate(result.dashboard, { replace: true })
      }
    } catch { setErrors({ form: 'home.nemoAuth.unavailable' }) }
    finally { pending.current = false; setBusy(false) }
  }

  const Icon = isParent ? Users : Stethoscope
  return <section className={`nemo-auth${leaving ? ' nemo-auth--leaving' : ''}`} aria-labelledby="nemo-auth-title" inert={leaving}>
    <p className="nemo-auth__gesture-hint"><ArrowDown aria-hidden="true" /><span>{t('home.nemoAuth.swipeDown')}</span></p>
    <div className="nemo-auth__shell">
      <div className="nemo-auth__card">
        <span className="nemo-auth__icon"><Icon aria-hidden="true" /></span>
        <h1 id="nemo-auth-title" ref={heading} tabIndex={-1}>{t(`home.nemoAuth.${titleKey}`)}</h1>
        <p>{t(isParent ? 'home.nemoAuth.parentSubtitle' : 'home.nemoAuth.doctorSubtitle')}</p>
        {isParent && <div className="nemo-auth__modes" role="group" aria-label={t('home.nemoAuth.modeLabel')}>
          {['login', 'signup'].map(value => <button key={value} type="button" aria-pressed={mode === value} disabled={busy} onClick={() => switchMode(value)}>{t(`home.nemoAuth.${value}`)}</button>)}
        </div>}
        {success && <p className="nemo-auth__success" role="status">{t('parentRegistration.success')}</p>}
        <form ref={form} onSubmit={submit} noValidate aria-busy={busy}>
          {fields.map(({ name, label, type = 'text', autoComplete, inputMode }) => <div className="nemo-auth__field" key={name}>
            <label htmlFor={`nemo-auth-${name}`}>{t(`home.nemoAuth.${label}`)}</label>
            <div className="nemo-auth__input-wrap">
              <input id={`nemo-auth-${name}`} name={name} type={type} autoComplete={autoComplete} inputMode={inputMode} value={values[name]} dir={name === 'fullName' ? 'auto' : 'ltr'} required disabled={busy} placeholder={t(`home.nemoAuth.${label}Placeholder`)} onChange={event => {
                setValues(previous => ({ ...previous, [name]: event.target.value }))
                setErrors(previous => ({ ...previous, [name]: '', form: '' }))
              }} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `nemo-auth-${name}-error` : undefined} />
              {name === 'password' && <button type="button" className="nemo-auth__visibility" onClick={() => setVisible(previous => !previous)} aria-label={t(visible ? 'auth.hidePassword' : 'auth.showPassword')} aria-controls="nemo-auth-password" aria-pressed={visible}>{visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>}
            </div>
            {errors[name] && <p className="nemo-auth__error" id={`nemo-auth-${name}-error`} role="alert">{t(errors[name])}</p>}
          </div>)}
          {errors.form && <p className="nemo-auth__error nemo-auth__error--form" role="alert">{t(errors.form)}</p>}
          <button className="nemo-auth__submit" type="submit" disabled={busy}>{t(busy ? 'common.loading' : signup ? 'home.nemoAuth.createAccount' : 'home.nemoAuth.signIn')}</button>
        </form>
        {signup && <p className="nemo-auth__hint">{t('home.nemoAuth.demoIdHint')}</p>}
        <small>{t(signup ? 'parentRegistration.notice' : 'unifiedLogin.demoNotice')}</small>
      </div>
    </div>
  </section>
}
