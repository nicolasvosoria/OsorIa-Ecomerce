"use client"

import { useStore } from "@/contexts/store-context"
import { useEffect } from "react"

/**
 * Layout específico para la tienda de repostería
 * Aplica estilos personalizados basados en nicolukas.com
 */
export function ReposteriaLayout({ children }: { children: React.ReactNode }) {
  const { store } = useStore()
  const storeSubdomain = store?.subdomain ?? null
  const configuredPrimaryColor = store?.primary_color ?? null
  const configuredSecondaryColor = store?.secondary_color ?? null

  useEffect(() => {
    // Solo aplicar si estamos en la tienda de repostería
    if (storeSubdomain === 'reposteria') {
      const root = document.documentElement
      
      // Aplicar tema personalizado de repostería (inspirado en nicolukas.com)
      // Usar colores de la tienda si están disponibles, sino usar valores por defecto
      const primaryColor = configuredPrimaryColor || '#FF6B9D'
      const secondaryColor = configuredSecondaryColor || '#FFE5F1'
      
      root.style.setProperty('--primary', primaryColor)
      root.style.setProperty('--secondary', secondaryColor)
      root.style.setProperty('--accent', '#FFB6D9')
      root.style.setProperty('--background', '#FFFBF9')
      root.style.setProperty('--foreground', '#2D1B1B')
      root.style.setProperty('--card', '#FFFFFF')
      root.style.setProperty('--card-foreground', '#2D1B1B')
      root.style.setProperty('--border', '#F5E6E0')
      root.style.setProperty('--muted', '#FFF5F0')
      root.style.setProperty('--muted-foreground', '#8B6F6F')
      root.style.setProperty('--primary-foreground', '#FFFFFF')
      root.style.setProperty('--secondary-foreground', '#2D1B1B')
      root.style.setProperty('--accent-foreground', '#FFFFFF')

      // Agregar clase específica para estilos de repostería
      document.body.classList.add('reposteria-store')
      
      // Cargar fuente elegante (similar a nicolukas.com) solo una vez
      if (!document.querySelector('link[href*="Playfair+Display"]')) {
        const link = document.createElement('link')
        link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap'
        link.rel = 'stylesheet'
        document.head.appendChild(link)
      }
      
      // Aplicar fuente
      root.style.setProperty('--font-family-sans', '"Inter", sans-serif')
      root.style.setProperty('--font-family-serif', '"Playfair Display", serif')
    } else {
      // Si no es repostería, remover la clase
      document.body.classList.remove('reposteria-store')
    }

    return () => {
      // Limpiar al desmontar solo si no es repostería
      if (storeSubdomain !== 'reposteria') {
        document.body.classList.remove('reposteria-store')
      }
    }
  }, [configuredPrimaryColor, configuredSecondaryColor, storeSubdomain])

  return <>{children}</>
}
