"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminProvider } from "@/contexts/admin-context"
import { AdminPermissionsProvider, useAdminPermissions } from "@/contexts/admin-permissions-context"
import { EditorPanel } from "@/components/admin/editor-panel"
import { EditableWrapper } from "@/components/admin/editable-wrapper"
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
  const { isAdmin, loading } = useAdminPermissions()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin) {
      // Redirigir a la página principal si no es administrador o cuando cierra sesión
      router.push("/")
    }
  }, [isAdmin, loading, router])

  // Mostrar loading mientras se verifica
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Mostrar mensaje de acceso denegado si no es administrador
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
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
      <div className="flex h-screen overflow-hidden">
        {/* Preview Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Admin Header */}
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-blue-700">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Salir
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-bold">Modo de Edición</h1>
                <p className="text-xs text-blue-100">Haz clic en cualquier sección para editarla</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/" target="_blank">
                <Eye className="h-4 w-4 mr-2" />
                Vista Previa
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
