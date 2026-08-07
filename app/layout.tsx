import type React from "react"
import { Fragment, Suspense } from "react"
import type { Metadata } from "next"
import { cacheLife, cacheTag } from "next/cache"
import { headers } from "next/headers"
// Geist se auto-hospeda vía next/font/local (paquete `geist`) para evitar la
// petición bloqueante a fonts.googleapis.com y ser compatible con Turbopack.
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { Toaster } from "sonner"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { CartProvider } from "@/contexts/cart-context"
import { WishlistProvider } from "@/contexts/wishlist-context"
import { DebugGrid } from "@/components/debug-grid"
import { isDevelopment } from "@/lib/constants"
import { cn } from "../lib/utils"
import { StylesProvider } from "@/contexts/styles-context"
import { ThemeProvider } from "@/contexts/theme-context"
import { ModeProvider } from "@/contexts/mode-context"
import { FontProvider } from "@/contexts/font-context"
import { AuthProvider } from "@/contexts/auth-context"
import { AdminPermissionsProvider } from "@/contexts/admin-permissions-context"
import { AdminProvider } from "@/contexts/admin-context"
import { viewport } from "./viewport"
import { ApplyStylesScript } from "@/components/apply-styles-script"
import { LoadingScreen } from "@/components/loading-screen"
import { StylesLoader } from "@/components/styles-loader"
import { SiteBackground } from "@/components/site-background"
import { StoreProvider } from "@/contexts/store-context"
import { AdminRedirect } from "@/components/admin/admin-redirect"
import { DynamicTitle } from "@/components/dynamic-title"
import { DynamicFavicon } from "@/components/dynamic-favicon"
import { LanguageProvider } from "@/contexts/language-context"
import { RouteAwareChrome } from "@/components/layout/route-aware-chrome"
import {
  NEUTRAL_PAGE_HEADER,
  UNKNOWN_TENANT_HEADER,
  UNKNOWN_TENANT_VALUE,
} from "@/lib/stores/neutral-page"
import { metadataBaseFromEnvironment } from "@/lib/metadata/metadata-base"
import { getActivePairing } from "@/lib/supabase/fonts-api"
import { loadPublicStoreContactPhone } from "@/lib/supabase/store-contact-public"
import {
  buildPairingStylesheetUrl,
  shouldLoadFontStylesheet,
} from "@/lib/theme-font/bootstrap"
import { normalizePairingRecord } from "@/lib/theme-font/runtime-contract"

export const metadata: Metadata = {
  metadataBase: metadataBaseFromEnvironment(),
  title: "Ecommerce",
  description:
    "Ecommerce parametrizable.",
}

export { viewport }

interface FontPairingHeadLink {
  preloadHref: string
  stylesheetHref: string
}

/**
 * Resuelve la hoja de estilos de Google Fonts de la combinación de fuentes
 * activa para renderizarla en el `<head>` del servidor y evitar el FOUC del
 * `<link>` inyectado por el cliente. Cacheada para no golpear Supabase en
 * cada request; nunca debe hacer fallar el layout (build sin credenciales,
 * Supabase caído, etc.).
 */
async function resolveFontPairingHeadLinks(): Promise<FontPairingHeadLink[]> {
  'use cache'
  cacheTag('font-pairing')
  cacheLife('minutes')

  try {
    const pairing = await getActivePairing()
    if (!pairing) return []

    const normalized = normalizePairingRecord(pairing)
    if (!normalized) return []

    const combinedUrl = buildPairingStylesheetUrl(
      normalized.heading,
      normalized.body,
      normalized.headingFontAxis,
      normalized.bodyFontAxis,
    )

    if (combinedUrl) {
      return [{ preloadHref: combinedUrl, stylesheetHref: combinedUrl }]
    }

    const links: FontPairingHeadLink[] = []
    if (shouldLoadFontStylesheet(normalized.heading)) {
      const href = normalized.heading.google_font_url as string
      links.push({ preloadHref: href, stylesheetHref: href })
    }
    if (shouldLoadFontStylesheet(normalized.body)) {
      const href = normalized.body.google_font_url as string
      links.push({ preloadHref: href, stylesheetHref: href })
    }
    return links
  } catch (error) {
    console.warn(
      '[Layout] ⚠️ No se pudo obtener la combinación de fuentes activa:',
      error,
    )
    return []
  }
}

