"use client"

import { useEffect, useRef } from "react"
import { useAdmin } from "@/contexts/admin-context"

/**
 * Componente que activa automáticamente el modo de edición
 * cuando se renderiza. Se usa en la página /admin
 */
export function AdminPageWrapper({ children }: { children: React.ReactNode }) {
  const { isAdmin, isEditMode, toggleEditMode } = useAdmin()
  const hasActivated = useRef(false)

  useEffect(() => {
    // Activar modo de edición automáticamente si es admin y no está activo
    // Solo una vez cuando el componente se monta
    if (isAdmin && !isEditMode && !hasActivated.current) {
      hasActivated.current = true
      console.log("[AdminPageWrapper] Activando modo de edición automáticamente", { isAdmin, isEditMode })
      // Usar setTimeout para evitar problemas de estado durante el render
      const timer = setTimeout(() => {
        console.log("[AdminPageWrapper] Ejecutando toggleEditMode")
        toggleEditMode()
      }, 200)
      
      return () => clearTimeout(timer)
    }
  }, [isAdmin, isEditMode, toggleEditMode])

  // Log para depuración
  useEffect(() => {
    console.log("[AdminPageWrapper] Estado actual:", { isAdmin, isEditMode, hasActivated: hasActivated.current })
  }, [isAdmin, isEditMode])

  return <>{children}</>
}

