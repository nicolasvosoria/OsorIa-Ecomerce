"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

export function AdminSessionActions() {
  const router = useRouter()
  const { isAuthenticated, isLoading, logout } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  if (isLoading || !isAuthenticated) return null

  const handleLogout = async () => {
    setIsSigningOut(true)
    await logout()
    router.push("/")
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 border-border bg-background/95 text-foreground shadow-lg backdrop-blur hover:bg-accent"
        disabled={isSigningOut}
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        {isSigningOut ? "Cerrando..." : "Cerrar sesión"}
      </Button>
    </div>
  )
}
