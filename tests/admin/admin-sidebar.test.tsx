import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let mockedPathname = "/admin"
let mockedIsSuperAdmin = false

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
}))

vi.mock("@/contexts/admin-permissions-context", () => ({
  useAdminPermissions: () => ({ isSuperAdmin: mockedIsSuperAdmin }),
}))

import { AdminSidebar } from "@/components/admin/shell/admin-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { isSidebarPinned, sidebarPinCookie } from "@/lib/admin/sidebar-pin-cookie"

const PEEK_DELAY_MS = 200
const ORDER_ID = "0c9f9a1e-1c4c-4f0a-9d1f-6a1b2c3d4e5f"

function renderSidebar(defaultPinned = true) {
  const { container } = render(
    <SidebarProvider defaultPinned={defaultPinned}>
      <AdminSidebar />
    </SidebarProvider>,
  )

  const sidebar = container.querySelector("[data-slot='sidebar']")
  if (!sidebar) throw new Error("El sidebar de escritorio no se renderizó")
  return sidebar
}

function hover(sidebar: Element) {
  fireEvent.mouseOver(sidebar)
}

function unhover(sidebar: Element) {
  fireEvent.mouseOut(sidebar, { relatedTarget: document.body })
}

function activeNavLabel(): string | null {
  return document.querySelector("[aria-current='page']")?.textContent ?? null
}

beforeEach(() => {
  mockedPathname = "/admin"
  mockedIsSuperAdmin = false
})

describe("AdminSidebar highlight", () => {
  it("marks the dashboard as current on the admin root", () => {
    mockedPathname = "/admin"
    renderSidebar()

    expect(activeNavLabel()).toBe("Dashboard")
  })

  it("highlights the deepest match, so combos wins over products", () => {
    mockedPathname = "/admin/products/combos"
    renderSidebar()

    expect(activeNavLabel()).toBe("Combos")
  })

  it("keeps the section highlighted on a descendant route with no nav entry", () => {
    mockedPathname = `/admin/orders/${ORDER_ID}`
    renderSidebar()

    expect(activeNavLabel()).toBe("Pedidos")
  })

  it("does not highlight a sibling section that merely shares a prefix", () => {
    mockedPathname = "/admin/products"
    renderSidebar()

    expect(activeNavLabel()).toBe("Productos")
  })

  it("falls back to the dashboard on an admin route with no nav entry of its own", () => {
    mockedPathname = "/admin/unknown-section"
    renderSidebar()

    expect(activeNavLabel()).toBe("Dashboard")
  })

  it("highlights nothing outside the admin", () => {
    mockedPathname = "/shop"
    renderSidebar()

    expect(activeNavLabel()).toBe(null)
  })

  it("hides the stores entry from a plain admin and shows it to a super admin", () => {
    const { unmount } = render(
      <SidebarProvider>
        <AdminSidebar />
      </SidebarProvider>,
    )
    expect(screen.queryByRole("link", { name: "Tiendas" })).not.toBeInTheDocument()
    unmount()

    mockedIsSuperAdmin = true
    render(
      <SidebarProvider>
        <AdminSidebar />
      </SidebarProvider>,
    )
    expect(screen.getByRole("link", { name: "Tiendas" })).toBeInTheDocument()
  })
})

describe("AdminSidebar pinned vs peeking", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts expanded and pinned when the persisted pin says so", () => {
    const sidebar = renderSidebar(true)

    expect(sidebar).toHaveAttribute("data-pinned", "true")
    expect(sidebar).toHaveAttribute("data-state", "expanded")
  })

  it("starts collapsed to icons when the persisted pin is off", () => {
    const sidebar = renderSidebar(false)

    expect(sidebar).toHaveAttribute("data-pinned", "false")
    expect(sidebar).toHaveAttribute("data-state", "collapsed")
    expect(sidebar).toHaveAttribute("data-collapsible", "icon")
  })

  it("ignores a pointer that only crosses over on its way to the content", () => {
    const sidebar = renderSidebar(false)

    hover(sidebar)
    act(() => vi.advanceTimersByTime(PEEK_DELAY_MS - 1))

    expect(sidebar).toHaveAttribute("data-state", "collapsed")
  })

  it("expands on hover once the pointer lingers, without pinning or pushing", () => {
    const sidebar = renderSidebar(false)

    hover(sidebar)
    act(() => vi.advanceTimersByTime(PEEK_DELAY_MS))

    expect(sidebar).toHaveAttribute("data-state", "expanded")
    // El hueco que empuja al contenido mira a data-pinned, no a data-state: el
    // peek se despliega por encima.
    expect(sidebar).toHaveAttribute("data-pinned", "false")
  })

  it("collapses again when the pointer leaves", () => {
    const sidebar = renderSidebar(false)

    hover(sidebar)
    act(() => vi.advanceTimersByTime(PEEK_DELAY_MS))
    unhover(sidebar)

    expect(sidebar).toHaveAttribute("data-state", "collapsed")
  })

  it("drops a scheduled peek when the pointer leaves before the delay", () => {
    const sidebar = renderSidebar(false)

    hover(sidebar)
    act(() => vi.advanceTimersByTime(PEEK_DELAY_MS - 1))
    unhover(sidebar)
    act(() => vi.advanceTimersByTime(PEEK_DELAY_MS))

    expect(sidebar).toHaveAttribute("data-state", "collapsed")
  })

  it("toggles the pin from the rail, which is what pushes the content", () => {
    const sidebar = renderSidebar(true)

    fireEvent.click(screen.getByRole("button", { name: "Alternar barra lateral" }))

    expect(sidebar).toHaveAttribute("data-pinned", "false")
    expect(sidebar).toHaveAttribute("data-state", "collapsed")
  })

  it("unpins with Cmd+B even while the pointer sits on a peeking sidebar", () => {
    const sidebar = renderSidebar(true)

    hover(sidebar)
    act(() => vi.advanceTimersByTime(PEEK_DELAY_MS))
    act(() => {
      fireEvent.keyDown(window, { key: "b", metaKey: true })
    })

    // El pin cede — y con él el empuje — aunque el hover mantenga la barra
    // desplegada hasta que el puntero salga.
    expect(sidebar).toHaveAttribute("data-pinned", "false")
    expect(sidebar).toHaveAttribute("data-state", "expanded")

    unhover(sidebar)
    expect(sidebar).toHaveAttribute("data-state", "collapsed")
  })

  it("never writes the cookie from the primitive, so the pin stays the only writer", () => {
    const sidebar = renderSidebar(false)

    hover(sidebar)
    act(() => vi.advanceTimersByTime(PEEK_DELAY_MS))
    fireEvent.click(screen.getByRole("button", { name: "Alternar barra lateral" }))

    expect(document.cookie).toBe("")
  })
})

describe("sidebar pin cookie", () => {
  it("starts pinned when nothing was persisted yet", () => {
    expect(isSidebarPinned(undefined)).toBe(true)
  })

  it("round-trips both pin states", () => {
    expect(isSidebarPinned("true")).toBe(true)
    expect(isSidebarPinned("false")).toBe(false)
  })

  it("persists the pin for a week under the shared cookie name", () => {
    expect(sidebarPinCookie(false)).toBe("sidebar_state=false; path=/; max-age=604800")
    expect(sidebarPinCookie(true)).toBe("sidebar_state=true; path=/; max-age=604800")
  })
})
