import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { CartProvider } from "@/components/cart/cart-context"
import { DebugGrid } from "@/components/debug-grid"
import { isDevelopment } from "@/lib/constants"
import { getCollections } from "@/lib/shopify"
import { Header } from "../components/layout/header"
import dynamic from "next/dynamic"
import { V0Provider } from "../lib/context"
import { cn } from "../lib/utils"
import { StylesProvider } from "@/contexts/styles-context"

const V0Setup = dynamic(() => import("@/components/v0-setup"))

const isV0 = process.env["VERCEL_URL"]?.includes("vusercontent.net") ?? false

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Ecommerce",
  description:
    "Ecommerce parametrizable.",
  generator: "v0.app",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const collections = await getCollections()

  return (
    <html lang="en">
      <body
        className={cn(geistSans.variable, geistMono.variable, "antialiased min-h-screen", { "is-v0": isV0 })}
        suppressHydrationWarning
      >
        <V0Provider isV0={isV0}>
          <StylesProvider>
            <CartProvider>
              <NuqsAdapter>
                <main data-vaul-drawer-wrapper="true">
                  <Header collections={collections} />
                  {children}
                </main>
                {isDevelopment && <DebugGrid />}
                <Toaster closeButton position="bottom-right" />
              </NuqsAdapter>
            </CartProvider>
          </StylesProvider>
          {isV0 && <V0Setup />}
        </V0Provider>
      </body>
    </html>
  )
}
