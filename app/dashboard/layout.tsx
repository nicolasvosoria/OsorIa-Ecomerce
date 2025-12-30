import { AdminPermissionsProvider } from "@/contexts/admin-permissions-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminPermissionsProvider>
      {children}
    </AdminPermissionsProvider>
  )
}

