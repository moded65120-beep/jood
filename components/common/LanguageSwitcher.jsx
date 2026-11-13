import { useLanguage } from '../../contexts/LanguageContext.jsx'
import './LanguageSwitcher.css'

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage()
  return (
    <div className="language-switcher" role="group" aria-label={t('common.language')}>
      <button type="button" lang="en" dir="ltr" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button>
      <button type="button" lang="ar" dir="rtl" aria-pressed={language === 'ar'} onClick={() => setLanguage('ar')}>عربي</button>
    </div>
  )
}
