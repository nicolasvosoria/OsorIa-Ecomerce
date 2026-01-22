"use client"

import { useEffect } from "react"
import { useLanguage } from "@/contexts/language-context"

/**
 * Componente que actualiza dinámicamente el atributo lang del elemento HTML
 * cuando cambia el idioma seleccionado
 */
export function DynamicLang() {
  const { language } = useLanguage()

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language
    }
  }, [language])

  return null
}


