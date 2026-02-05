"use client"

import { useAdmin } from "@/contexts/admin-context"
import { Button } from "@/components/ui/button"
import { Edit, X } from "lucide-react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useLanguage } from "@/contexts/language-context"

export function EditModeToggle() {
  // Llamar todos los hooks primero, antes de cualquier return condicional
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  const { isAdmin, isEditMode, toggleEditMode, selectedComponent } = useAdmin()
  const { t } = useLanguage()
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Ocultar el botón en dashboard. En /admin mostrarlo siempre que esté en modo edición.
  const isDashboardPage = pathname?.startsWith('/dashboard')
  const isAdminPage = pathname?.startsWith('/admin')
  const hideToggle = !isAdmin || isDashboardPage || (isAdminPage && !isEditMode)

  // Return condicional después de todos los hooks
  if (hideToggle) {
    return null
  }

  // Posicionar el botón de modo edición en la esquina inferior derecha.
  // Cuando el panel de edición está abierto (hay componente seleccionado), desplazar para no quedar detrás del panel.
  const rightOffset = !isMobile && isEditMode && selectedComponent ? "28rem" : "1rem"

  return (
    <div 
      className="fixed bottom-4 z-50 transition-all duration-300"
      style={{ right: rightOffset }}
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
            {t.admin.exitEditMode}
          </>
        ) : (
          <>
            <Edit className="h-4 w-4 mr-2" />
            {t.admin.editMode}
          </>
        )}
      </Button>
    </div>
  )
}


