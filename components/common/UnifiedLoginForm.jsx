import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { getUnifiedLoginError, loginUnifiedDemo } from '../../services/unifiedDemoAuth.js'
import './UnifiedLoginForm.css'
import './LoginRefinement.css'

export default function UnifiedLoginForm() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { state } = useLocation()
  const audience = ['doctor', 'parent'].includes(state?.audience) ? state.audience : state?.parentRegistered && !state?.audience ? 'parent' : null
  const [id, setId] = useState(''), [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false), [error, setError] = useState(false), [busy, setBusy] = useState(false)
  const pending = useRef(false)
  async function submit(event) {
    event.preventDefault()
    if (pending.current) return
    setError(false); setBusy(true); pending.current = true
    try {
      const user = await loginUnifiedDemo(id.trim(), password, audience)
      if (!user) { setError(getUnifiedLoginError()); return }
      navigate(user.dashboard, { replace: true })
    } finally { pending.current = false; setBusy(false) }
  }
  if (!audience) return <Navigate to="/" replace />
  return <section className="unified-login" aria-labelledby="unified-login-title">
    <h1 id="unified-login-title" tabIndex={-1}>{t('unifiedLogin.title')}</h1><p>{t('unifiedLogin.subtitle')}</p>
    {state?.parentRegistered && <p className="unified-login__success" role="status">{t('parentRegistration.success')}</p>}
    <form onSubmit={submit} noValidate>
      <label htmlFor="unified-id">{t('unifiedLogin.userId')}</label><input id="unified-id" autoComplete="username" inputMode="numeric" dir="ltr" required value={id} onChange={event => { setId(event.target.value); setError(false) }} aria-invalid={Boolean(error)} aria-describedby={error ? 'unified-login-error' : undefined} />
      <label htmlFor="unified-password">{t('auth.password')}</label><div className="unified-login__password"><input id="unified-password" autoComplete="current-password" type={visible ? 'text' : 'password'} required value={password} onChange={event => { setPassword(event.target.value); setError(false) }} aria-invalid={Boolean(error)} aria-describedby={error ? 'unified-login-error' : undefined} /><button type="button" onClick={() => setVisible(value => !value)} aria-pressed={visible} aria-controls="unified-password" aria-label={t(visible ? 'auth.hidePassword' : 'auth.showPassword')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={visible ? 'm3 3 18 18 M10 5a12 12 0 0 1 12 7l-3 4 M6 6l-4 6s4 7 10 7l5-1' : 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'} /></svg></button></div>
      {error && <div id="unified-login-error" className="unified-login__error" role="alert"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m12 3 10 18H2Z M12 8v6 M12 17v1" /></svg><span>{t(error)}</span></div>}
      <button className="nomu-home__button unified-login__submit" disabled={busy} type="submit">{t(busy ? 'common.loading' : 'unifiedLogin.login')}</button>
    </form>{(state?.audience === 'parent' || state?.parentRegistered) && <Link className="unified-login__signup" to="/mother/register">{t('unifiedLogin.signup')}</Link>}<small>{t('unifiedLogin.demoNotice')}</small>
  </section>
}
