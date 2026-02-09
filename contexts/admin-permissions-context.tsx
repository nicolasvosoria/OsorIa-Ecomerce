"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { isCurrentUserAdmin, getCurrentUserRole } from "@/lib/supabase/permissions-api"
import { useAuth } from "@/contexts/auth-context"
import type { UserRole } from "@/lib/types/user"

interface AdminPermissionsContextType {
  isAdmin: boolean
  role: UserRole | null
  loading: boolean
  hasChecked: boolean // Indica si ya se ha verificado al menos una vez
  refreshPermissions: () => Promise<void>
}

const AdminPermissionsContext = createContext<AdminPermissionsContextType | undefined>(undefined)

export function AdminPermissionsProvider({ children }: { children: ReactNode }) {
  const { isLoading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasChecked, setHasChecked] = useState(false) // Indica si ya se verificó al menos una vez

  const refreshPermissions = async () => {
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
        setIsAdmin(adminResult.value)
        console.log(`[AdminPermissions] Estado de admin actualizado: ${adminResult.value}`)
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
      }, 100)
    }
  }

  // Esperar a que la autenticación esté lista antes de comprobar permisos (evita "no tienes permisos" al entrar)
  useEffect(() => {
    if (authLoading) {
      setLoading(true)
      return
    }
    refreshPermissions()
  }, [authLoading])


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
