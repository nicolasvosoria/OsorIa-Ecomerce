"use client"

import { useAdmin } from "@/contexts/admin-context"
import { ReactNode, useEffect, useState } from "react"

interface MainContentWrapperProps {
  children: ReactNode
}

export function MainContentWrapper({ children }: MainContentWrapperProps) {
  const { isEditMode, selectedComponent } = useAdmin()
  const [mounted, setMounted] = useState(false)
  
  // Solo aplicar estilos después de la hidratación para evitar diferencias SSR/CSR
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Agregar padding derecho cuando el panel de edición está abierto (384px = w-96)
  const paddingRight = mounted && isEditMode && selectedComponent ? "24rem" : "0" // 24rem = 384px

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

