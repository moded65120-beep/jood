import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import LanguageSwitcher from '../../components/common/LanguageSwitcher.jsx'
import LogoSymbol from '../../components/common/LogoSymbol.jsx'
import toddlerIllustration from '../../assets/mother-login/newboy.png'
import './MotherLogin.css'
import { loginMotherDemo } from '../../services/motherDemoAuth.js'

function LoginIcon({ name, ...props }) {
  const paths = {
    user: <><circle cx="12" cy="7" r="4" /><path d="M4 22v-2a8 8 0 0 1 16 0v2Z" /></>,
    id: <><rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="8" cy="10" r="2" /><path d="M5 16a3 3 0 0 1 6 0M14 9h5M14 13h5M14 17h3" /></>,
    lock: <><rect x="5" y="10" width="14" height="12" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    eyeOff: <><path d="m3 3 18 18M10 5a12 12 0 0 1 12 7 17 17 0 0 1-3 4M6 6a18 18 0 0 0-4 6s3.5 7 10 7a11 11 0 0 0 5-1M10 10a3 3 0 0 0 4 4" /></>,
    addUser: <><circle cx="9" cy="7" r="4" /><path d="M2 22v-3a7 7 0 0 1 12-5M18 13v8M14 17h8M18 2v6M15 5h6" /></>,
    arrow: <path d="M3 12h18m-7-7 7 7-7 7" />,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]}</svg>
}

export default function MotherLogin() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [values, setValues] = useState({ nationalId: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setValues((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: '' }))
    setMessage('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!values.nationalId.trim()) nextErrors.nationalId = 'auth.nationalIdRequired'
    if (!values.password.trim()) nextErrors.password = 'auth.passwordRequired'
    setErrors(nextErrors)
    setMessage('')
    if (Object.keys(nextErrors).length) {
      event.currentTarget.elements[Object.keys(nextErrors)[0]].focus()
      return
    }
    // DEMO ONLY: fictional static credentials for frontend navigation.
    // Replace with real backend authentication when it is available.
    if (loginMotherDemo(values.nationalId, values.password)) {
      navigate('/mother', { replace: true })
      return
    }
    setMessage('auth.demoInvalidCredentials')
  }

  return (
    <main className="mother-login" aria-labelledby="mother-login-title">
      <div className="mother-login__shell">
        <div className="mother-login__language"><LanguageSwitcher /></div>
        <Link className="mother-login__brand" to="/" aria-label={t('mother.brandHome')}>
          <span className="mother-login__wordmark" lang="en" dir="ltr">nomu<LogoSymbol /></span>
          <span className="mother-login__brand-divider" aria-hidden="true" />
          <span lang="ar" dir="rtl">نمو</span>
        </Link>
        <div className="mother-login__layout">
          {toddlerIllustration && <img className="mother-login__toddler" src={toddlerIllustration} alt="" aria-hidden="true" />}
          <section className="mother-login__card" aria-labelledby="mother-login-title">
            <div className="mother-login__card-content">
              <header className="mother-login__welcome">
                <div className="mother-login__welcome-icon"><LoginIcon name="user" /></div>
                <h1 id="mother-login-title">{t('mother.welcomeBack')}</h1>
                <p>{t('mother.loginCardSubtitle')}</p>
              </header>
              <form className="mother-login__form" onSubmit={handleSubmit} noValidate>
                <div>
                  <div className={`mother-login__field${errors.nationalId ? ' mother-login__field--invalid' : ''}`}>
                    <LoginIcon name="id" className="mother-login__field-icon mother-login__field-icon--id" />
                    <div className="mother-login__field-content">
                      <label htmlFor="mother-national-id">{t('auth.nationalId')}</label>
                      <input id="mother-national-id" name="nationalId" type="text" autoComplete="username" placeholder={t('auth.nationalIdPlaceholder')} value={values.nationalId} onChange={handleChange} required aria-invalid={Boolean(errors.nationalId)} aria-describedby={errors.nationalId ? 'mother-national-id-error' : undefined} />
                    </div>
                  </div>
                  {errors.nationalId && <p className="mother-login__error" id="mother-national-id-error" role="alert">{t(errors.nationalId)}</p>}
                </div>
                <div>
                  <div className={`mother-login__field${errors.password ? ' mother-login__field--invalid' : ''}`}>
                    <LoginIcon name="lock" className="mother-login__field-icon" />
                    <div className="mother-login__field-content">
                      <label htmlFor="mother-password">{t('auth.password')}</label>
                      <input id="mother-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder={t('auth.passwordPlaceholder')} value={values.password} onChange={handleChange} required aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'mother-password-error' : undefined} />
                    </div>
                    <button className="mother-login__toggle" type="button" onClick={() => setShowPassword((previous) => !previous)} aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')} aria-pressed={showPassword} aria-controls="mother-password"><LoginIcon name={showPassword ? 'eye' : 'eyeOff'} /></button>
                  </div>
                  {errors.password && <p className="mother-login__error" id="mother-password-error" role="alert">{t(errors.password)}</p>}
                </div>
                <div className="mother-login__options">
                  <label className="mother-login__remember"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />{t('mother.loginRememberMe')}</label>
                  <Link className="mother-login__forgot" to="/mother/forgot-password" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', cursor: 'pointer' }}>{t('auth.forgotPassword')}</Link>
                </div>
                <button type="submit" className="mother-login__submit">{t('mother.loginSignIn')}<LoginIcon name="arrow" /></button>
                <div className="mother-login__status" role="status" aria-live="polite">{message && <p>{t(message)}</p>}</div>
              </form>
              <div className="mother-login__separator"><span>{t('mother.loginOr')}</span></div>
              <Link className="mother-login__register" to="/mother/register">
                <LoginIcon name="addUser" />
                <span><strong>{t('mother.loginCreateAccount')}</strong></span>
              </Link>
              <p className="mother-login__demo-note">{t('mother.demoNote')}</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
