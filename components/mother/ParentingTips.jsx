import { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { getSessionParentingTip, nextParentingTip } from '../../services/motherParentingTips.js'
import PortalIcon from './PortalIcon.jsx'

export default function ParentingTips() {
  const { language, t } = useLanguage()
  const [tip, setTip] = useState(getSessionParentingTip)
  return <section className="portal-parenting-tips" aria-labelledby="parenting-tips-title">
    <span className="portal-tip-icon"><PortalIcon name="lightbulb"/></span>
    <div className="portal-tip-content"><h2 id="parenting-tips-title">{t('parentingTips.title')}</h2><div aria-live="polite" aria-atomic="true"><div className="portal-tip-copy" key={tip.id}><p>{tip[language]}</p><span className="portal-tip-category">{t('parentingTips.categories.' + tip.category)}</span></div></div></div>
    <button type="button" className="portal-another-tip" onClick={() => setTip(nextParentingTip())}><PortalIcon name="refresh"/>{t('parentingTips.another')}</button>
  </section>
}
