"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { getThemes, getActiveTheme, setActiveTheme } from "@/lib/supabase/themes-api"
import type { AppTheme } from "@/lib/types/theme"

interface ThemeContextType {
  themes: AppTheme[]
  activeTheme: AppTheme | null
  loading: boolean
  error: string | null
  changeTheme: (themeName: string) => Promise<{ success: boolean; error?: string }>
  refreshThemes: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themes, setThemes] = useState<AppTheme[]>([])
  const [activeTheme, setActiveThemeState] = useState<AppTheme | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshThemes = async () => {
    try {
      setLoading(true)
      setError(null)
      const [themesData, activeThemeData] = await Promise.all([
        getThemes(),
        getActiveTheme(),
      ])
      setThemes(themesData)
      setActiveThemeState(activeThemeData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar temas"
      setError(errorMessage)
      console.error("[Theme] Error loading themes:", err)
    } finally {
      setLoading(false)
    }
  }

  const changeTheme = async (themeName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await setActiveTheme(themeName)
      if (result.success) {
        // Aplicar tema inmediatamente desde la lista actual
        const selectedTheme = themes.find((t) => t.theme_name === themeName)
        if (selectedTheme) {
          applyTheme(selectedTheme)
        }
        // Refrescar temas para actualizar el estado
        await refreshThemes()
      }
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cambiar tema"
      return { success: false, error: errorMessage }
    }
  }

  const applyTheme = (theme: AppTheme) => {
    if (typeof document === "undefined") return

    const root = document.documentElement
    const colors = theme.colors

    // Aplicar colores directamente a las variables CSS que usa Tailwind
    root.style.setProperty("--primary", colors.primary)
    root.style.setProperty("--secondary", colors.secondary)
    root.style.setProperty("--accent", colors.accent)
    root.style.setProperty("--background", colors.background)
    root.style.setProperty("--foreground", colors.foreground)
    root.style.setProperty("--card", colors.card)
    root.style.setProperty("--card-foreground", colors.cardForeground)
    root.style.setProperty("--border", colors.border)
    root.style.setProperty("--muted", colors.muted)
    root.style.setProperty("--muted-foreground", colors.mutedForeground)
    
    // También actualizar primary-foreground y secondary-foreground para mejor contraste
    root.style.setProperty("--primary-foreground", colors.foreground)
    root.style.setProperty("--secondary-foreground", colors.foreground)
    root.style.setProperty("--accent-foreground", colors.foreground)
  }

  useEffect(() => {
    refreshThemes()
  }, [])

  useEffect(() => {
    if (activeTheme) {
      applyTheme(activeTheme)
    }
  }, [activeTheme])

  const value: ThemeContextType = {
    themes,
    activeTheme,
    loading,
    error,
    changeTheme,
    refreshThemes,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
