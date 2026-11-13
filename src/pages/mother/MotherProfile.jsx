import { useLanguage } from '../../contexts/LanguageContext.jsx'
import PortalIcon from '../../components/mother/PortalIcon.jsx'
import { motherProfile, initials } from './motherPortalData.js'

export default function MotherProfile() {
  const { t } = useLanguage()
  const name = t('mother.' + motherProfile.nameKey)
  const fields = [['user', 'auth.fullName', name], ['id', 'auth.nationalId', motherProfile.nationalId], ['mail', 'auth.emailAddress', motherProfile.email], ['phone', 'portal.phone', motherProfile.phone]]
  return <section className="portal-page" aria-labelledby="profile-title"><header className="portal-page-heading"><p className="portal-eyebrow">{t('mother.portal')}</p><h1 id="profile-title">{t('mother.profile')}</h1><p>{t('portal.profileSubtitle')}</p></header><div className="portal-profile-card"><div className="portal-profile-summary"><span className="portal-initials" aria-hidden="true">{initials(name)}</span><h2>{name}</h2><span className="portal-tag"><PortalIcon name="shield"/>{t('portal.demoAccount')}</span></div><dl className="portal-profile-fields">{fields.map(([icon, label, value]) => <div key={label}><dt><PortalIcon name={icon}/>{t(label)}</dt><dd>{value || t('portal.notProvided')}</dd></div>)}</dl></div></section>
}
