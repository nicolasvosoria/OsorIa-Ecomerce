import type React from "react"
import type { Metadata } from "next"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "Admin",
  description: "Panel de administración para gestionar estilos del sitio web",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <Toaster closeButton position="bottom-right" />
    </>
  )
}
