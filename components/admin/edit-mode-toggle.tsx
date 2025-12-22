"use client"

import { useAdmin } from "@/contexts/admin-context"
import { Button } from "@/components/ui/button"
import { Edit, X } from "lucide-react"
import { useState, useEffect } from "react"

export function EditModeToggle() {
  const { isAdmin, isEditMode, toggleEditMode, selectedComponent } = useAdmin()
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!isAdmin) {
    return null
  }
  
  // Ajustar posición cuando el panel de edición está abierto solo en desktop
  // En móviles, el panel es overlay completo, así que no necesitamos ajustar la posición
  const rightOffset = !isMobile && isEditMode && selectedComponent ? "28rem" : "1rem" // 28rem = 448px (384px + 64px de margen)

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


