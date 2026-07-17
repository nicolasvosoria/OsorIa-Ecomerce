"use client"

import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import type { StoreSummary } from "@/lib/supabase/memberships-api"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AdminUserMenu } from "./admin-user-menu"
import { StoreSwitcher } from "./store-switcher"

export function AdminTopbar({
  stores,
  activeStoreId,
}: {
  stores: StoreSummary[]
  activeStoreId: string
}) {
  const { isSuperAdmin } = useAdminPermissions()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 shadow-sm sm:px-6">
      <SidebarTrigger className="md:hidden" />

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <StoreSwitcher stores={stores} activeStoreId={activeStoreId} />
        <Badge variant={isSuperAdmin ? "default" : "secondary"}>{isSuperAdmin ? "Super admin" : "Admin"}</Badge>
        <AdminUserMenu />
      </div>
    </header>
  )
}
