"use client"

import { useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"

import type { StoreSummary } from "@/lib/supabase/memberships-api"
import { isRouteOrDescendant } from "@/lib/admin/routes"
import { sidebarPinCookie } from "@/lib/admin/sidebar-pin-cookie"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AdminSidebar } from "./admin-sidebar"
import { AdminTopbar } from "./admin-topbar"

const THEME_EDITOR_ROUTE = "/admin/theme"

// The theme editor owns a full-screen chrome (its own top bar + sidebar), so it
// renders full-bleed inside the auth guard without the admin shell wrapping it.
function isThemeEditorRoute(pathname: string): boolean {
  return isRouteOrDescendant(pathname, THEME_EDITOR_ROUTE)
}

export function AdminShell({
  children,
  stores,
  activeStoreId,
  defaultPinned,
}: {
  children: ReactNode
  stores: StoreSummary[]
  activeStoreId: string
  defaultPinned: boolean
}) {
  const pathname = usePathname() ?? ""
  const [pinned, setPinned] = useState(defaultPinned)

  const pinSidebar = (nextPinned: boolean) => {
    setPinned(nextPinned)
    document.cookie = sidebarPinCookie(nextPinned)
  }

  if (isThemeEditorRoute(pathname)) {
    return <>{children}</>
  }

  return (
    <SidebarProvider
      pinned={pinned}
      onPinnedChange={pinSidebar}
      className="editor-chrome h-dvh overflow-hidden bg-muted/20"
    >
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopbar stores={stores} activeStoreId={activeStoreId} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </SidebarProvider>
  )
}
