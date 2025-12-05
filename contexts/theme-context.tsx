"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { getThemes, getActiveTheme, setActiveTheme } from "@/lib/supabase/themes-api"
import { useAuth } from "@/contexts/auth-context"
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
  const { isAuthenticated } = useAuth()

  const refreshThemes = async () => {
    try {
      console.log("[Theme] Iniciando carga de temas...")
      setLoading(true)
      setError(null)
      const [themesData, activeThemeData] = await Promise.all([
        getThemes(),
        getActiveTheme(),
      ])
      console.log("[Theme] Temas recibidos:", themesData.length, "Tema activo:", activeThemeData ? "Sí" : "No")
      setThemes(themesData)
      
      // Si no hay usuario autenticado o no hay tema activo, usar "Claro Original" por defecto
      let themeToUse = activeThemeData
      if (!isAuthenticated || !activeThemeData) {
        const defaultTheme = themesData.find((t) => t.theme_name === "Claro Original")
        if (defaultTheme) {
          themeToUse = defaultTheme
          console.log("[Theme] Usando tema por defecto 'Claro Original' (usuario no autenticado o sin tema activo)")
        }
      }
      
      setActiveThemeState(themeToUse)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar temas"
      setError(errorMessage)
      console.error("[Theme] Error loading themes:", err)
      
      // En caso de error, intentar aplicar "Claro Original" si hay temas cargados
      if (themes.length > 0 && !isAuthenticated) {
        const defaultTheme = themes.find((t) => t.theme_name === "Claro Original")
        if (defaultTheme) {
          setActiveThemeState(defaultTheme)
        }
      }
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
    console.log("[Theme] Provider montado, iniciando carga de temas...")
    refreshThemes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refrescar temas cuando cambie el estado de autenticación
  useEffect(() => {
    if (!loading && themes.length > 0) {
      refreshThemes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    if (activeTheme) {
      applyTheme(activeTheme)
    } else if (themes.length > 0 && !isAuthenticated) {
      // Si no hay tema activo y el usuario no está autenticado, aplicar "Claro Original"
      const defaultTheme = themes.find((t) => t.theme_name === "Claro Original")
      if (defaultTheme) {
        applyTheme(defaultTheme)
        setActiveThemeState(defaultTheme)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTheme, themes, isAuthenticated])

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
