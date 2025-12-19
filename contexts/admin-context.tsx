"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "@/contexts/auth-context"
import { isCurrentUserAdmin } from "@/lib/supabase/permissions-api"

interface AdminContextType {
  isEditMode: boolean
  isAdmin: boolean
  selectedComponent: string | null
  selectComponent: (componentName: string | null) => void
  componentEdits: Map<string, Record<string, any>>
  updateComponentEdit: (componentName: string, key: string, value: any) => void
  clearComponentEdits: (componentName: string) => void
  getAllEdits: () => Map<string, Record<string, any>>
  toggleEditMode: () => void
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [componentEdits, setComponentEdits] = useState<Map<string, Record<string, any>>>(new Map())
  const [isAdmin, setIsAdmin] = useState(false)
  const { isAuthenticated, user } = useAuth()

  // Verificar si el usuario es admin cuando cambia la autenticación
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isAuthenticated && user) {
        try {
          const adminStatus = await isCurrentUserAdmin()
          setIsAdmin(adminStatus)
          // Si el usuario deja de ser admin, desactivar modo edición
          if (!adminStatus) {
            setIsEditMode(false)
            setSelectedComponent(null)
          }
        } catch (error) {
          console.error("[Admin] Error verificando rol de admin:", error)
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
        setIsEditMode(false)
        setSelectedComponent(null)
      }
    }

    checkAdminStatus()
  }, [isAuthenticated, user])

  const toggleEditMode = () => {
    if (!isAdmin) {
      console.warn("[Admin] Intento de activar modo edición sin permisos de admin")
      return
    }
    setIsEditMode((prev) => {
      const newValue = !prev
      console.log("[Admin] Modo edición:", newValue ? "ACTIVADO" : "DESACTIVADO")
      if (!newValue) {
        // Si se desactiva, limpiar selección
        setSelectedComponent(null)
      }
      return newValue
    })
  }

  const selectComponent = (componentName: string | null) => {
    if (!isAdmin || !isEditMode) return
    setSelectedComponent(componentName)
  }

  const updateComponentEdit = (componentName: string, key: string, value: any) => {
    if (!isAdmin) return
    setComponentEdits((prev) => {
      const newMap = new Map(prev)
      const currentEdits = newMap.get(componentName) || {}
      newMap.set(componentName, { ...currentEdits, [key]: value })
      return newMap
    })
  }

  const clearComponentEdits = (componentName: string) => {
    if (!isAdmin) return
    setComponentEdits((prev) => {
      const newMap = new Map(prev)
      newMap.delete(componentName)
      return newMap
    })
  }

  const getAllEdits = () => componentEdits

  return (
    <AdminContext.Provider
      value={{
        isEditMode,
        isAdmin,
        selectedComponent,
        selectComponent,
        componentEdits,
        updateComponentEdit,
        clearComponentEdits,
        getAllEdits,
        toggleEditMode,
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    return {
      isEditMode: false,
      isAdmin: false,
      selectedComponent: null,
      selectComponent: () => {},
      componentEdits: new Map(),
      updateComponentEdit: () => {},
      clearComponentEdits: () => {},
      getAllEdits: () => new Map(),
    }
  }
  return context
}
