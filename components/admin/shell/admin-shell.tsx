"use client"

import { type ReactNode } from "react"
import { usePathname } from "next/navigation"

import type { StoreSummary } from "@/lib/supabase/memberships-api"
import { AdminSidebar } from "./admin-sidebar"
import { AdminTopbar } from "./admin-topbar"

const THEME_EDITOR_ROUTE = "/admin/theme"

// The theme editor owns a full-screen chrome (its own top bar + sidebar), so it
// renders full-bleed inside the auth guard without the admin shell wrapping it.
function isThemeEditorRoute(pathname: string): boolean {
  return pathname === THEME_EDITOR_ROUTE || pathname.startsWith(`${THEME_EDITOR_ROUTE}/`)
}

export function AdminShell({
  children,
  stores,
  activeStoreId,
}: {
  children: ReactNode
  stores: StoreSummary[]
  activeStoreId: string
}) {
  const pathname = usePathname() ?? ""

  if (isThemeEditorRoute(pathname)) {
    return <>{children}</>
  }

  return (
    <div className="editor-chrome flex h-screen flex-col overflow-hidden bg-muted/20">
      <AdminTopbar stores={stores} activeStoreId={activeStoreId} />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
