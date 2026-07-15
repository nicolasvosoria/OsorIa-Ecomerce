import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

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

function pinToggle(): HTMLElement {
  const toggle = document.querySelector<HTMLElement>("[data-slot='sidebar-pin-toggle']")
  if (!toggle) throw new Error("El botón de colapsar no se renderizó")
  return toggle
}

function activeNavLabel(): string | null {
  return document.querySelector("[aria-current='page']")?.textContent ?? null
}

// jsdom no implementa ResizeObserver, y el tooltip del botón de colapsar monta
// un popper de Radix que lo necesita en cuanto el botón recibe el foco.
beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverStub
})

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

  // Combos se alcanza desde el listado de productos, así que no ocupa una
  // entrada propia: el menú son accesos directos y la jerarquía la cuenta el
  // breadcrumb, que lee la ruta.
  it("keeps products highlighted on combos, its child route with no nav entry", () => {
    mockedPathname = "/admin/products/combos"
    renderSidebar()

    expect(screen.queryByRole("link", { name: "Combos" })).not.toBeInTheDocument()
    expect(activeNavLabel()).toBe("Productos")
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

  it("toggles the pin from the edge button, which is what pushes the content", () => {
    const sidebar = renderSidebar(true)

    fireEvent.click(screen.getByRole("button", { name: "Contraer barra lateral" }))

    expect(sidebar).toHaveAttribute("data-pinned", "false")
    expect(sidebar).toHaveAttribute("data-state", "collapsed")
    expect(screen.getByRole("button", { name: "Expandir barra lateral" })).toBe(pinToggle())
  })

  it("keeps the edge button in the tab order and toggles the pin from the keyboard", async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    const sidebar = renderSidebar(true)

    expect(pinToggle()).not.toHaveAttribute("tabindex")

    await act(async () => pinToggle().focus())
    await user.keyboard("{Enter}")

    expect(sidebar).toHaveAttribute("data-pinned", "false")
  })

  it("ignores a pointer that reaches the sidebar through the edge button", () => {
    const sidebar = renderSidebar(false)

    fireEvent.mouseOver(pinToggle(), { relatedTarget: document.body })
    act(() => vi.advanceTimersByTime(PEEK_DELAY_MS))

    // Sin esta excepción la barra se desplegaría bajo el puntero justo antes del
    // clic, que es lo que el botón viene a evitar.
    expect(sidebar).toHaveAttribute("data-state", "collapsed")
  })

  it("arms the peek again when the pointer moves from the edge button into the bar", () => {
    const sidebar = renderSidebar(false)

    fireEvent.mouseOver(pinToggle(), { relatedTarget: document.body })
    fireEvent.mouseOut(pinToggle(), { relatedTarget: sidebar })
    act(() => vi.advanceTimersByTime(PEEK_DELAY_MS))

    expect(sidebar).toHaveAttribute("data-state", "expanded")
  })

  it("drops the peek when the pointer leaves the sidebar through the edge button", () => {
    const sidebar = renderSidebar(false)

    hover(sidebar)
    act(() => vi.advanceTimersByTime(PEEK_DELAY_MS))
    fireEvent.mouseOut(pinToggle(), { relatedTarget: document.body })
    act(() => vi.advanceTimersByTime(PEEK_DELAY_MS))

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
    fireEvent.click(pinToggle())

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
