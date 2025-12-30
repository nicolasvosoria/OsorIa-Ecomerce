"use client"

import { ReactNode, useEffect, useState } from "react"

interface MainContentWrapperProps {
  children: ReactNode
}

export function MainContentWrapper({ children }: MainContentWrapperProps) {
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
  
  // Durante prerendering, no aplicar padding
  // El padding se aplicará dinámicamente en el cliente si es necesario
  const paddingRight = "0"

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
