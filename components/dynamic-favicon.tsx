"use client"

import { useEffect, useState } from "react"
import { useStore } from "@/contexts/store-context"

/**
 * Función helper para obtener el subdominio del hostname
 */
function getSubdomainFromHostname(): string {
  if (typeof window === 'undefined') return 'default'
  
  const hostname = window.location.hostname
  
  // En desarrollo local, detectar subdominios como reposteria.localhost
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    const parts = hostname.split('.')
    if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127') {
      return parts[0] // Retornar el subdominio (ej: 'reposteria')
    }
    return 'default'
  }

  // En producción, extraer subdominio
  const parts = hostname.split('.')
  if (parts.length >= 2) {
    const subdomain = parts[0]
    if (subdomain === 'www') {
      return parts.length > 2 ? parts[1] : 'default'
    }
    return subdomain
  }
  
  return 'default'
}

/**
 * Función para actualizar el favicon
 */
function updateFavicon(subdomain: string) {
  if (typeof document === 'undefined') return

  // Construir la ruta del favicon específico
  const faviconPath = subdomain === 'default' 
    ? '/favicon.ico' 
    : `/favicon-${subdomain}.ico`

  // Buscar el link del favicon existente
  let faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement
  
  // Si no existe, crear uno nuevo
  if (!faviconLink) {
    faviconLink = document.createElement('link')
    faviconLink.rel = 'icon'
    faviconLink.type = 'image/x-icon'
    document.head.appendChild(faviconLink)
  }

  // Verificar si el favicon existe antes de cambiarlo
  const img = new Image()
  img.onload = () => {
    // El favicon existe, actualizarlo
    faviconLink.href = faviconPath
    console.log(`[Favicon] Actualizado a: ${faviconPath}`)
  }
  img.onerror = () => {
    // El favicon específico no existe, usar el por defecto
    if (subdomain !== 'default') {
      faviconLink.href = '/favicon.ico'
      console.log(`[Favicon] Favicon específico no encontrado (${faviconPath}), usando por defecto`)
    }
  }
  
  // Intentar cargar la imagen para verificar si existe
  img.src = faviconPath

  // También actualizar apple-touch-icon si existe
  const appleTouchIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement
  if (appleTouchIcon && subdomain !== 'default') {
    const appleIconPath = `/apple-touch-icon-${subdomain}.png`
    const appleImg = new Image()
    appleImg.onload = () => {
      appleTouchIcon.href = appleIconPath
    }
    appleImg.onerror = () => {
      // Mantener el por defecto si no existe el específico
    }
    appleImg.src = appleIconPath
  }
}

/**
 * Componente que actualiza dinámicamente el favicon según el subdominio/tienda activa
 * 
 * Funciona buscando favicons con el formato:
 * - /favicon-{subdomain}.ico (ej: /favicon-reposteria.ico)
 * - Si no existe, usa el favicon por defecto (/favicon.ico)
 * 
 * Estrategia:
 * 1. Aplica el favicon inmediatamente basado en el hostname (antes de que se cargue el store)
 * 2. Actualiza cuando el store se carga completamente (por si hay diferencias)
 */
export function DynamicFavicon() {
  const { store, isLoading } = useStore()
  const [initialSubdomain] = useState(() => getSubdomainFromHostname())

  // Aplicar favicon inmediatamente basado en el hostname (antes de que se cargue el store)
  useEffect(() => {
    if (typeof document === 'undefined') return
    
    // Aplicar favicon inmediatamente usando el hostname
    updateFavicon(initialSubdomain)
  }, []) // Solo ejecutar una vez al montar

  // Actualizar cuando el store se carga completamente (por si hay diferencias)
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (isLoading) return // Esperar a que el store se cargue

    // Usar el subdominio del store si está disponible, sino usar el del hostname
    const subdomain = store?.subdomain || initialSubdomain
    updateFavicon(subdomain)
  }, [store?.subdomain, isLoading, initialSubdomain])

  return null
}

