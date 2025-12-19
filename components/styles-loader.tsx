"use client"

import { useEffect, useState } from "react"
import { useTheme } from "@/contexts/theme-context"
import { useFont } from "@/contexts/font-context"
import { useStyles } from "@/contexts/styles-context"
import { LoadingScreen } from "./loading-screen"

interface StylesLoaderProps {
  children: React.ReactNode
}

/**
 * Componente que muestra una pantalla de carga mientras se cargan todos los estilos
 * (tema, fuente, estilos de componentes) y solo muestra el contenido cuando todo está listo
 */
export function StylesLoader({ children }: StylesLoaderProps) {
  const { loading: themeLoading, activeTheme } = useTheme()
  const { loading: fontLoading, activeFont } = useFont()
  const { loading: stylesLoading } = useStyles()
  const [isReady, setIsReady] = useState(false)
  const [minLoadTime, setMinLoadTime] = useState(true)
  const [scriptExecuted, setScriptExecuted] = useState(false)

  // Verificar si el script de estilos ya se ejecutó
  useEffect(() => {
    // Verificar si el script ya aplicó los estilos
    if (typeof window !== "undefined") {
      // El script se ejecuta antes de React, así que debería estar disponible inmediatamente
      const scriptExecuted = (window as any).__osoria_script_executed === true
      const stylesApplied = (window as any).__osoria_styles_applied === true
      
      if (scriptExecuted || stylesApplied) {
        setScriptExecuted(true)
      } else {
        // Si no se ha ejecutado aún, esperar un poco (máximo 500ms)
        let attempts = 0
        const maxAttempts = 10
        const checkScript = () => {
          attempts++
          const executed = (window as any).__osoria_script_executed === true
          const applied = (window as any).__osoria_styles_applied === true
          if (executed || applied || attempts >= maxAttempts) {
            setScriptExecuted(true)
          } else {
            setTimeout(checkScript, 50)
          }
        }
        setTimeout(checkScript, 50)
      }
    }
  }, [])

  // Verificar si todos los estilos están cargados
  // Los providers deben terminar de cargar Y tener datos (o no necesitarlos)
  const providersReady = !themeLoading && !fontLoading && !stylesLoading
  
  // Verificar que tenemos tema y fuente (o que no son necesarios)
  const hasTheme = activeTheme !== null || !themeLoading
  const hasFont = activeFont !== null || !fontLoading
  
  // Todo está listo cuando:
  // 1. Los providers terminaron de cargar
  // 2. Tenemos tema y fuente (o no son necesarios)
  // 3. El script se ejecutó (o ya pasó suficiente tiempo)
  const allStylesLoaded = providersReady && hasTheme && hasFont && scriptExecuted

  // Tiempo mínimo de carga para evitar flash (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadTime(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  // Marcar cuando la carga inicial está completa
  useEffect(() => {
    if (allStylesLoaded && !minLoadTime) {
      // Pequeño delay para asegurar que los estilos se aplicaron al DOM
      const timer = setTimeout(() => {
        setIsReady(true)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [allStylesLoaded, minLoadTime])

  return (
    <>
      {!isReady && <LoadingScreen />}
      <div
        className={isReady ? "opacity-100" : "opacity-0"}
        style={{
          transition: "opacity 0.4s ease-in-out",
          visibility: isReady ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </>
  )
}

