"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { translations, type Language, type Translations } from "@/lib/i18n/translations"
import { deferStateUpdate } from "@/lib/react/defer-state-update"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
  availableLanguages: Array<{ code: Language; name: string; flag: string }>
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const AVAILABLE_LANGUAGES = [
  { code: 'es' as Language, name: 'Español', flag: '🇪🇸' },
  { code: 'en' as Language, name: 'English', flag: '🇬🇧' },
  { code: 'pt' as Language, name: 'Português', flag: '🇵🇹' },
]

const DEFAULT_LANGUAGE: Language = 'es'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)
  const [mounted, setMounted] = useState(false)

  // Cargar idioma desde localStorage al montar
  useEffect(() => {
    deferStateUpdate(() => {
      setMounted(true)
      const savedLanguage = localStorage.getItem('osoria_language') as Language | null
      if (savedLanguage && (savedLanguage === 'es' || savedLanguage === 'en' || savedLanguage === 'pt')) {
        setLanguageState(savedLanguage)
      } else {
        // Detectar idioma del navegador
        const browserLang = navigator.language.split('-')[0]
        if (browserLang === 'en' || browserLang === 'pt') {
          setLanguageState(browserLang as Language)
        }
      }
    })
  }, [])

  // Guardar idioma en localStorage cuando cambia
  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('osoria_language', lang)
    // Actualizar el atributo lang del HTML
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang
    }
  }

  // Actualizar el atributo lang del HTML cuando cambia el idioma
  useEffect(() => {
    if (mounted && typeof document !== 'undefined') {
      document.documentElement.lang = language
    }
  }, [language, mounted])

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations[language],
    availableLanguages: AVAILABLE_LANGUAGES,
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

