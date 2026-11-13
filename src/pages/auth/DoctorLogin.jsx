import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import LanguageSwitcher from '../../components/common/LanguageSwitcher.jsx'
import LogoSymbol from '../../components/common/LogoSymbol.jsx'
import { loginDoctorDemo } from '../../services/doctorDemoAuth.js'
import './DoctorLogin.css'

function DoctorIcon({ name, ...props }) {
  const paths = {
    stethoscope: 'M4 2v7a5 5 0 0 0 10 0V2M4 3h2M12 3h2M9 14v3a5 5 0 0 0 10 0v-4M22 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    medicalId: 'M3 5h18v16H3ZM9 5V2h6v3M10 11a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5 18a3 3 0 0 1 6 0M16 10v6M13 13h6',
    lock: 'M5 10h14v12H5ZM8 10V6a4 4 0 0 1 8 0v4M12 15v3',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    eyeOff: 'm3 3 18 18M10 5a12 12 0 0 1 12 7 17 17 0 0 1-3 4M6 6a18 18 0 0 0-4 6s3.5 7 10 7a11 11 0 0 0 5-1M10 10a3 3 0 0 0 4 4',
    arrow: 'M3 12h18m-7-7 7 7-7 7',
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]} /></svg>
}

export default function DoctorLogin() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const [values, setValues] = useState({ doctorId: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setValues((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: '' }))
    setMessage('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!values.doctorId.trim()) nextErrors.doctorId = 'doctor.login.doctorIdRequired'
    if (!values.password.trim()) nextErrors.password = 'doctor.login.passwordRequired'
    setErrors(nextErrors)
    setMessage('')
    if (Object.keys(nextErrors).length) {
      event.currentTarget.elements[Object.keys(nextErrors)[0]].focus()
      return
    }
    if (loginDoctorDemo(values.doctorId, values.password)) {
      navigate('/doctor', { replace: true })
      return
    }
    setMessage('doctorAuth.invalid')
  }

  return (
    <main className="doctor-login" lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'} aria-labelledby="doctor-login-title">
      <div className="doctor-login__layout">
        <aside className="doctor-login__story" aria-labelledby="doctor-login-story-title">
          <Link className="doctor-login__brand" to="/" aria-label={t('doctor.login.brandHome')}>
            <span className="doctor-login__wordmark" lang="en" dir="ltr">nomu<LogoSymbol /></span>
            <span className="doctor-login__brand-divider" aria-hidden="true" />
            <span lang="ar" dir="rtl">نمو</span>
          </Link>
          <p className="doctor-login__brand-caption">{t('doctor.login.brandCaption')}</p>
          <h2 id="doctor-login-story-title">{t('doctor.login.headlineFirst')}<br /><span>{t('doctor.login.headlineHealth')}</span>{t('doctor.login.headlinePunctuation')}<br />{t('doctor.login.headlineLast')}</h2>
        </aside>
        <div className="doctor-login__right">
          <div className="doctor-login__language"><LanguageSwitcher /></div>
          <section className="doctor-login__card" aria-labelledby="doctor-login-title">
            <div className="doctor-login__card-content">
              <header className="doctor-login__welcome">
                <div className="doctor-login__account-icon"><DoctorIcon name="stethoscope" /></div>
                <h1 id="doctor-login-title">{t('doctor.login.title')}</h1>
                <p>{t('doctor.login.subtitle')}</p>
              </header>
              <form className="doctor-login__form" onSubmit={handleSubmit} noValidate>
                <div>
                  <div className={`doctor-login__field${errors.doctorId ? ' doctor-login__field--invalid' : ''}`}>
                    <DoctorIcon name="medicalId" className="doctor-login__field-icon" />
                    <div className="doctor-login__field-content">
                      <label htmlFor="doctor-id">{t('doctor.login.doctorId')}</label>
                      <input id="doctor-id" name="doctorId" type="text" autoComplete="username" placeholder={t('doctor.login.doctorIdPlaceholder')} value={values.doctorId} onChange={handleChange} required aria-invalid={Boolean(errors.doctorId)} aria-describedby={errors.doctorId ? 'doctor-id-error' : undefined} />
                    </div>
                  </div>
                  {errors.doctorId && <p className="doctor-login__error" id="doctor-id-error" role="alert">{t(errors.doctorId)}</p>}
                </div>
                <div>
                  <div className={`doctor-login__field${errors.password ? ' doctor-login__field--invalid' : ''}`}>
                    <DoctorIcon name="lock" className="doctor-login__field-icon" />
                    <div className="doctor-login__field-content">
                      <label htmlFor="doctor-password">{t('auth.password')}</label>
                      <input id="doctor-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder={t('doctor.login.passwordPlaceholder')} value={values.password} onChange={handleChange} required aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'doctor-password-error' : undefined} />
                    </div>
                    <button className="doctor-login__toggle" type="button" onClick={() => setShowPassword((previous) => !previous)} aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')} aria-pressed={showPassword} aria-controls="doctor-password"><DoctorIcon name={showPassword ? 'eye' : 'eyeOff'} /></button>
                  </div>
                  {errors.password && <p className="doctor-login__error" id="doctor-password-error" role="alert">{t(errors.password)}</p>}
                </div>
                <button className="doctor-login__submit" type="submit">{t('doctor.login.signIn')}<DoctorIcon name="arrow" /></button>
                <div className="doctor-login__status" role="status" aria-live="polite">{message && <p>{t(message)}</p>}</div>
              </form>
              <footer className="doctor-login__footer"><Link to="/"><DoctorIcon name="arrow" />{t('doctor.login.backHome')}</Link></footer>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
