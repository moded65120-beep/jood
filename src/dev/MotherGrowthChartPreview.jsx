import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext.jsx'
import MotherGrowthChart from '../pages/mother/MotherGrowthChart.jsx'
import '../styles/index.css'
import '../styles/global.css'

// Fictional examples only. Production supplies persisted doctor records via props.
const child = { id: 'preview-mother-child', name: { en: 'Lina Ahmad', ar: 'لينا أحمد' }, sex: 'female', dateOfBirth: '2024-06-15' }
const measurements = [
  { childId: child.id, measurementDate: '2024-08-15', weightKg: 5.1, heightCm: 57.5, headCircumferenceCm: 38.3, measurementMethod: 'recumbent_length' },
  { childId: child.id, measurementDate: '2024-12-15', weightKg: 7.3, heightCm: 65.7, headCircumferenceCm: 42.2, measurementMethod: 'recumbent_length' },
  { childId: child.id, measurementDate: '2025-06-15', weightKg: 9.1, heightCm: 74.1, headCircumferenceCm: 45, measurementMethod: 'recumbent_length' },
  { childId: child.id, measurementDate: '2026-07-15', weightKg: 12.1, heightCm: 87.2, headCircumferenceCm: 47.6, measurementMethod: 'standing_height' },
]

export default function Preview() {
  const { t, language } = useLanguage()
  return <>
    <aside className="mother-growth-preview__notice" dir={language === 'ar' ? 'rtl' : 'ltr'}>{t('motherGrowth.previewNotice')}</aside>
    <MotherGrowthChart child={child} measurements={measurements} />
  </>
}

// Separate entry; excluded from the application and guarded in production builds.
if (import.meta.env.DEV) {
  createRoot(document.getElementById('root')).render(<StrictMode><LanguageProvider><Preview /></LanguageProvider></StrictMode>)
} else {
  document.getElementById('root').textContent = 'This preview is available only on the development server.'
}
