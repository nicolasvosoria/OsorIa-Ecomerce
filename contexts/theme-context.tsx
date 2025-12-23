"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"
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
  const appliedThemeRef = useRef<string | null>(null) // Para evitar aplicar el mismo tema múltiples veces

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
      
      // Usar el tema activo de BD para TODOS los usuarios (autenticados o no)
      // Si no hay tema activo en BD, usar "Claro Original" por defecto
      const defaultTheme = themesData.find((t) => t.theme_name === "Claro Original")
      let themeToUse = activeThemeData || defaultTheme
      
      if (activeThemeData) {
        console.log("[Theme] Usando tema activo desde BD:", activeThemeData.theme_name, "(todos los usuarios verán este tema)")
      } else if (defaultTheme) {
        console.log("[Theme] No hay tema activo en BD, usando 'Claro Original' por defecto")
        themeToUse = defaultTheme
      }
      
      setActiveThemeState(themeToUse || null)
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
        // Aplicar tema inmediatamente desde la lista actual (forzar aplicación)
        const selectedTheme = themes.find((t) => t.theme_name === themeName)
        if (selectedTheme) {
          applyTheme(selectedTheme, true) // Forzar aplicación
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

  const applyTheme = (theme: AppTheme, force: boolean = false) => {
    if (typeof document === "undefined") return

    // Evitar aplicar el mismo tema múltiples veces (a menos que sea forzado)
    if (!force && appliedThemeRef.current === theme.theme_name) {
      return
    }

    // Si el script ya aplicó este tema desde localStorage, no volver a aplicarlo
    // a menos que sea un cambio explícito (force = true)
    if (!force && typeof window !== "undefined" && (window as any).__osoria_applied_theme === theme.theme_name) {
      appliedThemeRef.current = theme.theme_name
      return
    }

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

    // Marcar que este tema ya fue aplicado
    appliedThemeRef.current = theme.theme_name

    // Guardar en localStorage para aplicar inmediatamente en la próxima carga
    try {
      localStorage.setItem("osoria_active_theme", JSON.stringify(theme))
    } catch (e) {
      console.warn("[Theme] Error saving theme to localStorage:", e)
    }
  }

  useEffect(() => {
    console.log("[Theme] Provider montado, iniciando carga de temas...")
    refreshThemes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refrescar temas periódicamente para detectar cambios del admin
  // Esto permite que todos los usuarios vean el tema activo actualizado
  useEffect(() => {
    if (!loading && themes.length > 0) {
      // Refrescar cada 30 segundos para detectar cambios de tema del admin
      const interval = setInterval(() => {
        refreshThemes()
      }, 30000) // 30 segundos
      
      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, themes.length])

  // Aplicar tema solo cuando se determine el tema activo final
  useEffect(() => {
    // Esperar a que termine la carga antes de aplicar
    if (loading) return

    // Verificar si el script ya aplicó un tema desde localStorage
    const scriptAppliedTheme = typeof window !== "undefined" ? (window as any).__osoria_applied_theme : null
    
    // Solo aplicar si tenemos un tema activo y no se ha aplicado ya
    if (activeTheme) {
      // Si el script ya aplicó este tema, solo marcar como aplicado sin volver a aplicar
      if (scriptAppliedTheme === activeTheme.theme_name) {
        appliedThemeRef.current = activeTheme.theme_name
        return
      }
      
      // Solo aplicar si no se ha aplicado ya
      if (appliedThemeRef.current !== activeTheme.theme_name) {
        applyTheme(activeTheme)
      }
    } else if (!activeTheme && themes.length > 0) {
      // Si no hay tema activo, aplicar tema por defecto "Claro Original"
      // Esto aplica para TODOS los usuarios (autenticados o no)
      const defaultTheme = themes.find((t) => t.theme_name === "Claro Original")
      if (defaultTheme) {
        // Si el script ya aplicó este tema, solo marcar como aplicado
        if (scriptAppliedTheme === defaultTheme.theme_name) {
          appliedThemeRef.current = defaultTheme.theme_name
          setActiveThemeState(defaultTheme)
          return
        }
        
        // Solo aplicar si no se ha aplicado ya
        if (appliedThemeRef.current !== defaultTheme.theme_name) {
          applyTheme(defaultTheme)
          setActiveThemeState(defaultTheme)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTheme, loading]) // Removido themes e isAuthenticated para evitar aplicaciones múltiples

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
