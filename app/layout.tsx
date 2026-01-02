import type React from "react"
import { Suspense } from "react"
import type { Metadata } from "next"
// Importación alternativa de fuentes para evitar problemas con Turbopack
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { CartProvider as ShopifyCartProvider } from "@/components/cart/cart-context"
import { CartProvider } from "@/contexts/cart-context"
import { DebugGrid } from "@/components/debug-grid"
import { isDevelopment } from "@/lib/constants"
import { getCollections } from "@/lib/shopify"
import { Header } from "../components/layout/header"
import dynamic from "next/dynamic"
import { V0Provider } from "../lib/context"
import { cn } from "../lib/utils"
import { StylesProvider } from "@/contexts/styles-context"
import { ThemeProvider } from "@/contexts/theme-context"
import { FontProvider } from "@/contexts/font-context"
import { AuthProvider } from "@/contexts/auth-context"
import { AdminPermissionsProvider } from "@/contexts/admin-permissions-context"
import { AdminProvider } from "@/contexts/admin-context"
import { EditorPanel } from "@/components/admin/editor-panel"
import { EditModeToggle } from "@/components/admin/edit-mode-toggle"
import { MainContentWrapper } from "@/components/admin/main-content-wrapper"
import { EditableWrapper } from "@/components/admin/editable-wrapper"
import { viewport } from "./viewport"
import { FloatingContactButton } from "@/components/ui/floating-contact-button"
import { ApplyStylesScript } from "@/components/apply-styles-script"
import { StylesLoader } from "@/components/styles-loader"
import { SiteBackground } from "@/components/site-background"
import { StoreProvider } from "@/contexts/store-context"
import { ReposteriaLayout } from "./reposteria-layout"
import { AdminRedirect } from "@/components/admin/admin-redirect"
import { DynamicTitle } from "@/components/dynamic-title"
import { DynamicFavicon } from "@/components/dynamic-favicon"

const V0Setup = dynamic(() => import("@/components/v0-setup"))

const isV0 = process.env["VERCEL_URL"]?.includes("vusercontent.net") ?? false

// Configuración de fuentes con ajustes para evitar problemas con Turbopack
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["monospace"],
})

export const metadata: Metadata = {
  title: "Ecommerce",
  description:
    "Ecommerce parametrizable.",
  generator: "v0.app",
}

export { viewport }

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Intentar obtener colecciones de Shopify, pero no fallar si no está configurado
  let collections = [];
  try {
    collections = await getCollections();
  } catch (error) {
    console.warn('[Layout] ⚠️ No se pudieron obtener colecciones de Shopify:', error);
    // Continuar sin colecciones si Shopify no está configurado
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(geistSans.variable, geistMono.variable, "antialiased min-h-screen", { "is-v0": isV0 })}
        suppressHydrationWarning
      >
        <ApplyStylesScript />
        <V0Provider isV0={isV0}>
          <StoreProvider>
            <DynamicTitle />
            <DynamicFavicon />
            <ReposteriaLayout>
              <StylesProvider>
                <SiteBackground />
                <AuthProvider>
              <AdminPermissionsProvider>
                <ThemeProvider>
                <FontProvider>
                  <ShopifyCartProvider>
                    <CartProvider>
                      <AdminProvider>
                        <NuqsAdapter>
                          <Suspense fallback={null}>
                            <StylesLoader>
                              <Suspense fallback={null}>
                                <AdminRedirect />
                              </Suspense>
                              <MainContentWrapper>
                            <main data-vaul-drawer-wrapper="true">
                              <EditableWrapper componentName="header" label="Header">
                                <Header />
                              </EditableWrapper>
                              {children}
                            </main>
                              </MainContentWrapper>
                              {isDevelopment && <DebugGrid />}
                              <Toaster closeButton position="top-left" />
                              <FloatingContactButton />
                              <EditModeToggle />
                              <EditorPanel />
                            </StylesLoader>
                          </Suspense>
                          </NuqsAdapter>
                        </AdminProvider>
                      </CartProvider>
                    </ShopifyCartProvider>
                  </FontProvider>
                </ThemeProvider>
              </AdminPermissionsProvider>
            </AuthProvider>
          </StylesProvider>
            </ReposteriaLayout>
          </StoreProvider>
          {isV0 && <V0Setup />}
        </V0Provider>
      </body>
    </html>
  )
}
