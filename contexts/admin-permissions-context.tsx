"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"
import { isCurrentUserAdmin, getCurrentUserRole } from "@/lib/supabase/permissions-api"
import { useAuth } from "@/contexts/auth-context"
import type { UserRole } from "@/lib/types/user"
import { deferStateUpdate } from "@/lib/react/defer-state-update"

interface AdminPermissionsContextType {
  isAdmin: boolean
  role: UserRole | null
  loading: boolean
  hasChecked: boolean // Indica si ya se ha verificado al menos una vez
  refreshPermissions: () => Promise<void>
}

const AdminPermissionsContext = createContext<AdminPermissionsContextType | undefined>(undefined)

export function AdminPermissionsProvider({ children }: { children: ReactNode }) {
  const { isLoading: authLoading, isAuthenticated, user } = useAuth()
  const currentUserId = user?.id ?? null
  const [isAdmin, setIsAdmin] = useState(false)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasChecked, setHasChecked] = useState(false) // Indica si ya se verificó al menos una vez
  const refreshRef = useRef(false) // Ref para evitar múltiples llamadas simultáneas
  const verifiedAsAdminRef = useRef(false) // Ref para rastrear si ya se verificó como admin exitosamente
  const checkedUserIdRef = useRef<string | null>(null) // Evita reutilizar permisos de otro usuario autenticado

  const refreshPermissions = async () => {
    // Evitar múltiples verificaciones simultáneas
    if (refreshRef.current) {
      console.log("[AdminPermissions] Verificación ya en progreso, ignorando llamada duplicada")
      return
    }
    
    refreshRef.current = true
    console.log("[AdminPermissions] Iniciando verificación de permisos...")
    try {
      setLoading(true)
      
      // Intentar obtener permisos con un timeout más largo
      // Usar Promise.allSettled para que si una falla, la otra pueda completarse
      const [adminResult, roleResult] = await Promise.allSettled([
        isCurrentUserAdmin(),
        getCurrentUserRole(),
      ])

      // Procesar resultado de isCurrentUserAdmin
      // IMPORTANTE: Actualizar isAdmin ANTES de establecer loading en false
      if (adminResult.status === 'fulfilled') {
        const adminValue = adminResult.value
        setIsAdmin(adminValue)
        verifiedAsAdminRef.current = adminValue // Rastrear si es admin
        console.log(`[AdminPermissions] Estado de admin actualizado: ${adminValue}`)
      } else {
        const error = adminResult.reason
        const errorMessage = error?.message || String(error) || ''
        console.warn("[AdminPermissions] Error al verificar admin status:", errorMessage)
        
        // Si hay un error, no establecer como false inmediatamente
        // Solo establecer false si es un error definitivo (no timeout)
        const isTimeout = errorMessage.includes('timeout') || 
                         errorMessage.includes('Timeout') ||
                         errorMessage.includes('Timeout al obtener usuario') ||
                         errorMessage.includes('Timeout al verificar rol')
        
        if (!isTimeout) {
          setIsAdmin(false)
        } else {
          console.log("[AdminPermissions] Timeout detectado, manteniendo estado actual de isAdmin")
        }
        // Si es timeout, mantener el estado actual (no cambiar isAdmin)
      }

      // Procesar resultado de getCurrentUserRole
      if (roleResult.status === 'fulfilled') {
        setRole(roleResult.value)
      } else {
        const error = roleResult.reason
        const errorMessage = error?.message || String(error) || ''
        console.warn("[AdminPermissions] Error al obtener rol:", errorMessage)
        
        // Si hay un error, no establecer como null inmediatamente
        // Solo establecer null si es un error definitivo (no timeout)
        const isTimeout = errorMessage.includes('timeout') || 
                         errorMessage.includes('Timeout') ||
                         errorMessage.includes('Timeout al obtener usuario') ||
                         errorMessage.includes('Timeout al obtener rol')
        
        if (!isTimeout) {
          setRole(null)
        } else {
          console.log("[AdminPermissions] Timeout detectado, manteniendo estado actual de role")
        }
        // Si es timeout, mantener el estado actual (no cambiar role)
      }

      // Marcar que ya se verificó al menos una vez
      setHasChecked(true)
    } catch (error) {
      console.error("[AdminPermissions] Error inesperado al cargar permisos:", error)
      // Solo establecer valores por defecto si es un error definitivo
      // No cambiar el estado si es un timeout
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!errorMessage.includes('timeout') && !errorMessage.includes('Timeout')) {
        setIsAdmin(false)
        setRole(null)
      }
      // Marcar que se intentó verificar (aunque haya fallado)
      setHasChecked(true)
    } finally {
      // Establecer loading en false DESPUÉS de que los estados se hayan actualizado
      // Usar un pequeño delay para asegurar que React haya procesado los updates
      setTimeout(() => {
        setLoading(false)
        console.log("[AdminPermissions] Verificación de permisos completada, hasChecked:", true)
        refreshRef.current = false // Permitir nuevas verificaciones
      }, 100)
    }
  }

  // Esperar a que la autenticación esté lista antes de comprobar permisos (evita "no tienes permisos" al entrar)
  useEffect(() => {
    if (authLoading) {
      deferStateUpdate(() => setLoading(true))
      return
    }

    // Si el usuario se desautenticó, resetear estado
    if (!isAuthenticated) {
      if (verifiedAsAdminRef.current || hasChecked || checkedUserIdRef.current !== null) {
        console.log("[AdminPermissions] Usuario desautenticado, reseteando estado")
        deferStateUpdate(() => {
          setIsAdmin(false)
          setRole(null)
          setHasChecked(false)
        })
        verifiedAsAdminRef.current = false // Resetear ref
        checkedUserIdRef.current = null
      }
      deferStateUpdate(() => setLoading(false))
      return
    }

    // Si cambió el usuario autenticado, negar hasta volver a verificar ese usuario.
    if (checkedUserIdRef.current !== currentUserId) {
      console.log("[AdminPermissions] Usuario autenticado cambió, revalidando permisos")
      checkedUserIdRef.current = currentUserId
      verifiedAsAdminRef.current = false
      deferStateUpdate(() => {
        setIsAdmin(false)
        setRole(null)
        setHasChecked(false)
        setLoading(true)
        void refreshPermissions()
      })
      return
    }

    // Si ya se verificó exitosamente como admin y el usuario sigue autenticado, no verificar de nuevo
    // Esto evita verificaciones innecesarias al navegar entre páginas
    if (verifiedAsAdminRef.current && isAuthenticated && !authLoading) {
      console.log("[AdminPermissions] Ya verificado como admin, omitiendo verificación adicional")
      setLoading(false) // Asegurar que loading esté en false
      return
    }

    // Solo verificar si no se ha verificado aún o si se reseteó el estado
    if (!hasChecked) {
      deferStateUpdate(() => {
        void refreshPermissions()
      })
    } else if (hasChecked && !isAdmin && !verifiedAsAdminRef.current) {
      // Ya se verificó y no es admin, mantener estado
      deferStateUpdate(() => setLoading(false))
    }
    // refreshPermissions intentionally stays outside deps to avoid repeated permission checks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, currentUserId]) // Revalidar cuando cambia el usuario autenticado, no solo el booleano de sesión


  return (
    <AdminPermissionsContext.Provider
      value={{
        isAdmin,
        role,
        loading,
        hasChecked,
        refreshPermissions,
      }}
    >
      {children}
    </AdminPermissionsContext.Provider>
  )
}

export function useAdminPermissions() {
  const context = useContext(AdminPermissionsContext)
  if (context === undefined) {
    throw new Error("useAdminPermissions debe usarse dentro de AdminPermissionsProvider")
  }
  return context
}
