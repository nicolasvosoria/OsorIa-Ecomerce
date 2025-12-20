"use client"

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react"
import { getComponentStyles, subscribeToStyleChanges } from "@/lib/supabase/styles-api"

interface StylesContextType {
  styles: Map<string, Record<string, any>>
  loading: boolean
  error: string | null
  refreshStyles: () => Promise<void>
}

const StylesContext = createContext<StylesContextType | undefined>(undefined)

export function StylesProvider({ children }: { children: ReactNode }) {
  const [styles, setStyles] = useState<Map<string, Record<string, any>>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshStyles = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Agregar timeout para evitar bloqueos
      const data = await Promise.race([
        getComponentStyles(),
        new Promise<Awaited<ReturnType<typeof getComponentStyles>>>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout al obtener estilos')), 15000)
        )
      ])
      
      const stylesMap = new Map(data.map((style) => [style.component_name, style.variables]))
      setStyles(stylesMap)
      
      // Guardar en localStorage para aplicar inmediatamente en la próxima carga
      try {
        const stylesObject = Object.fromEntries(stylesMap)
        localStorage.setItem("osoria_component_styles", JSON.stringify(stylesObject))
      } catch (e) {
        console.warn("[v0] Error saving component styles to localStorage:", e)
      }
      
      // Logs reducidos para evitar spam en consola
      if (stylesMap.size > 0) {
        console.log("[v0] Loaded styles from Supabase:", stylesMap.size, "components")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      // No loguear timeouts como errores críticos
      if (errorMessage.includes('Timeout')) {
        console.warn("[v0] Timeout al cargar estilos (no crítico):", errorMessage)
      } else {
        console.log("[v0] Could not load styles from Supabase:", errorMessage)
      }
      setError(errorMessage)
      // Don't throw, just continue with existing styles
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshStyles()
  }, [])

  return <StylesContext.Provider value={{ styles, loading, error, refreshStyles }}>{children}</StylesContext.Provider>
}

export function useStyles() {
  const context = useContext(StylesContext)
  if (context === undefined) {
    // Return default values instead of throwing
    console.warn("[v0] useStyles called outside of StylesProvider, returning defaults")
    return {
      styles: new Map(),
      loading: false,
      error: "Not in StylesProvider",
      refreshStyles: async () => {},
    }
  }
  return context
}

export function useComponentStyle(componentName: string, defaultStyles: Record<string, any> = {}) {
  const { styles, loading } = useStyles()
  
  // Memoizar defaultStyles para evitar re-renders infinitos
  const memoizedDefaults = useMemo(() => defaultStyles, [JSON.stringify(defaultStyles)])
  
  const [componentStyles, setComponentStyles] = useState<Record<string, any>>(
    styles.get(componentName) || memoizedDefaults,
  )

  useEffect(() => {
    const currentStyles = styles.get(componentName)
    if (currentStyles) {
      // Solo actualizar si realmente cambió
      setComponentStyles(prev => {
        const currentStr = JSON.stringify(currentStyles)
        const prevStr = JSON.stringify(prev)
        return currentStr !== prevStr ? currentStyles : prev
      })
    } else {
      // Solo actualizar si realmente cambió
      setComponentStyles(prev => {
        const defaultStr = JSON.stringify(memoizedDefaults)
        const prevStr = JSON.stringify(prev)
        return defaultStr !== prevStr ? memoizedDefaults : prev
      })
    }

    let channel: any = null

    try {
      channel = subscribeToStyleChanges(componentName, (newStyle) => {
        setComponentStyles(newStyle.variables)
        // Guardar en localStorage cuando se actualice desde Supabase
        try {
          const savedStyles = localStorage.getItem("osoria_component_styles")
          const styles = savedStyles ? JSON.parse(savedStyles) : {}
          styles[componentName] = newStyle.variables
          localStorage.setItem("osoria_component_styles", JSON.stringify(styles))
        } catch (e) {
          console.warn("[v0] Error saving component style to localStorage:", e)
        }
      })
    } catch (error) {
      // Error silencioso para evitar spam en consola
    }

    return () => {
      if (channel && typeof channel.unsubscribe === "function") {
        channel.unsubscribe()
      }
    }
  }, [componentName, styles, memoizedDefaults])

  return { styles: componentStyles, loading }
}
