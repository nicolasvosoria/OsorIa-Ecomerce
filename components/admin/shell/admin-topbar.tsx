"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, LogOut, User } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import type { UserProfile } from "@/lib/types/user"
import type { StoreSummary } from "@/lib/supabase/memberships-api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { StoreSwitcher } from "./store-switcher"

function adminUserName(user: UserProfile | null): string {
  if (!user) return "Administrador"
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`
  return user.first_name ?? user.email
}

export function AdminTopbar({
  stores,
  activeStoreId,
}: {
  stores: StoreSummary[]
  activeStoreId: string
}) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { isSuperAdmin } = useAdminPermissions()
  const [signingOut, setSigningOut] = useState(false)

  const handleLogout = async () => {
    setSigningOut(true)
    await logout()
    router.push("/")
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 shadow-sm sm:px-6">
      <SidebarTrigger className="md:hidden" />

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <StoreSwitcher stores={stores} activeStoreId={activeStoreId} isSuperAdmin={isSuperAdmin} />
        <Badge variant={isSuperAdmin ? "default" : "secondary"}>{isSuperAdmin ? "Super admin" : "Admin"}</Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" aria-hidden="true" />
              <span className="hidden max-w-[160px] truncate sm:inline">{adminUserName(user)}</span>
              <ChevronDown className="h-4 w-4 opacity-60" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="editor-chrome w-56">
            <DropdownMenuLabel className="truncate">{adminUserName(user)}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={signingOut} onSelect={handleLogout}>
              <LogOut className="h-4 w-4" />
              {signingOut ? "Cerrando..." : "Cerrar sesión"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
