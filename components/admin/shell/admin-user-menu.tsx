"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, LogOut, User } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import type { UserProfile } from "@/lib/types/user"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function adminUserName(user: UserProfile | null): string {
  if (!user) return "Administrador"
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`
  return user.first_name ?? user.email
}

export function AdminUserMenu() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleLogout = async () => {
    setSigningOut(true)
    await logout()
    router.push("/")
  }

  return (
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
  )
}
