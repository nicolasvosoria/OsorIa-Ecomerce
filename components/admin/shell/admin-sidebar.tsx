"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Bot,
  Layers,
  LayoutDashboard,
  Megaphone,
  Package,
  Palette,
  ShoppingBag,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react"

import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import { cn } from "@/lib/utils"

interface AdminNavItem {
  label: string
  href: string
  icon: LucideIcon
}

const BASE_NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Pedidos", href: "/admin/orders", icon: ShoppingBag },
  { label: "Productos", href: "/admin/products", icon: Package },
  { label: "Combos", href: "/admin/products/combos", icon: Layers },
  { label: "Usuarios", href: "/admin/users", icon: Users },
  { label: "Estadísticas", href: "/admin/stats", icon: BarChart3 },
  { label: "Chatbot", href: "/admin/chatbot", icon: Bot },
  { label: "Popup", href: "/admin/home-discount-popup", icon: Megaphone },
  { label: "Editor de tema", href: "/admin/theme", icon: Palette },
]

const SUPER_ADMIN_NAV_ITEM: AdminNavItem = { label: "Tiendas", href: "/admin/stores", icon: Store }
const ALL_NAV_ITEMS = [...BASE_NAV_ITEMS, SUPER_ADMIN_NAV_ITEM]

// The active item is the one whose href is the longest prefix of the current
// path, so nested routes (e.g. /admin/products/combos) highlight the deepest
// match instead of every ancestor in the nav.
function activeNavHref(pathname: string, items: AdminNavItem[]): string | null {
  return items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null
}

export function adminSectionTitle(pathname: string): string {
  const activeHref = activeNavHref(pathname, ALL_NAV_ITEMS)
  return ALL_NAV_ITEMS.find((item) => item.href === activeHref)?.label ?? "Panel"
}

export function AdminNavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? ""
  const { isSuperAdmin } = useAdminPermissions()
  const items = isSuperAdmin ? ALL_NAV_ITEMS : BASE_NAV_ITEMS
  const activeHref = activeNavHref(pathname, items)

  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={activeHref === href ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            activeHref === href
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  )
}

export function AdminSidebar() {
  return (
    <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-r bg-background md:block">
      <div className="border-b px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Administración</p>
      </div>
      <div className="p-3">
        <AdminNavList />
      </div>
    </aside>
  )
}
