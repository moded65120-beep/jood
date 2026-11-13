import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LanguageProvider } from '../contexts/LanguageContext.jsx'
import DoctorGrowthChart from '../pages/doctor/DoctorGrowthChart.jsx'
import '../styles/index.css'
import '../styles/global.css'

// Separate temporary entry: the main application never imports this module.
if (import.meta.env.DEV) {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <LanguageProvider>
        <DoctorGrowthChart />
      </LanguageProvider>
    </StrictMode>,
  )
} else {
  document.getElementById('root').textContent = 'This preview is available only on the development server.'
}
