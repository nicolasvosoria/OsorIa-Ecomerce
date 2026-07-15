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
import { isRouteOrDescendant } from "@/lib/admin/routes"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

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
      <SidebarRail />
    </Sidebar>
  )
}

function AdminNavList() {
  const pathname = usePathname() ?? ""
  const { isSuperAdmin } = useAdminPermissions()
  const { isMobile, setOpenMobile } = useSidebar()
  const items = isSuperAdmin ? ALL_NAV_ITEMS : BASE_NAV_ITEMS
  const activeHref = activeNavHref(pathname, items)

  const closeDrawerOnMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarMenu>
      {items.map(({ label, href, icon: Icon }) => (
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
// path, so nested routes (e.g. /admin/products/combos) highlight the deepest
// match instead of every ancestor in the nav.
function activeNavHref(pathname: string, items: AdminNavItem[]): string | null {
  return items
    .filter((item) => isRouteOrDescendant(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null
}
