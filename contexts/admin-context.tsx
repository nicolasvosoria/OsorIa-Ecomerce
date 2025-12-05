"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface AdminContextType {
  isEditMode: boolean
  isAdmin: boolean
  selectedComponent: string | null
  selectComponent: (componentName: string | null) => void
  componentEdits: Map<string, Record<string, any>>
  updateComponentEdit: (componentName: string, key: string, value: any) => void
  clearComponentEdits: (componentName: string) => void
  getAllEdits: () => Map<string, Record<string, any>>
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [componentEdits, setComponentEdits] = useState<Map<string, Record<string, any>>>(new Map())

  // Sin autenticación, el modo admin está deshabilitado
  const isAdmin = false

  const selectComponent = (componentName: string | null) => {
    if (!isAdmin) return
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
