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
import { translations } from "@/lib/i18n/translations"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarPinToggle,
  useSidebar,
} from "@/components/ui/sidebar"

const copy = translations.es.admin

interface AdminNavChild {
  label: string
  href: string
}

interface AdminNavItem {
  label: string
  href: string
  icon: LucideIcon
  children?: AdminNavChild[]
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
  {
    label: "Configuración",
    href: "/admin/settings",
    icon: Settings,
    children: [
      { label: copy.settingsNav.general, href: "/admin/settings" },
      { label: copy.settingsNav.shipping, href: "/admin/settings/shipping" },
    ],
  },
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
  const activeHref = longestMatchingHref(pathname, NAV_ITEMS)

  const closeDrawerOnMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarMenu>
      {NAV_ITEMS.map((item) =>
        hasChildren(item) ? (
          <AdminNavGroupItem
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={closeDrawerOnMobile}
          />
        ) : (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={activeHref === item.href} tooltip={item.label}>
              <Link
                href={item.href}
                onClick={closeDrawerOnMobile}
                aria-current={activeHref === item.href ? "page" : undefined}
              >
                <item.icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ),
      )}
    </SidebarMenu>
  )
}

function hasChildren(item: AdminNavItem): item is AdminNavItem & { children: AdminNavChild[] } {
  return item.children !== undefined
}

function AdminNavGroupItem({
  item,
  pathname,
  onNavigate,
}: {
  item: AdminNavItem & { children: AdminNavChild[] }
  pathname: string
  onNavigate: () => void
}) {
  const activeChildHref = longestMatchingHref(pathname, item.children)
  const open = activeChildHref !== null

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={open}
        tooltip={item.label}
        aria-expanded={open}
      >
        <Link href={item.href} onClick={onNavigate}>
          <item.icon aria-hidden="true" />
          <span className="truncate">{item.label}</span>
        </Link>
      </SidebarMenuButton>
      {open ? (
        <SidebarMenuSub>
          {item.children.map((child) => (
            <SidebarMenuSubItem key={child.href}>
              <SidebarMenuSubButton asChild isActive={child.href === activeChildHref}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  aria-current={child.href === activeChildHref ? "page" : undefined}
                >
                  <span>{child.label}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  )
}

// The active item is the one whose href is the longest prefix of the current
// path: the nav holds shortcuts, not the hierarchy, so a nested route without an
// entry of its own (/admin/products/combos) highlights its section instead of
// every ancestor in the nav.
function longestMatchingHref(pathname: string, items: { href: string }[]): string | null {
  return items
    .filter((item) => isRouteOrDescendant(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null
}
