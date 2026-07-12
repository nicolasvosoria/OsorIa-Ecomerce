"use client"

import { type ReactNode } from "react"
import { usePathname } from "next/navigation"

import { EditableWrapper } from "@/components/admin/editable-wrapper"
import { MainContentWrapper } from "@/components/admin/main-content-wrapper"
import { FloatingContactButton } from "@/components/ui/floating-contact-button"
import { Header } from "@/components/layout/header"
import { AdminSessionActions } from "@/components/admin/admin-session-actions"
import { useHasHydrated } from "@/lib/hooks/use-has-hydrated"
import { isThemePreviewMode } from "@/lib/theme-font/preview-mode"

interface RouteAwareChromeProps {
  children: ReactNode
}

export function isAdminChromeRoute(pathname: string | null): boolean {
  return pathname === "/admin"
    || pathname?.startsWith("/admin/") === true
    || pathname === "/dashboard"
    || pathname?.startsWith("/dashboard/") === true
}

export function RouteAwareChrome({ children }: RouteAwareChromeProps) {
  const pathname = usePathname()
  const hasHydrated = useHasHydrated()
  const isStorefrontRoute = hasHydrated && !isAdminChromeRoute(pathname)
  // The header stays selectable inside the preview iframe (it reuses the same
  // `EditableWrapper`), while the rest of the storefront chrome — the contact
  // button — is edit-mode-only UI that has no place inside the customizer preview.
  const showHeader = isStorefrontRoute
  const showStorefrontChrome = isStorefrontRoute && !isThemePreviewMode()
  const showAdminSessionActions = hasHydrated && isAdminChromeRoute(pathname) && pathname !== "/admin/theme"

  return (
    <>
      <MainContentWrapper>
        <main data-vaul-drawer-wrapper="true">
          {showHeader && (
            <EditableWrapper componentName="header" label="Header">
              <Header />
            </EditableWrapper>
          )}
          {children}
        </main>
      </MainContentWrapper>
      {showAdminSessionActions && <AdminSessionActions />}
      {showStorefrontChrome && <FloatingContactButton />}
    </>
  )
}
