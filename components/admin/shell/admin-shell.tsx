"use client"

import { useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"

import type { StoreServingState } from "@/lib/stores/serving-state"
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
  servingState,
  defaultPinned,
}: {
  children: ReactNode
  stores: StoreSummary[]
  activeStoreId: string
  servingState: StoreServingState | null
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
        <AdminTopbar stores={stores} activeStoreId={activeStoreId} servingState={servingState} />
        {/* `relative` no es cosmético: Radix monta los controles nativos ocultos de
            Select y Checkbox como `position: absolute`. Sin un ancestro posicionado
            su bloque contenedor es el ICB, así que escapan del recorte de este
            scroller y estiran el área de scroll del documento hasta el alto del
            contenido — un segundo scroll sobre el panel entero. */}
        <div className="relative flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </SidebarProvider>
  )
}
