import { AdminPermissionsProvider } from "@/contexts/admin-permissions-context"
import type { ReactNode } from "react"

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <AdminPermissionsProvider>
      {children}
    </AdminPermissionsProvider>
  )
}







