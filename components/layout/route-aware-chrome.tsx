"use client"

import { type ReactNode } from "react"
import { usePathname } from "next/navigation"

import { EditableWrapper } from "@/components/admin/editable-wrapper"
import { MainContentWrapper } from "@/components/admin/main-content-wrapper"
import { isRouteOrDescendant } from "@/lib/admin/routes"
import { isPlatformAdminHost } from "@/lib/utils/store-host"
import { FloatingContactButton } from "@/components/ui/floating-contact-button"
import { Header } from "@/components/layout/header"
import { FooterNew } from "@/components/sections/footer-new"
import { CheckoutLoginIntentProvider } from "@/contexts/checkout-login-intent-context"
import { useHasHydrated } from "@/lib/hooks/use-has-hydrated"
import { isThemePreviewMode } from "@/lib/theme-font/preview-mode"
import { sectionLabel } from "@/lib/section-editor/sections-registry"

interface RouteAwareChromeProps {
  children: ReactNode
}

const ADMIN_CHROME_BASES = ["/admin", "/dashboard"]

export function isAdminChromeRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return ADMIN_CHROME_BASES.some((base) => isRouteOrDescendant(pathname, base))
}

export function RouteAwareChrome({ children }: RouteAwareChromeProps) {
  const pathname = usePathname()
  const hasHydrated = useHasHydrated()
  // El host admin (Plan 12) no tiene storefront: allí el proxy sirve la consola
  // bajo rutas limpias (/, /create), así que el pathname no delata al admin y el
  // host — que solo se conoce en el cliente, igual que este chrome, pospuesto ya
  // a la hidratación — es lo que aparta el header y footer de tienda.
  const isStorefrontHost = hasHydrated && !isPlatformAdminHost(window.location.host)
  const isStorefrontRoute = isStorefrontHost && !isAdminChromeRoute(pathname)
  // The header and footer stay selectable inside the preview iframe (they reuse
  // the same `EditableWrapper`), while the rest of the storefront chrome — the
  // contact button — is edit-mode-only UI that has no place inside the customizer preview.
  const showEditableChrome = isStorefrontRoute
  const showStorefrontChrome = isStorefrontRoute && !isThemePreviewMode()

  const pageMain = (
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
  )

  // El admin queda fuera del wrapper: su `min-height: 100vh` se suma al alto del
  // shell y hace scrollear el documento a la vez que el panel. La condición sale
  // del pathname (no de la hidratación) para que el árbol del storefront no
  // cambie entre servidor y cliente.
  return (
    <CheckoutLoginIntentProvider>
      {isAdminChromeRoute(pathname) ? pageMain : <MainContentWrapper>{pageMain}</MainContentWrapper>}
      {showStorefrontChrome && <FloatingContactButton />}
    </CheckoutLoginIntentProvider>
  )
}
