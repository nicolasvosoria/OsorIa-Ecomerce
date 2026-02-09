"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminProvider } from "@/contexts/admin-context"
import { AdminPermissionsProvider, useAdminPermissions } from "@/contexts/admin-permissions-context"
import { EditorPanel } from "@/components/admin/editor-panel"
import { EditableWrapper } from "@/components/admin/editable-wrapper"
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper"
import { Header } from "@/components/layout/header"
import { HeroBanner } from "@/components/sections/hero-banner"
import { PopularItems } from "@/components/sections/popular-items"
import { ProductsGrid } from "@/components/sections/products-grid"
import { FeaturedProduct } from "@/components/sections/featured-product"
import { WhyUs } from "@/components/sections/why-us"
import { FooterNew } from "@/components/sections/footer-new"
import { Button } from "@/components/ui/button"
import { Eye, ArrowLeft, Loader2, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function AdminPageContent() {
  const { isAdmin, loading, hasChecked } = useAdminPermissions()
  const router = useRouter()

  useEffect(() => {
    // Solo redirigir si la verificación se completó (hasChecked) y no es admin
    // Esto asegura que esperamos a que isAdmin se actualice antes de redirigir
    if (hasChecked && !loading && !isAdmin) {
      console.log("[Admin] Usuario no es admin después de verificación, redirigiendo...")
      router.push("/")
    }
  }, [isAdmin, loading, hasChecked, router])

  // Mostrar loading mientras se verifican permisos
  if (loading || !hasChecked) {
    return (
      <div 
        className="flex flex-col items-center justify-center h-screen gap-4"
        style={{ backgroundColor: "var(--background)" }}
      >
        <Loader2 
          className="h-8 w-8 animate-spin" 
          style={{ color: "var(--foreground)" }}
        />
        <p className="text-sm text-muted-foreground">
          Verificando permisos de administrador...
        </p>
      </div>
    )
  }

  // Solo mostrar acceso denegado si ya se verificaron los permisos y no es admin
  if (!isAdmin && hasChecked) {
    return (
      <div 
        className="flex items-center justify-center h-screen p-4"
        style={{ backgroundColor: "var(--background)" }}
      >
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle>Acceso Denegado</CardTitle>
            </div>
            <CardDescription>
              No tienes permisos para acceder a esta página.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Volver al Inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <AdminProvider>
      <AdminPageWrapper>
        <div className="flex h-screen overflow-hidden min-w-0">
        {/* Preview Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Admin Header */}
          <div className="bg-blue-600 text-white p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 shadow-lg shrink-0">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button variant="ghost" size="sm" className="shrink-0 text-white hover:bg-blue-700 h-8 sm:h-9" asChild>
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Salir</span>
                </Link>
              </Button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold truncate">Modo de Edición</h1>
                <p className="text-xs text-blue-100 truncate hidden sm:block">Haz clic en cualquier sección para editarla</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="shrink-0 h-8 sm:h-9 gap-1.5 sm:gap-2" asChild>
              <Link href="/" target="_blank">
                <Eye className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Vista Previa</span>
              </Link>
            </Button>
          </div>

          {/* Page Preview */}
          <div className="flex-1 overflow-y-auto bg-muted/30">
            <EditableWrapper componentName="header" label="Header">
              <Header />
            </EditableWrapper>

            <main className="flex flex-col">
              <EditableWrapper componentName="hero" label="Hero Banner">
                <HeroBanner />
              </EditableWrapper>
              <EditableWrapper componentName="popular" label="Popular Items">
                <PopularItems />
              </EditableWrapper>
              <EditableWrapper componentName="products" label="Products Grid">
                <ProductsGrid />
              </EditableWrapper>
              <EditableWrapper componentName="featured" label="Featured Product">
                <FeaturedProduct />
              </EditableWrapper>
              <EditableWrapper componentName="whyus" label="Why Us">
                <WhyUs />
              </EditableWrapper>
              <EditableWrapper componentName="footer" label="Footer">
                <FooterNew />
              </EditableWrapper>
            </main>
          </div>
        </div>

        {/* Editor Panel */}
        <EditorPanel />
      </div>
      </AdminPageWrapper>
    </AdminProvider>
  )
}

export default function AdminPage() {
  return (
    <AdminPermissionsProvider>
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }>
        <AdminPageContent />
      </Suspense>
    </AdminPermissionsProvider>
  )
}
