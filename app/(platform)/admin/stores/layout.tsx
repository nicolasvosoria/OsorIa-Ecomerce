import type React from "react"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { redirectIfPasswordChangeRequired } from "@/lib/admin/password-change-gate"
import { authorizeSuperAdmin } from "@/lib/supabase/active-store"
import {
  isPlatformAdminHost,
  resolveDeploymentRootHost,
} from "@/lib/utils/store-host"
import { PlatformTopbar } from "./components/platform-topbar"

export const metadata: Metadata = {
  title: "Consola de plataforma",
  description: "Consola global de tiendas para super admins",
}

// The platform tier (D4): the console lives in the (platform) route group, so
// app/admin/layout.tsx — the store shell with its per-store membership gate —
// never runs for /admin/stores/**. This layout is the only access gate for the
// whole subtree: every route under it renders through it, so a non-super_admin
// is redirected before any tenant data is fetched, regardless of the page hit.
export default async function StoresLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authorization = await authorizeSuperAdmin()
  if ("error" in authorization) {
    redirect(await nonSuperAdminExitUrl())
  }

  await redirectIfPasswordChangeRequired(authorization.userId, authorization.supabase)

  return (
    <div className="editor-chrome flex min-h-dvh flex-col bg-muted/20">
      <PlatformTopbar />
      <div className="flex-1 p-4 sm:p-6">{children}</div>
    </div>
  )
}

// On a store host the store dashboard (/admin) is the right exit. On the
// platform admin host (Plan 12) /admin redirects back to this very console, so
// sending a non-super_admin there would loop layout → proxy → layout forever;
// their own store cannot be resolved without membership either, so they leave
// to the deployment's root host.
async function nonSuperAdminExitUrl(): Promise<string> {
  const requestHeaders = await headers()
  const host = requestHeaders.get("host")
  if (!isPlatformAdminHost(host)) {
    return "/admin"
  }

  const rootHost = resolveDeploymentRootHost(host)
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (rootHost.startsWith("localhost") ? "http" : "https")
  return `${protocol}://${rootHost}/`
}
