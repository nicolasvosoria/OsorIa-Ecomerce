"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
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
      const data = await getComponentStyles()
      const stylesMap = new Map(data.map((style) => [style.component_name, style.variables]))
      setStyles(stylesMap)
      console.log("[v0] Loaded styles from Supabase:", stylesMap.size, "components")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.log("[v0] Could not load styles from Supabase:", errorMessage)
      setError(errorMessage)
      // Don't throw, just continue with empty styles
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
  const [componentStyles, setComponentStyles] = useState<Record<string, any>>(
    styles.get(componentName) || defaultStyles,
  )

  useEffect(() => {
    const currentStyles = styles.get(componentName)
    if (currentStyles) {
      setComponentStyles(currentStyles)
      console.log("[v0] Loaded styles for component:", componentName, currentStyles)
    }

    let channel: any = null

    try {
      channel = subscribeToStyleChanges(componentName, (newStyle) => {
        console.log("[v0] Real-time style update for:", componentName, newStyle.variables)
        setComponentStyles(newStyle.variables)
      })
    } catch (error) {
      console.log("[v0] Could not subscribe to style changes for", componentName)
    }

    return () => {
      if (channel && typeof channel.unsubscribe === "function") {
        channel.unsubscribe()
      }
    }
  }, [componentName, styles])

  return { styles: componentStyles, loading }
}
