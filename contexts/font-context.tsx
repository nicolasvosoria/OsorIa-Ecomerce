"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { getFonts, getActiveFont, setActiveFont } from "@/lib/supabase/fonts-api"
import type { AppFont } from "@/lib/types/font"

interface FontContextType {
  fonts: AppFont[]
  activeFont: AppFont | null
  loading: boolean
  error: string | null
  changeFont: (fontName: string) => Promise<{ success: boolean; error?: string }>
  refreshFonts: () => Promise<void>
}

const FontContext = createContext<FontContextType | undefined>(undefined)

export function FontProvider({ children }: { children: ReactNode }) {
  const [fonts, setFonts] = useState<AppFont[]>([])
  const [activeFont, setActiveFontState] = useState<AppFont | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshFonts = async () => {
    try {
      setLoading(true)
      setError(null)
      const [fontsData, activeFontData] = await Promise.all([
        getFonts(),
        getActiveFont(),
      ])
      setFonts(fontsData)
      setActiveFontState(activeFontData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar fuentes"
      setError(errorMessage)
      console.error("[Font] Error loading fonts:", err)
    } finally {
      setLoading(false)
    }
  }

  const changeFont = async (fontName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await setActiveFont(fontName)
      if (result.success) {
        // Aplicar fuente inmediatamente desde la lista actual
        const selectedFont = fonts.find((f) => f.font_name === fontName)
        if (selectedFont) {
          applyFont(selectedFont)
        }
        // Refrescar fuentes para actualizar el estado
        await refreshFonts()
      }
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cambiar fuente"
      return { success: false, error: errorMessage }
    }
  }

  const applyFont = (font: AppFont) => {
    if (typeof document === "undefined") return

    const root = document.documentElement

    // Aplicar fuente como variable CSS
    root.style.setProperty("--font-family-sans", font.font_family)

    // Si tiene URL de Google Fonts, cargar el font
    if (font.google_font_url) {
      loadGoogleFont(font.google_font_url)
    }
  }

  const loadGoogleFont = (url: string) => {
    // Verificar si el link ya existe
    const existingLink = document.querySelector(`link[href="${url}"]`)
    if (existingLink) return

    // Crear link para cargar la fuente de Google Fonts
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = url
    document.head.appendChild(link)
  }

  useEffect(() => {
    refreshFonts()
  }, [])

  useEffect(() => {
    if (activeFont) {
      applyFont(activeFont)
    }
  }, [activeFont])

  const value: FontContextType = {
    fonts,
    activeFont,
    loading,
    error,
    changeFont,
    refreshFonts,
  }

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>
}

export function useFont() {
  const context = useContext(FontContext)
  if (context === undefined) {
    throw new Error("useFont must be used within a FontProvider")
  }
  return context
}
