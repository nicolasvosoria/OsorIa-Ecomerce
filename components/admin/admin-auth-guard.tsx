"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import { ADMIN_ACCESS_DENIED_PATH } from "@/lib/auth-return-intent"

export function AdminAuthGuard({ children }: { children: ReactNode }) {
  const { isAdmin, loading, hasChecked } = useAdminPermissions()
  const router = useRouter()

  useEffect(() => {
    if (hasChecked && !loading && !isAdmin) {
      router.push(ADMIN_ACCESS_DENIED_PATH)
    }
  }, [isAdmin, loading, hasChecked, router])

  if (loading || !hasChecked || !isAdmin) {
    return (
      <div className="editor-chrome flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        <p className="text-sm text-muted-foreground">Verificando permisos de administrador...</p>
      </div>
    )
  }

  return <>{children}</>
}
