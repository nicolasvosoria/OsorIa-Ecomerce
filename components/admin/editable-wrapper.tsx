"use client"

import { useAdmin } from "@/contexts/admin-context"
import { type ReactNode } from "react"

interface EditableWrapperProps {
  componentName: string
  children: ReactNode
  label: string
}

export function EditableWrapper({ componentName, children, label }: EditableWrapperProps) {
  const { isEditMode, selectedComponent, selectComponent } = useAdmin()

  if (!isEditMode) {
    return <>{children}</>
  }

  const isSelected = selectedComponent === componentName

  return (
    <div
      className="relative group cursor-pointer"
      onClick={(e) => {
        e.stopPropagation()
        selectComponent(componentName)
      }}
    >
      {/* Hover overlay */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all ${
          isSelected
            ? "ring-4 ring-blue-500 bg-blue-500/10 z-40"
            : "group-hover:ring-2 group-hover:ring-blue-400/50 group-hover:bg-blue-400/5"
        }`}
      />

      {/* Label */}
      <div
        className={`absolute top-2 left-2 px-3 py-1 text-xs font-semibold rounded-md shadow-lg transition-all z-50 ${
          isSelected
            ? "bg-blue-600 text-white"
            : "bg-blue-500/80 text-white opacity-0 group-hover:opacity-100"
        }`}
      >
        {label}
      </div>

      {children}
    </div>
  )
}
