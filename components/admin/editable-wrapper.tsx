"use client"

import { useAdmin } from "@/contexts/admin-context"
import { type ReactNode, useCallback } from "react"
import { useHasHydrated } from "@/lib/hooks/use-has-hydrated"
import { isThemePreviewMode, THEME_PREVIEW_SELECT_SOURCE } from "@/lib/theme-font/preview-mode"
import { usePreviewSelection } from "@/lib/theme-font/preview-selection"

interface EditableWrapperProps {
  componentName: string
  children: ReactNode
  label: string
}

export function EditableWrapper({ componentName, children, label }: EditableWrapperProps) {
  const { isEditMode, selectedComponent, selectComponent } = useAdmin()
  const hasHydrated = useHasHydrated()
  const isPreviewMode = hasHydrated && isThemePreviewMode()
  const previewSelectedComponent = usePreviewSelection()

  const selectThisComponent = useCallback(() => {
    if (isPreviewMode) {
      window.parent.postMessage(
        { source: THEME_PREVIEW_SELECT_SOURCE, componentName },
        window.location.origin,
      )
      return
    }
    selectComponent(componentName)
  }, [componentName, isPreviewMode, selectComponent])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const isInteractive = target.closest('button, a, input, select, textarea, [role="button"]')

    if (isInteractive) {
      return
    }

    e.preventDefault()
    e.stopPropagation()
    selectThisComponent()
  }, [selectThisComponent])

  if (!isPreviewMode && !isEditMode) {
    return <>{children}</>
  }

  const isSelected = isPreviewMode
    ? previewSelectedComponent === componentName
    : selectedComponent === componentName

  return (
    <div
      className="relative group"
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        position: 'relative',
        zIndex: isSelected ? 10 : 1
      }}
    >
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

      <div
        className={`absolute top-2 left-2 px-3 py-1 text-xs font-semibold rounded-md shadow-lg transition-all z-50 cursor-pointer ${
          isSelected
            ? "bg-blue-600 text-white opacity-100"
            : "bg-blue-500/90 text-white opacity-100 hover:bg-blue-600"
        }`}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          selectThisComponent()
        }}
        style={{
          zIndex: 100,
          pointerEvents: 'auto'
        }}
      >
        {label}
        {isSelected && <span className="ml-2">✓</span>}
      </div>

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
