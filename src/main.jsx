import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import './styles/global.css'
import App from './App.jsx'
import { LanguageProvider } from './contexts/LanguageContext.jsx'
import { MedicalRecordProvider } from './contexts/MedicalRecordContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <MedicalRecordProvider><App /></MedicalRecordProvider>
    </LanguageProvider>
  </StrictMode>,
)

