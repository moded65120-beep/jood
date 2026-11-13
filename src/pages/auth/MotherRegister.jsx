import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerParentDemo } from '../../services/parentDemoAccounts.js'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import LanguageSwitcher from '../../components/common/LanguageSwitcher.jsx'
import LogoSymbol from '../../components/common/LogoSymbol.jsx'
import './MotherRegister.css'

function RegisterIcon({ name, ...props }) {
  const paths = {
    user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 22v-2a8 8 0 0 1 16 0v2Z',
    email: 'M3 4h18v16H3ZM3 5l9 8 9-8',
    id: 'M2 4h20v16H2ZM2 8h20M10 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5 18a3 3 0 0 1 6 0M14 11h5M14 15h5',
    lock: 'M5 10h14v12H5ZM8 10V6a4 4 0 0 1 8 0v4M12 15v3',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    eyeOff: 'm3 3 18 18M10 5a12 12 0 0 1 12 7 17 17 0 0 1-3 4M6 6a18 18 0 0 0-4 6s3.5 7 10 7a11 11 0 0 0 5-1M10 10a3 3 0 0 0 4 4',
    arrow: 'M3 12h18m-7-7 7 7-7 7',
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]} /></svg>
}

const emptyValues = { role: 'mother', fullName: '', email: '', nationalId: '', password: '', confirmPassword: '' }
const fields = [
  { name: 'fullName', label: 'auth.fullName', icon: 'user', autoComplete: 'name' },
  { name: 'email', label: 'auth.emailAddress', icon: 'email', type: 'email', autoComplete: 'email' },
  { name: 'nationalId', label: 'auth.nationalId', icon: 'id', autoComplete: 'off' },
  { name: 'password', label: 'auth.password', icon: 'lock', type: 'password', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'auth.confirmPassword', icon: 'lock', type: 'password', autoComplete: 'new-password' },
]

export default function MotherRegister() {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const submitting = useRef(false)
  const [busy, setBusy] = useState(false)
  const [values, setValues] = useState(emptyValues)
  const [errors, setErrors] = useState({})
  const [visible, setVisible] = useState({ password: false, confirmPassword: false })
  const [message, setMessage] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setValues((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, form: '', [name]: '', ...(name === 'password' ? { confirmPassword: '' } : {}), ...(name === 'role' ? { nationalId: '' } : {}) }))
    setMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting.current) return
    const form = event.currentTarget
    submitting.current = true
    setBusy(true)
    setMessage('')
    try {
      const result = await registerParentDemo(values)
      setErrors(result.errors || {})
      if (result.errors) {
        form.elements[Object.keys(result.errors)[0]]?.focus()
        return
      }
      setVisible({ password: false, confirmPassword: false })
      setValues(emptyValues)
      navigate('/login', { state: { parentRegistered: true } })
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <main className="mother-register" lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'} aria-labelledby="mother-register-title">
      <div className="mother-register__layout">
        <aside className="mother-register__story" aria-labelledby="mother-register-story-title">
          <Link className="mother-register__brand" to="/" aria-label={t('mother.brandHome')}>
            <span className="mother-register__wordmark" lang="en" dir="ltr">nomu<LogoSymbol /></span>
            <span className="mother-register__brand-divider" aria-hidden="true" />
            <span lang="ar" dir="rtl">نمو</span>
          </Link>
          <p className="mother-register__brand-caption">{t('mother.loginBrandCaption')}</p>
          <h2 id="mother-register-story-title">{t('mother.registration.headlineFirst')}<br />{t('mother.registration.headlineSecond')}<br /><span>{t('mother.registration.headlineAccent')}</span></h2>
        </aside>
        <div className="mother-register__right">
          <div className="mother-register__language"><LanguageSwitcher /></div>
          <section className="mother-register__card" aria-labelledby="mother-register-title">
            <header className="mother-register__welcome">
              <div className="mother-register__account-icon"><RegisterIcon name="user" /></div>
              <h1 id="mother-register-title">{t('mother.registration.title')}</h1>
              <p>{t('mother.registration.subtitle')}</p>
            </header>
            <form className="mother-register__form" onSubmit={handleSubmit} noValidate>
              <div className="mother-register__field"><RegisterIcon name="user" className="mother-register__field-icon"/><div className="mother-register__field-content"><label htmlFor="parent-role">{t('parentRegistration.role')}</label><select id="parent-role" name="role" value={values.role} onChange={handleChange} required><option value="mother">{t('unifiedLogin.roles.mother')}</option><option value="father">{t('unifiedLogin.roles.father')}</option></select></div></div>
              <p className="mother-register__demo-note">{t('parentRegistration.notice')}</p>
              {errors.role && <p className="mother-register__error" role="alert">{t(errors.role)}</p>}
              {fields.map(({ name, label, icon, type = 'text', autoComplete }) => {
                const isPassword = type === 'password'
                const inputId = `mother-register-${name}`
                return (
                  <div key={name}>
                    <div className={`mother-register__field${errors[name] ? ' mother-register__field--invalid' : ''}`}>
                      <RegisterIcon name={icon} className="mother-register__field-icon" />
                      <div className="mother-register__field-content">
                        <label htmlFor={inputId}>{t(label)}</label>
                        <input id={inputId} name={name} dir={name === 'fullName' ? 'auto' : 'ltr'} type={isPassword && visible[name] ? 'text' : type} value={values[name]} onChange={handleChange} autoComplete={autoComplete} placeholder={t(`mother.registration.${name}Placeholder`)} required minLength={isPassword ? 8 : undefined} spellCheck={isPassword || name === 'nationalId' || name === 'email' ? false : undefined} autoCapitalize={name === 'email' ? 'none' : undefined} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${inputId}-error` : undefined} />
                      </div>
                      {isPassword && <button className="mother-register__toggle" type="button" onClick={() => setVisible((previous) => ({ ...previous, [name]: !previous[name] }))} aria-label={t(name === 'confirmPassword' ? (visible[name] ? 'mother.registration.hideConfirmPassword' : 'mother.registration.showConfirmPassword') : (visible[name] ? 'auth.hidePassword' : 'auth.showPassword'))} aria-pressed={visible[name]} aria-controls={inputId}><RegisterIcon name={visible[name] ? 'eye' : 'eyeOff'} /></button>}
                    </div>
                    {errors[name] && <p className="mother-register__error" id={`${inputId}-error`} role="alert">{t(errors[name])}</p>}
                  </div>
                )
              })}
              {errors.form && <p className="mother-register__error" role="alert">{t(errors.form)}</p>}
              <button className="mother-register__submit" type="submit" disabled={busy}>{t('auth.createAccount')}<RegisterIcon name="arrow" /></button>
              <div className="mother-register__status" role="status" aria-live="polite">{message && <p>{t(message)}</p>}</div>
            </form>
            <footer className="mother-register__footer">
              <p>{t('mother.registration.haveAccount')} <Link to="/login">{t('mother.loginSignIn')}</Link></p>
              <Link className="mother-register__home" to="/"><RegisterIcon name="arrow" />{t('mother.registration.backHome')}</Link>
            </footer>
          </section>
        </div>
      </div>
    </main>
  )
}
