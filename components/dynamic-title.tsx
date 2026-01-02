"use client"

import { useEffect, useState, useRef } from "react"
import { useStore } from "@/contexts/store-context"

/**
 * Mapeo de títulos personalizados por subdominio
 * Puedes agregar más subdominios aquí con sus títulos correspondientes
 */
const SUBDOMAIN_TITLES: Record<string, string> = {
  reposteria: "Tienda de Postres",
  // Agrega más subdominios aquí:
  // electronica: "Tienda de Electrónica",
  // ropa: "Tienda de Ropa",
}

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
 * Función para obtener el título correcto basado en el subdominio
 */
function getTitleForSubdomain(subdomain: string, storeName?: string): string {
  // Verificar si hay un título personalizado para este subdominio
  if (subdomain && SUBDOMAIN_TITLES[subdomain]) {
    return SUBDOMAIN_TITLES[subdomain]
  }

  // Si no hay título personalizado, usar el nombre de la tienda
  if (storeName) {
    return storeName
  }

  // Fallback al título por defecto
  return "Ecommerce"
}

/**
 * Componente que cambia el título de la página dinámicamente basado en la tienda
 * 
 * Prioridad:
 * 1. Título personalizado por subdominio (SUBDOMAIN_TITLES)
 * 2. Nombre de la tienda desde la base de datos (store.store_name)
 * 3. Título por defecto ("Ecommerce")
 * 
 * Estrategia:
 * - Aplica el título inmediatamente basado en el hostname
 * - Usa MutationObserver para mantener el título si algo lo cambia
 * - Actualiza cuando el store se carga completamente
 */
export function DynamicTitle() {
  const { store, isLoading } = useStore()
  const [initialSubdomain] = useState(() => getSubdomainFromHostname())
  const targetTitleRef = useRef<string | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)

  // Función para establecer el título
  const setTitle = (title: string) => {
    if (typeof document === 'undefined') return
    targetTitleRef.current = title
    if (document.title !== title) {
      document.title = title
      console.log(`[DynamicTitle] Título actualizado a: ${title}`)
    }
  }

  // Aplicar título inmediatamente basado en el hostname (antes de que se cargue el store)
  useEffect(() => {
    if (typeof document === 'undefined') return
    
    const title = getTitleForSubdomain(initialSubdomain)
    setTitle(title)
  }, []) // Solo ejecutar una vez al montar

  // Actualizar cuando el store se carga completamente
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (isLoading) return // Esperar a que el store se cargue

    // Usar el subdominio del store si está disponible, sino usar el del hostname
    const subdomain = store?.subdomain || initialSubdomain
    const title = getTitleForSubdomain(subdomain, store?.store_name)
    setTitle(title)
  }, [store?.subdomain, store?.store_name, isLoading, initialSubdomain])

  // Usar MutationObserver para mantener el título si algo lo cambia
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!targetTitleRef.current) return

    // Crear observer para detectar cambios en el título
    observerRef.current = new MutationObserver(() => {
      if (targetTitleRef.current && document.title !== targetTitleRef.current) {
        // Si el título cambió y no es el que queremos, restaurarlo
        document.title = targetTitleRef.current
      }
    })

    // Observar cambios en el elemento <title>
    const titleElement = document.querySelector('title')
    if (titleElement) {
      observerRef.current.observe(titleElement, {
        childList: true,
        characterData: true,
        subtree: true,
      })
    }

    // También usar un intervalo como respaldo (por si el observer no funciona)
    const intervalId = setInterval(() => {
      if (targetTitleRef.current && document.title !== targetTitleRef.current) {
        document.title = targetTitleRef.current
      }
    }, 100) // Verificar cada 100ms

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      clearInterval(intervalId)
    }
  }, [targetTitleRef.current])

  return null
}



