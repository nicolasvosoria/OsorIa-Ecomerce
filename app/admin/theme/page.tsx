"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminPermissionsProvider, useAdminPermissions } from "@/contexts/admin-permissions-context"
import { useStore } from "@/contexts/store-context"
import { ThemeCustomEditor } from "@/components/theme/theme-custom-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ShieldAlert } from "lucide-react"
import Link from "next/link"

function AdminThemePageContent() {
  const { isAdmin, loading, hasChecked } = useAdminPermissions()
  const { store } = useStore()
  const router = useRouter()

  // Mismo gate de subdominio que ThemeSelectorModal (D4): en esta tienda los
  // temas solo se administran desde el panel de administración central.
  const isReposteria = store?.subdomain === "reposteria"
  const hasAccess = isAdmin && !isReposteria

  useEffect(() => {
    if (hasChecked && !loading && !hasAccess) {
      router.push("/")
    }
  }, [hasAccess, loading, hasChecked, router])

  if (loading || !hasChecked) {
    return (
      <div className="editor-chrome flex flex-col items-center justify-center h-screen gap-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        <p className="text-sm text-muted-foreground">
          Verificando permisos de administrador...
        </p>
      </div>
    )
  }

  if (!hasAccess && hasChecked) {
    return (
      <div className="editor-chrome flex items-center justify-center h-screen p-4 bg-background">
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

  return <ThemeCustomEditor />
}

export default function AdminThemePage() {
  return (
    <AdminPermissionsProvider>
      <Suspense fallback={
        <div className="editor-chrome flex items-center justify-center h-screen bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        </div>
      }>
        <AdminThemePageContent />
      </Suspense>
    </AdminPermissionsProvider>
  )
}
