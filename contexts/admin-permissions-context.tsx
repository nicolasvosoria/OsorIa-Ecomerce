"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { isCurrentUserAdmin, getCurrentUserRole } from "@/lib/supabase/permissions-api"
import { useAuth } from "@/contexts/auth-context"
import type { UserRole } from "@/lib/types/user"

interface AdminPermissionsContextType {
  isAdmin: boolean
  role: UserRole | null
  loading: boolean
  refreshPermissions: () => Promise<void>
}

const AdminPermissionsContext = createContext<AdminPermissionsContextType | undefined>(undefined)

export function AdminPermissionsProvider({ children }: { children: ReactNode }) {
  const { isLoading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshPermissions = async () => {
    try {
      setLoading(true)
      const [adminStatus, userRole] = await Promise.all([
        isCurrentUserAdmin(),
        getCurrentUserRole(),
      ])
      setIsAdmin(adminStatus)
      setRole(userRole)
    } catch (error) {
      console.error("[AdminPermissions] Error al cargar permisos:", error)
      setIsAdmin(false)
      setRole(null)
    } finally {
      setLoading(false)
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
