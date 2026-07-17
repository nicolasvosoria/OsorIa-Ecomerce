import Link from "next/link"

import { AdminUserMenu } from "@/components/admin/shell/admin-user-menu"
import { Badge } from "@/components/ui/badge"

// Chrome del tier plataforma: sin switcher ni sidebar de tienda — la consola no
// opera una tienda concreta y todo el que la ve ya pasó el gate de super_admin.
// Los enlaces usan la ruta real /admin/stores/*; el proxy la 301 a la ruta limpia
// del host admin, igual que el resto de la navegación de la consola.
export function PlatformTopbar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 shadow-sm sm:px-6">
      <p className="truncate text-sm font-semibold text-foreground">Consola de plataforma</p>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/admin/stores" className="text-muted-foreground hover:text-foreground">
          Tiendas
        </Link>
        <Link href="/admin/stores/users" className="text-muted-foreground hover:text-foreground">
          Usuarios
        </Link>
      </nav>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Badge>Super admin</Badge>
        <AdminUserMenu />
      </div>
    </header>
  )
}
