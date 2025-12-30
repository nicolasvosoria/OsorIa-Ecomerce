"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import { useAuth } from "@/contexts/auth-context"

/**
 * Componente que redirige automáticamente a los administradores al dashboard
 * SOLO cuando vienen directamente del callback de autenticación (primera vez después de login)
 * Permite que los administradores naveguen libremente por la tienda para editar componentes
 * sin ser redirigidos constantemente
 */
export function AdminRedirect() {
  const { isAdmin, loading } = useAdminPermissions()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hasRedirected = useRef(false)
  const sessionStorageKey = 'admin_redirected_this_session'

  useEffect(() => {
    // Verificar si ya se redirigió en esta sesión usando sessionStorage
    const alreadyRedirected = typeof window !== 'undefined' 
      ? sessionStorage.getItem(sessionStorageKey) === 'true'
      : false

    // Verificar si viene específicamente del callback de autenticación
    const referrer = typeof window !== 'undefined' ? document.referrer : ''
    const isFromAuthCallback = 
      referrer.includes('/auth/callback') ||
      searchParams.get('from') === 'auth' ||
      searchParams.get('redirect') === 'dashboard'

    // Solo redirigir UNA VEZ si:
    // 1. No está cargando
    // 2. El usuario está autenticado
    // 3. El usuario es administrador
    // 4. Está en la página principal (/)
    // 5. No está ya en el dashboard o admin
    // 6. Viene específicamente del callback de autenticación
    // 7. No se ha redirigido ya en esta sesión
    
    if (
      !loading &&
      !authLoading &&
      isAuthenticated &&
      isAdmin &&
      pathname === "/" &&
      !pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/admin") &&
      isFromAuthCallback &&
      !hasRedirected.current &&
      !alreadyRedirected
    ) {
      // Marcar como redirigido para evitar redirecciones futuras
      hasRedirected.current = true
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(sessionStorageKey, 'true')
      }
      
      // Redirigir solo una vez cuando viene de autenticación
      const timer = setTimeout(() => {
        router.push("/dashboard")
      }, 1500) // Delay para dar tiempo a que la página cargue

      return () => clearTimeout(timer)
    }
  }, [isAdmin, loading, isAuthenticated, authLoading, pathname, router, searchParams])

  return null
}

