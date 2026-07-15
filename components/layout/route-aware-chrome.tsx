"use client"

import { type ReactNode } from "react"
import { usePathname } from "next/navigation"

import { EditableWrapper } from "@/components/admin/editable-wrapper"
import { MainContentWrapper } from "@/components/admin/main-content-wrapper"
import { FloatingContactButton } from "@/components/ui/floating-contact-button"
import { Header } from "@/components/layout/header"
import { FooterNew } from "@/components/sections/footer-new"
import { useHasHydrated } from "@/lib/hooks/use-has-hydrated"
import { isThemePreviewMode } from "@/lib/theme-font/preview-mode"
import { sectionLabel } from "@/lib/section-editor/sections-registry"

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
  // The header and footer stay selectable inside the preview iframe (they reuse
  // the same `EditableWrapper`), while the rest of the storefront chrome — the
  // contact button — is edit-mode-only UI that has no place inside the customizer preview.
  const showEditableChrome = isStorefrontRoute
  const showStorefrontChrome = isStorefrontRoute && !isThemePreviewMode()

  return (
    <>
      <MainContentWrapper>
        <main data-vaul-drawer-wrapper="true">
          {showEditableChrome && (
            <EditableWrapper componentName="header" label="Header">
              <Header />
            </EditableWrapper>
          )}
          {children}
          {showEditableChrome && (
            <EditableWrapper componentName="footer" label={sectionLabel("footer")}>
              <FooterNew />
            </EditableWrapper>
          )}
        </main>
      </MainContentWrapper>
      {showStorefrontChrome && <FloatingContactButton />}
    </>
  )
}
