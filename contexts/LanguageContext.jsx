import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import en from '../locales/en/translations.js'
import ar from '../locales/ar/translations.js'

const LanguageContext = createContext(null)
const translations = { en, ar }
const storageKey = 'nomu.language'
const isLanguage = (value) => value === 'en' || value === 'ar'

function initialLanguage() {
  try {
    const stored = window.localStorage.getItem(storageKey)
    return isLanguage(stored) ? stored : 'en'
  } catch {
    return 'en'
  }
}

function lookup(dictionary, key) {
  if (typeof key !== 'string') return undefined
  return key.split('.').reduce((value, part) => (
    value && Object.prototype.hasOwnProperty.call(value, part) ? value[part] : undefined
  ), dictionary)
}

export function LanguageProvider({ children }) {
  const [language, updateLanguage] = useState(initialLanguage)
  const setLanguage = useCallback((nextLanguage) => {
    if (isLanguage(nextLanguage)) updateLanguage(nextLanguage)
  }, [])
  const toggleLanguage = useCallback(() => {
    updateLanguage((previous) => previous === 'en' ? 'ar' : 'en')
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    try {
      window.localStorage.setItem(storageKey, language)
    } catch {
      // Language switching still works when browser storage is unavailable.
    }
  }, [language])

  const t = useCallback((key) => {
    const translated = lookup(translations[language], key)
    if (typeof translated === 'string') return translated
    const fallback = lookup(en, key)
    return typeof fallback === 'string' ? fallback : key
  }, [language])

  const value = useMemo(() => ({ language, setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

// The public context API intentionally exports its hook alongside the provider.
// eslint-disable-next-line react/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider')
  return context
}
