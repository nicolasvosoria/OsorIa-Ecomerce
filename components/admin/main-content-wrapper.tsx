"use client"

import { useAdmin } from "@/contexts/admin-context"
import { ReactNode, useEffect, useState } from "react"

interface MainContentWrapperProps {
  children: ReactNode
}

export function MainContentWrapper({ children }: MainContentWrapperProps) {
  const { isEditMode, selectedComponent } = useAdmin()
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Solo aplicar estilos después de la hidratación para evitar diferencias SSR/CSR
  useEffect(() => {
    setMounted(true)
    
    // Detectar si es móvil
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint de Tailwind
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Agregar padding derecho cuando el panel de edición está abierto solo en desktop (384px = w-96)
  // En móviles, el panel es overlay completo, así que no agregamos padding
  const paddingRight = mounted && !isMobile && isEditMode && selectedComponent ? "24rem" : "0" // 24rem = 384px

  return (
    <div 
      className="transition-all duration-300"
      style={{ 
        paddingRight: paddingRight,
        minHeight: "100vh"
      }}
    >
      {children}
    </div>
  )
}

