"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Bot,
  LayoutDashboard,
  Megaphone,
  Package,
  Palette,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react"

import { isRouteOrDescendant } from "@/lib/admin/routes"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarPinToggle,
  useSidebar,
} from "@/components/ui/sidebar"

interface AdminNavItem {
  label: string
  href: string
  icon: LucideIcon
}

// Solo secciones de la tienda activa: la consola de plataforma (Plan 12) vive
// en su propio host y no se navega desde este sidebar.
const NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Pedidos", href: "/admin/orders", icon: ShoppingBag },
  { label: "Productos", href: "/admin/products", icon: Package },
  { label: "Usuarios", href: "/admin/users", icon: Users },
  { label: "Estadísticas", href: "/admin/stats", icon: BarChart3 },
  { label: "Chatbot", href: "/admin/chatbot", icon: Bot },
  { label: "Popup", href: "/admin/home-discount-popup", icon: Megaphone },
  { label: "Editor de tema", href: "/admin/theme", icon: Palette },
  { label: "Configuración", href: "/admin/settings", icon: Settings },
]

export function AdminSidebar() {
  return (
    <Sidebar collapsible="icon" className="editor-chrome">
      <SidebarHeader className="h-14 justify-center border-b">
        <p className="truncate px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground group-data-[collapsible=icon]:hidden">
          Administración
        </p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <AdminNavList />
        </SidebarGroup>
      </SidebarContent>
      <SidebarPinToggle />
    </Sidebar>
  )
}

function AdminNavList() {
  const pathname = usePathname() ?? ""
  const { isMobile, setOpenMobile } = useSidebar()
  const activeHref = activeNavHref(pathname, NAV_ITEMS)

  const closeDrawerOnMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarMenu>
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
        <SidebarMenuItem key={href}>
          <SidebarMenuButton asChild isActive={activeHref === href} tooltip={label}>
            <Link
              href={href}
              onClick={closeDrawerOnMobile}
              aria-current={activeHref === href ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

// The active item is the one whose href is the longest prefix of the current
// path: the nav holds shortcuts, not the hierarchy, so a nested route without an
// entry of its own (/admin/products/combos) highlights its section instead of
// every ancestor in the nav.
function activeNavHref(pathname: string, items: AdminNavItem[]): string | null {
  return items
    .filter((item) => isRouteOrDescendant(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null
}