/**
 * El proxy sirve los avisos de tienda apagada e inexistente por reescritura, así
 * que en el navegador la URL sigue siendo la del storefront y `usePathname()`
 * nunca los delata: los headers que estampó el proxy son la única señal (D3).
 * Leerlos aquí y no en `RootLayout` es deliberado: `headers()` vuelve dinámico
 * a quien lo llama, y aislado bajo un <Suspense> el resto de rutas conserva su
 * shell estático en lugar de renderizarse entero en cada request.
 */
export async function TenantScopedShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers()
  const isNeutralPage = requestHeaders.has(NEUTRAL_PAGE_HEADER)
  // Un subdominio sin tienda detrás no tiene identidad que pintar: sin esta
  // señal los providers caerían en la tienda cuyo subdominio es `default` y el
  // aviso saldría vestido de otro inquilino.
  const isUnknownTenant =
    requestHeaders.get(UNKNOWN_TENANT_HEADER) === UNKNOWN_TENANT_VALUE
  // D14: loaded here, not inside the client FloatingContactButton, so the
  // dedicated public loader stays the only thing that ever queries
  // store_contact from the storefront -- an unknown tenant has no store to
  // query, same guard StoreProvider/StylesProvider/ThemeProvider use above.
  const contactPhone = isUnknownTenant ? null : await loadPublicStoreContactPhone()

  return (
    <LanguageProvider>
      <StoreProvider isUnknownTenant={isUnknownTenant}>
        <DynamicTitle />
        <DynamicFavicon />
        <StylesProvider isUnknownTenant={isUnknownTenant}>
          <AuthProvider>
            <AdminPermissionsProvider>
              <ThemeProvider isUnknownTenant={isUnknownTenant}>
                <ModeProvider>
                  <SiteBackground />
                  <FontProvider>
                    <CartProvider>
                      <WishlistProvider>
                        <AdminProvider>
                          <NuqsAdapter>
                            <StylesLoader>
                              <Suspense fallback={null}>
                                <AdminRedirect />
                              </Suspense>
                              <RouteAwareChrome isNeutralPage={isNeutralPage} contactPhone={contactPhone}>
                                {children}
                              </RouteAwareChrome>
                              {isDevelopment && <DebugGrid />}
                              <Toaster closeButton position="top-left" />
                            </StylesLoader>
                          </NuqsAdapter>
                        </AdminProvider>
                      </WishlistProvider>
                    </CartProvider>
                  </FontProvider>
                </ModeProvider>
              </ThemeProvider>
            </AdminPermissionsProvider>
          </AuthProvider>
        </StylesProvider>
      </StoreProvider>
    </LanguageProvider>
  )
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Resolver la hoja de estilos de la combinación de fuentes activa en el
  // servidor; nunca debe hacer fallar el layout si Supabase no está disponible.
  let fontPairingLinks: FontPairingHeadLink[] = []
  try {
    fontPairingLinks = await resolveFontPairingHeadLinks()
  } catch (error) {
    console.warn(
      '[Layout] ⚠️ No se pudo resolver la combinación de fuentes activa:',
      error,
    )
  }

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn(GeistSans.variable, GeistMono.variable)}
    >
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {fontPairingLinks.map((link) => (
          <Fragment key={link.stylesheetHref}>
            <link rel="preload" as="style" href={link.preloadHref} />
            <link rel="stylesheet" href={link.stylesheetHref} />
          </Fragment>
        ))}
      </head>
      <body
        className={cn("antialiased min-h-dvh")}
        suppressHydrationWarning
      >
        {/* Se queda fuera del hueco dinámico a propósito: corre con
            `strategy="beforeInteractive"`, así que tiene que viajar en el shell
            ya volcado. Dentro del <Suspense> llegaría después de la hidratación
            y devolvería el FOUC que existe para evitar. */}
        <ApplyStylesScript />
        {/* El fallback repite la pantalla de carga que `StylesLoader` ya pintaba
            en el shell estático: sin ella, las rutas ajenas a los avisos de
            tienda perderían su primer pintado y arrancarían en blanco. */}
        <Suspense fallback={<LoadingScreen />}>
          <TenantScopedShell>{children}</TenantScopedShell>
        </Suspense>
      </body>
    </html>
  )
}
