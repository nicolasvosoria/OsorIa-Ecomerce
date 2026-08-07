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
  isNeutralPage?: boolean
  // D14: resolved server-side (lib/supabase/store-contact-public.ts, called
  // from TenantScopedShell) and handed down -- this client component never
  // queries the store itself, only renders what it is given.
  contactPhone?: string | null
}

const ADMIN_CHROME_BASES = ["/admin", "/dashboard"]
const AUTH_JOURNEY_BASE = "/auth"
// The two /auth screens that are genuinely of cara al cliente: the storefront
// header links straight to /auth/cuenta (D14), and /auth/cuenta-confirmada is
// where a fresh signup lands. Every other /auth screen (login, invites,
// mailbox/password recovery) is provisioning/access to the panel, not the
// shop, so it stays out of the storefront chrome.
const STOREFRONT_AUTH_ROUTES = ["/auth/cuenta", "/auth/cuenta-confirmada"]

export function isAdminChromeRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return ADMIN_CHROME_BASES.some((base) => isRouteOrDescendant(pathname, base))
}

function isChromelessAuthRoute(pathname: string | null): boolean {
  if (!pathname || !isRouteOrDescendant(pathname, AUTH_JOURNEY_BASE)) return false
  return !STOREFRONT_AUTH_ROUTES.some((route) => isRouteOrDescendant(pathname, route))
}

export function RouteAwareChrome({ children, isNeutralPage = false, contactPhone = null }: RouteAwareChromeProps) {
  const pathname = usePathname()
  const hasHydrated = useHasHydrated()
  // El host admin (Plan 12) no tiene storefront: allí el proxy sirve la consola
  // bajo rutas limpias (/, /create), así que el pathname no delata al admin y el
  // host — que solo se conoce en el cliente, igual que este chrome, pospuesto ya
  // a la hidratación — es lo que aparta el header y footer de tienda.
  const isStorefrontHost = hasHydrated && !isPlatformAdminHost(window.location.host)
  // Los avisos de tienda apagada o inexistente también llegan por reescritura,
  // y ahí el pathname miente todavía más: sigue siendo "/" o "/shop". Por eso la
  // señal la trae el servidor desde el header que estampó el proxy (D3), y deja
  // el aviso solo, sin nada del chrome de tienda alrededor.
  // El viaje de autenticación, en cambio, sí llega por navegación real, así que
  // aquí el pathname basta: es aprovisionamiento y acceso al panel, no la
  // tienda, así que entra sin su chrome salvo las dos pantallas que sí son de
  // cara al cliente (isChromelessAuthRoute).
  const isStorefrontRoute =
    isStorefrontHost &&
    !isAdminChromeRoute(pathname) &&
    !isChromelessAuthRoute(pathname) &&
    !isNeutralPage
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
      {showStorefrontChrome && <FloatingContactButton phone={contactPhone} />}
    </CheckoutLoginIntentProvider>
  )
}
