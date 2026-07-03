import type React from "react"
import { Fragment, Suspense } from "react"
import type { Metadata } from "next"
import { cacheLife, cacheTag } from "next/cache"
// Geist se auto-hospeda vía next/font/local (paquete `geist`) para evitar la
// petición bloqueante a fonts.googleapis.com y ser compatible con Turbopack.
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { Toaster } from "sonner"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { CartProvider as ShopifyCartProvider } from "@/components/cart/cart-context"
import { CartProvider } from "@/contexts/cart-context"
import { WishlistProvider } from "@/contexts/wishlist-context"
import { DebugGrid } from "@/components/debug-grid"
import { isDevelopment } from "@/lib/constants"
import { getCollections } from "@/lib/shopify"
import dynamic from "next/dynamic"
import { V0Provider } from "../lib/context"
import { cn } from "../lib/utils"
import { StylesProvider } from "@/contexts/styles-context"
import { ThemeProvider } from "@/contexts/theme-context"
import { FontProvider } from "@/contexts/font-context"
import { AuthProvider } from "@/contexts/auth-context"
import { AdminPermissionsProvider } from "@/contexts/admin-permissions-context"
import { AdminProvider } from "@/contexts/admin-context"
import { viewport } from "./viewport"
import { ApplyStylesScript } from "@/components/apply-styles-script"
import { StylesLoader } from "@/components/styles-loader"
import { SiteBackground } from "@/components/site-background"
import { StoreProvider } from "@/contexts/store-context"
import { ReposteriaLayout } from "./reposteria-layout"
import { AdminRedirect } from "@/components/admin/admin-redirect"
import { DynamicTitle } from "@/components/dynamic-title"
import { DynamicFavicon } from "@/components/dynamic-favicon"
import { DynamicLang } from "@/components/dynamic-lang"
import { LanguageProvider } from "@/contexts/language-context"
import { RouteAwareChrome } from "@/components/layout/route-aware-chrome"
import { metadataBaseFromEnvironment } from "@/lib/metadata/metadata-base"
import { getActivePairing } from "@/lib/supabase/fonts-api"
import {
  buildPairingStylesheetUrl,
  shouldLoadFontStylesheet,
} from "@/lib/theme-font/bootstrap"
import { normalizePairingRecord } from "@/lib/theme-font/runtime-contract"

const V0Setup = dynamic(() => import("@/components/v0-setup"))

const isV0 = process.env["VERCEL_URL"]?.includes("vusercontent.net") ?? false

export const metadata: Metadata = {
  metadataBase: metadataBaseFromEnvironment(),
  title: "Ecommerce",
  description:
    "Ecommerce parametrizable.",
  generator: "v0.app",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Intentar obtener colecciones de Shopify, pero no fallar si no está configurado
  try {
    await getCollections();
  } catch (error) {
    console.warn('[Layout] ⚠️ No se pudieron obtener colecciones de Shopify:', error);
    // Continuar sin colecciones si Shopify no está configurado
  }

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
        className={cn("antialiased min-h-screen", { "is-v0": isV0 })}
        suppressHydrationWarning
      >
        <ApplyStylesScript />
        <V0Provider isV0={isV0}>
          <LanguageProvider>
            <StoreProvider>
              <DynamicLang />
              <DynamicTitle />
              <DynamicFavicon />
              <ReposteriaLayout>
                <StylesProvider>
                  <AuthProvider>
                <AdminPermissionsProvider>
                  <ThemeProvider>
                  <SiteBackground />
                  <FontProvider>
                    <ShopifyCartProvider>
                      <CartProvider>
                        <WishlistProvider>
                          <AdminProvider>
                          <NuqsAdapter>
                            <Suspense fallback={null}>
                              <StylesLoader>
                                <Suspense fallback={null}>
                                  <AdminRedirect />
                                </Suspense>
                                <RouteAwareChrome>{children}</RouteAwareChrome>
                                {isDevelopment && <DebugGrid />}
                                <Toaster closeButton position="top-left" />
                              </StylesLoader>
                            </Suspense>
                            </NuqsAdapter>
                          </AdminProvider>
                        </WishlistProvider>
                      </CartProvider>
                    </ShopifyCartProvider>
                    </FontProvider>
                  </ThemeProvider>
                </AdminPermissionsProvider>
              </AuthProvider>
            </StylesProvider>
              </ReposteriaLayout>
            </StoreProvider>
          </LanguageProvider>
          {isV0 && <V0Setup />}
        </V0Provider>
      </body>
    </html>
  )
}
