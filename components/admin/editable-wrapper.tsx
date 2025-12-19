"use client"

import { useAdmin } from "@/contexts/admin-context"
import { type ReactNode, useCallback, useRef } from "react"

interface EditableWrapperProps {
  componentName: string
  children: ReactNode
  label: string
}

export function EditableWrapper({ componentName, children, label }: EditableWrapperProps) {
  const { isEditMode, selectedComponent, selectComponent } = useAdmin()
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Solo seleccionar si el clic no fue en un elemento interactivo
    const target = e.target as HTMLElement
    const isInteractive = target.closest('button, a, input, select, textarea, [role="button"]')
    
    if (isInteractive) {
      // Permitir que los elementos interactivos funcionen normalmente
      return
    }

    e.preventDefault()
    e.stopPropagation()
    console.log("[EditableWrapper] Clicked on component:", componentName, { isEditMode, target: target.tagName })
    selectComponent(componentName)
  }, [componentName, selectComponent, isEditMode])

  if (!isEditMode) {
    return <>{children}</>
  }

  const isSelected = selectedComponent === componentName

  return (
    <div
      ref={wrapperRef}
      className="relative group"
      onClick={handleClick}
      style={{ 
        cursor: isEditMode ? 'pointer' : 'default',
        position: 'relative',
        zIndex: isSelected ? 10 : 1
      }}
    >
      {/* Visual overlay - solo visual, no bloquea clics */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all ${
          isSelected
            ? "ring-4 ring-blue-500 bg-blue-500/10"
            : "group-hover:ring-2 group-hover:ring-blue-400/50 group-hover:bg-blue-400/5"
        }`}
        style={{
          zIndex: 1
        }}
      />

      {/* Label - siempre visible en modo edición, clickeable para seleccionar */}
      <div
        className={`absolute top-2 left-2 px-3 py-1 text-xs font-semibold rounded-md shadow-lg transition-all z-50 cursor-pointer ${
          isSelected
            ? "bg-blue-600 text-white opacity-100"
            : "bg-blue-500/90 text-white opacity-100 hover:bg-blue-600"
        }`}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          selectComponent(componentName)
        }}
        style={{
          zIndex: 100,
          pointerEvents: 'auto'
        }}
      >
        {label}
        {isSelected && <span className="ml-2">✓</span>}
      </div>

      {/* Children - funcionan normalmente */}
      <div
        style={{
          position: 'relative',
          zIndex: 2
        }}
      >
        {children}
      </div>
    </div>
  )
}
