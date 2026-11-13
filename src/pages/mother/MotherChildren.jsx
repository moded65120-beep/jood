import { useLanguage } from '../../contexts/LanguageContext.jsx'
import PortalChildCard from '../../components/mother/PortalChildCard.jsx'
import { portalChildren } from './motherPortalData.js'

export default function MotherChildren() {
  const { t } = useLanguage()
  return <section className="portal-page" aria-labelledby="children-page-title"><header className="portal-page-heading"><p className="portal-eyebrow">{t('mother.portal')}</p><h1 id="children-page-title">{t('mother.myChildren')}</h1><p>{t('portal.childrenSubtitle')}</p></header><div className="portal-child-grid">{portalChildren.length ? portalChildren.map(child => <PortalChildCard key={child.id} child={child}/>) : <p className="portal-empty">{t('mother.booking.noChildren')}</p>}</div></section>
}
