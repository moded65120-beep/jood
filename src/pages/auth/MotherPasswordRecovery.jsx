import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import LanguageSwitcher from '../../components/common/LanguageSwitcher.jsx'
import LogoSymbol from '../../components/common/LogoSymbol.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { motherPasswordRecovery as recovery, validateRecovery } from '../../services/motherPasswordRecovery.js'
import './MotherLogin.css'
import './MotherPasswordRecovery.css'

const titles = { email: 'forgotTitle', code: 'verifyTitle', password: 'newTitle', success: 'success' }

export default function MotherPasswordRecovery({ step }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const tr = (key) => t(`mother.recovery.${key}`)
  const [values, setValues] = useState({ email: '', code: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [previousStep, setPreviousStep] = useState(step)
  const [challengeId, setChallengeId] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [completed, setCompleted] = useState(false)
  const heading = useRef(null)
  const codeInputs = useRef([])

  if (previousStep !== step) {
    setPreviousStep(step)
    setErrors({})
    setStatus('')
    setVisible(false)
    setValues((previous) => ({ ...previous, code: '', password: '', confirmPassword: '' }))
  }
  useEffect(() => { heading.current?.focus() }, [step])

  function change(event) {
    const { name, value } = event.target
    const normalized = name === 'code' ? value.replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) % 16)).replace(/[^0-9]/g, '').slice(0, 6) : value
    setValues((previous) => ({ ...previous, [name]: normalized }))
    setErrors((previous) => ({ ...previous, [name]: '' }))
    setStatus('')
  }

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const invalid = validateRecovery(step, values)
    setErrors(invalid)
    setStatus('')
    if (Object.keys(invalid).length) {
      event.currentTarget.elements[Object.keys(invalid)[0]].focus()
      return
    }
    if (!recovery.available) { setStatus('unavailable'); return }
    if ((step === 'code' && !challengeId) || (step === 'password' && !resetToken)) { setStatus('restart'); return }
    setBusy(true)
    try {
      if (step === 'email') {
        const result = await recovery.requestCode({ email: values.email.trim() })
        setChallengeId(result.challengeId)
        navigate('/mother/verify-code', { replace: true })
      } else if (step === 'code') {
        const result = await recovery.verifyCode({ challengeId, code: values.code })
        setResetToken(result.resetToken)
        navigate('/mother/new-password', { replace: true })
      } else if (step === 'password') {
        await recovery.resetPassword({ resetToken, password: values.password })
        setResetToken('')
        setCompleted(true)
        navigate('/mother/password-reset-success', { replace: true })
      }
    } catch {
      setStatus('requestFailed')
    } finally { setBusy(false) }
  }

  async function resend() {
    if (busy) return
    if (!recovery.available) { setStatus('unavailable'); return }
    if (!challengeId || !values.email) { setStatus('restart'); return }
    setBusy(true)
    try {
      const result = await recovery.requestCode({ email: values.email.trim() })
      setChallengeId(result.challengeId)
      setValues((previous) => ({ ...previous, code: '' }))
      setStatus('resent')
    } catch { setStatus('requestFailed') }
    finally { setBusy(false) }
  }

  // A URL alone must never claim that a password was changed.
  if (step === 'success' && !completed) return <Navigate to="/mother/forgot-password" replace />

  function field(name, label, type, extra = {}) {
    const errorId = `recovery-${name}-error`
    return <div className="mother-recovery__field" key={name}>
      <label htmlFor={`recovery-${name}`}>{label}</label>
      <input id={`recovery-${name}`} name={name} type={type} value={values[name]} onChange={change} required aria-invalid={Boolean(errors[name])} aria-describedby={[errors[name] && errorId, name === 'password' && 'recovery-password-hint'].filter(Boolean).join(' ') || undefined} {...extra} />
      {name === 'password' && <p id="recovery-password-hint" className="mother-recovery__hint">{tr('passwordHint')}</p>}
      {errors[name] && <p id={errorId} className="mother-recovery__error" role="alert">{tr(errors[name])}</p>}
    </div>
  }

  function updateCode(index, input) {
    const digits = input.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) % 16)).replace(/[^0-9]/g, '').slice(0, 6)
    const offset = digits.length === 6 ? 0 : index
    const slots = values.code.padEnd(6, ' ').split('')
    if (!digits) slots[index] = ' '
    else for (let position = 0; position < digits.length && offset + position < 6; position++) slots[offset + position] = digits[position]
    setValues((previous) => ({ ...previous, code: slots.join('').trimEnd() }))
    setErrors((previous) => ({ ...previous, code: '' }))
    setStatus('')
    if (digits) codeInputs.current[Math.min(offset + digits.length, 5)]?.focus()
  }

  return <main className="mother-recovery">
    <div className="mother-recovery__shell">
      <section className="mother-recovery__panel" aria-labelledby="recovery-title">
        <header className="mother-recovery__header">
          <Link className="mother-login__brand mother-recovery__brand" to="/" aria-label={t('mother.brandHome')}>
            <span className="mother-login__wordmark" lang="en" dir="ltr">nomu<LogoSymbol /></span>
            <span className="mother-login__brand-divider" aria-hidden="true" />
            <span lang="ar" dir="rtl">نمو</span>
          </Link>
          <LanguageSwitcher />
        </header>
        <div className="mother-recovery__form-area" key={step}>
          <div className="mother-recovery__progress" role="group" aria-label={tr('progress')}>
            {['email', 'code', 'password'].map((item, index) => <span key={item} className={index <= ['email', 'code', 'password', 'success'].indexOf(step) ? 'is-active' : ''} aria-current={item === step ? 'step' : undefined} aria-label={tr(titles[item])} />)}
          </div>
          {step === 'success' && <span className="mother-recovery__success" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 12 4 4 8-8" /></svg></span>}
          <div className="mother-recovery__intro">
            <h1 id="recovery-title" ref={heading} tabIndex={-1}>{tr(titles[step])}</h1>
            {step === 'email' && <p className="mother-recovery__subtitle">{tr('subtitle')}</p>}
          </div>
          {step !== 'success' && <form onSubmit={submit} noValidate aria-busy={busy}>
            <div className="mother-recovery__fields">
              {step === 'email' && field('email', t('auth.emailAddress'), 'email', { autoComplete: 'email', dir: 'ltr', maxLength: 254 })}
              {step === 'code' && <fieldset className="mother-recovery__code-field">
                <legend>{tr('codeLabel')}</legend>
                <div className="mother-recovery__code" dir="ltr">
                  {Array.from({ length: 6 }, (_, index) => <input
                    key={index} ref={(element) => { codeInputs.current[index] = element }}
                    name={index === 0 ? 'code' : `code${index + 1}`} type="text" inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    aria-label={`${tr('codeDigit')} ${index + 1}`} aria-invalid={Boolean(errors.code)}
                    aria-describedby={errors.code ? 'recovery-code-error' : undefined}
                    value={values.code[index]?.trim() || ''} required
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => updateCode(index, event.target.value)}
                    onPaste={(event) => { event.preventDefault(); updateCode(index, event.clipboardData.getData('text')) }}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                        event.preventDefault()
                        codeInputs.current[Math.max(0, Math.min(5, index + (event.key === 'ArrowRight' ? 1 : -1)))]?.focus()
                      } else if (event.key === 'Backspace' && !values.code[index]?.trim() && index > 0) {
                        event.preventDefault()
                        updateCode(index - 1, '')
                        codeInputs.current[index - 1]?.focus()
                      }
                    }}
                  />)}
                </div>
                {errors.code && <p id="recovery-code-error" className="mother-recovery__error" role="alert">{tr(errors.code)}</p>}
              </fieldset>}
              {step === 'password' && <>
                {field('password', tr('newTitle'), visible ? 'text' : 'password', { autoComplete: 'new-password', minLength: 8 })}
                {field('confirmPassword', t('auth.confirmPassword'), visible ? 'text' : 'password', { autoComplete: 'new-password' })}
                <button type="button" className="mother-recovery__link mother-recovery__show" aria-pressed={visible} aria-controls="recovery-password recovery-confirmPassword" onClick={() => setVisible(!visible)}>{t(visible ? 'auth.hidePassword' : 'auth.showPassword')}</button>
              </>}
            </div>
            <button type="submit" className="mother-recovery__primary" disabled={busy}>{busy ? t('common.loading') : tr(step === 'email' ? 'sendCode' : step === 'code' ? 'verify' : 'reset')}</button>
          </form>}
          <div className="mother-recovery__secondary">
            {step === 'code' && <button type="button" className="mother-recovery__link" disabled={busy} onClick={resend}>{tr('resend')}</button>}
            <Link className={step === 'success' ? 'mother-recovery__primary' : 'mother-recovery__link'} to="/mother/login">{tr('back')}</Link>
          </div>
          <div className="mother-recovery__status" role="status" aria-live="polite">
            {(status || !recovery.available) && <p className="mother-recovery__notice">{tr(!status || status === 'unavailable' ? 'unavailableShort' : status)}</p>}
          </div>
          {status === 'restart' && <Link className="mother-recovery__link" to="/mother/forgot-password">{tr('forgotTitle')}</Link>}
        </div>
      </section>
      <aside className="mother-recovery__visual" aria-hidden="true">
        <div className="mother-recovery__art">
          <svg viewBox="0 0 480 580" fill="none" focusable="false">
            <defs>
              <linearGradient id="recovery-arch" x1="80" y1="60" x2="390" y2="540" gradientUnits="userSpaceOnUse"><stop stopColor="#fcfdff" /><stop offset="1" stopColor="#c0d9eb" /></linearGradient>
              <linearGradient id="recovery-mother" x1="160" y1="175" x2="345" y2="500" gradientUnits="userSpaceOnUse"><stop stopColor="#f9e6ed" /><stop offset="1" stopColor="#dfa9bf" /></linearGradient>
              <linearGradient id="recovery-child" x1="220" y1="310" x2="310" y2="470" gradientUnits="userSpaceOnUse"><stop stopColor="#fafdff" /><stop offset="1" stopColor="#b6d5e5" /></linearGradient>
              <filter id="recovery-depth" x="-40%" y="-30%" width="180%" height="180%"><feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#6c8ba4" floodOpacity=".12" /></filter>
            </defs>
            <ellipse cx="245" cy="529" rx="155" ry="16" fill="#698eab" opacity=".09" />
            <path d="M66 499V242a174 174 0 0 1 348 0v257H66Z" fill="url(#recovery-arch)" filter="url(#recovery-depth)" />
            <path d="M88 496V244a152 152 0 0 1 304 0v252" stroke="white" strokeOpacity=".75" />
            <path d="M118 492V248a122 122 0 0 1 244 0v244" stroke="#9cb9d0" strokeOpacity=".22" />
            <g filter="url(#recovery-depth)">
              <path d="M149 487c-24-61-17-137 12-184 14-22 20-38 18-66-3-38 16-67 46-67 35 0 55 27 53 60-1 23-14 39-32 47 67 30 101 107 94 210H149Z" fill="url(#recovery-mother)" />
              <path d="M218 199c-14 16-14 36-2 50 7 8 17 11 27 9" stroke="#fff4f6" strokeWidth="2" strokeLinecap="round" />
              <path d="M193 388c-4-40 18-67 46-67 27 0 44 20 42 44-1 17-9 28-22 35 34 10 53 39 58 69-40 25-88 23-124-1-11-29-8-55 0-80Z" fill="url(#recovery-child)" />
              <path d="M163 343c-17 68 18 123 75 126 31 2 58-9 78-31" stroke="#f9e5ec" strokeWidth="24" strokeLinecap="round" />
              <path d="M163 343c-17 68 18 123 75 126 31 2 58-9 78-31" stroke="#fff7fa" strokeOpacity=".55" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          </svg>
        </div>
      </aside>
    </div>
  </main>
}
