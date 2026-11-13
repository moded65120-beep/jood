import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Users, Stethoscope } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import './PortalSelection.css'

export default function PortalSelection({ panelRef, active, onBack }) {
  const { t } = useLanguage()
  return <section ref={panelRef} className="home-portals" inert={!active} aria-hidden={!active} aria-labelledby="home-portals-title">
    <button className="nomu-home__back" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" />{t('home.backWelcome')}</button>
    <div className="home-portals__content">
      <span className="nomu-home__eyebrow"><span aria-hidden="true" />{t('home.portalLabel')}</span>
      <h1 id="home-portals-title" tabIndex={-1}>{t('home.portals.title')}</h1>
      <p>{t('home.portals.description')}</p>
      <div className="home-portals__choices">
        {[[Users, 'family'], [Stethoscope, 'clinical']].map(([Icon, key]) => <Link to="/login" key={key} className="home-portals__choice">
          <Icon className="home-portals__icon" aria-hidden="true" />
          <h2>{t(`home.portals.${key}`)}</h2>
          <p>{t(`home.portals.${key}Description`)}</p>
          <span>{t('home.portals.continue')}<ArrowRight aria-hidden="true" /></span>
        </Link>)}
      </div>
      <small>{t('home.portals.accountNotice')}</small>
    </div>
  </section>
}
