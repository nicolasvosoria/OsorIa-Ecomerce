"use client"

import { useAdmin } from "@/contexts/admin-context"
import { Button } from "@/components/ui/button"
import { Edit, X } from "lucide-react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

export function EditModeToggle() {
  // Llamar todos los hooks primero, antes de cualquier return condicional
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  const { isAdmin, isEditMode, toggleEditMode, selectedComponent } = useAdmin()
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Ocultar el botón en las páginas del dashboard y admin
  const isDashboardOrAdminPage = pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')

  // Return condicional después de todos los hooks
  if (!isAdmin || isDashboardOrAdminPage) {
    return null
  }
  
  // Posicionar el botón de modo edición en la esquina inferior izquierda
  // Cuando el panel de edición está abierto, ajustar la posición para no quedar detrás del panel
  const leftOffset = !isMobile && isEditMode && selectedComponent ? "28rem" : "1rem" // 28rem cuando el panel está abierto, 1rem para esquina con pequeño margen

  return (
    <div 
      className="fixed bottom-4 z-50 transition-all duration-300"
      style={{ left: leftOffset }}
    >
      <Button
        onClick={toggleEditMode}
        size="lg"
        className={`shadow-lg ${
          isEditMode
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {isEditMode ? (
          <>
            <X className="h-4 w-4 mr-2" />
            Salir de Edición
          </>
        ) : (
          <>
            <Edit className="h-4 w-4 mr-2" />
            Modo Edición
          </>
        )}
      </Button>
    </div>
  )
}


