"use client"

import { ReactNode } from "react"

interface MainContentWrapperProps {
  children: ReactNode
}

export function MainContentWrapper({ children }: MainContentWrapperProps) {
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
