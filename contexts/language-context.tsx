"use client"

import { createContext, useContext, type ReactNode } from "react"
import { translations, type Language, type Translations } from "@/lib/i18n/translations"

interface LanguageContextType {
  language: Language
  t: Translations
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const DEFAULT_LANGUAGE: Language = 'es'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const value: LanguageContextType = {
    language: DEFAULT_LANGUAGE,
    t: translations[DEFAULT_LANGUAGE],
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

