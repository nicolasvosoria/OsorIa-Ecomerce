"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface AdminContextType {
  isEditMode: boolean
  selectedComponent: string | null
  selectComponent: (componentName: string | null) => void
  componentEdits: Map<string, Record<string, any>>
  updateComponentEdit: (componentName: string, key: string, value: any) => void
  clearComponentEdits: (componentName: string) => void
  getAllEdits: () => Map<string, Record<string, any>>
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isEditMode] = useState(true)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [componentEdits, setComponentEdits] = useState<Map<string, Record<string, any>>>(new Map())

  const selectComponent = (componentName: string | null) => {
    setSelectedComponent(componentName)
  }

  const updateComponentEdit = (componentName: string, key: string, value: any) => {
    setComponentEdits((prev) => {
      const newMap = new Map(prev)
      const currentEdits = newMap.get(componentName) || {}
      newMap.set(componentName, { ...currentEdits, [key]: value })
      return newMap
    })
  }

  const clearComponentEdits = (componentName: string) => {
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
