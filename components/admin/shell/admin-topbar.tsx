"use client"

import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import type { StoreServingState } from "@/lib/stores/serving-state"
import type { StoreSummary } from "@/lib/supabase/memberships-api"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AdminUserMenu } from "./admin-user-menu"
import { StoreServingStateBadge } from "./store-serving-state-badge"
import { StoreSwitcher } from "./store-switcher"

export function AdminTopbar({
  stores,
  activeStoreId,
  servingState,
}: {
  stores: StoreSummary[]
  activeStoreId: string
  servingState: StoreServingState | null
}) {
  const { isSuperAdmin } = useAdminPermissions()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 shadow-sm sm:px-6">
      <SidebarTrigger className="md:hidden" />

      {/* Junto al nombre de la tienda, no en un aviso aparte: el estado califica
          a la identidad que ya está ahí y se lee desde cualquier ruta del panel. */}
      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
        <StoreSwitcher stores={stores} activeStoreId={activeStoreId} />
        <StoreServingStateBadge state={servingState} />
        <Badge variant={isSuperAdmin ? "default" : "secondary"}>{isSuperAdmin ? "Super admin" : "Admin"}</Badge>
        <AdminUserMenu />
      </div>
    </header>
  )
}
