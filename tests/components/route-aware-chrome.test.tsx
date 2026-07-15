import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

let mockedPathname = "/"

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
}))

vi.mock("@/components/layout/header", () => ({
  Header: () => <div data-testid="storefront-header">Storefront header</div>,
}))

vi.mock("@/components/sections/footer-new", () => ({
  FooterNew: () => <div data-testid="storefront-footer">Storefront footer</div>,
}))

vi.mock("@/components/admin/editable-wrapper", () => ({
  EditableWrapper: ({ children, componentName, label }: {
    children: ReactNode
    componentName: string
    label: string
  }) => (
    <div data-testid={`editable-wrapper-${componentName}`} aria-label={label}>
      {children}
    </div>
  ),
}))

vi.mock("@/components/ui/floating-contact-button", () => ({
  FloatingContactButton: () => <div data-testid="floating-contact-button">Contact</div>,
}))

vi.mock("@/components/admin/main-content-wrapper", () => ({
  MainContentWrapper: ({ children }: { children: ReactNode }) => (
    <section data-testid="main-content-wrapper">{children}</section>
  ),
}))

import { Header } from "@/components/layout/header"
import { EditableWrapper } from "@/components/admin/editable-wrapper"
import { isAdminChromeRoute, RouteAwareChrome } from "@/components/layout/route-aware-chrome"

function renderChrome(pathname: string, children: ReactNode = <div data-testid="route-children">Route children</div>) {
  mockedPathname = pathname
  return render(<RouteAwareChrome>{children}</RouteAwareChrome>)
}

describe("isAdminChromeRoute", () => {
  it.each([
    "/admin",
    "/admin/products",
    "/admin/orders",
    "/admin/users",
    "/admin/stats",
    "/admin/chatbot",
    "/admin/home-discount-popup",
    "/dashboard",
    "/dashboard/anything",
  ])("classifies %s as an admin chrome route", (pathname) => {
    expect(isAdminChromeRoute(pathname)).toBe(true)
  })

  it.each([
    "/",
    "/shop",
    "/catalog",
    "/products/alfajor-artesanal",
    "/products/torta-de-chocolate",
    "/admin-preview",
    "/dashboarding",
    null,
  ])("keeps %s as a public storefront chrome route", (pathname) => {
    expect(isAdminChromeRoute(pathname)).toBe(false)
  })
})

describe("RouteAwareChrome", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedPathname = "/"
  })

  it("renders a stable server shell before the client pathname is resolved", () => {
    mockedPathname = "/admin"

    const markup = renderToString(
      <RouteAwareChrome>
        <div data-testid="route-children">Route children</div>
      </RouteAwareChrome>,
    )

    expect(markup).toContain("Route children")
    expect(markup).not.toContain("Storefront header")
    expect(markup).not.toContain("Storefront footer")
    expect(markup).not.toContain("Contact")
    expect(markup).not.toContain("Cerrar sesión")
  })

  it("renders the root editable storefront chrome exactly once on public storefront routes", () => {
    renderChrome("/shop")

    expect(screen.getByTestId("main-content-wrapper")).toBeInTheDocument()
    expect(screen.getByTestId("editable-wrapper-header")).toBeInTheDocument()
    expect(screen.getAllByTestId("storefront-header")).toHaveLength(1)
    expect(screen.getByTestId("editable-wrapper-footer")).toBeInTheDocument()
    expect(screen.getAllByTestId("storefront-footer")).toHaveLength(1)
    expect(screen.getByTestId("floating-contact-button")).toBeInTheDocument()
    expect(screen.getByTestId("route-children")).toBeInTheDocument()
  })

  it.each(["/admin", "/admin/products", "/dashboard", "/dashboard/anything"])(
    "renders route children without root storefront chrome on %s",
    (pathname) => {
      renderChrome(pathname)

      // El wrapper impone `min-height: 100vh`, que sumado al alto del shell del
      // admin haría scrollear el documento además del panel.
      expect(screen.queryByTestId("main-content-wrapper")).not.toBeInTheDocument()
      expect(screen.getByTestId("route-children")).toBeInTheDocument()
      expect(screen.queryByTestId("editable-wrapper-header")).not.toBeInTheDocument()
      expect(screen.queryByTestId("storefront-header")).not.toBeInTheDocument()
      expect(screen.queryByTestId("editable-wrapper-footer")).not.toBeInTheDocument()
      expect(screen.queryByTestId("storefront-footer")).not.toBeInTheDocument()
      expect(screen.queryByTestId("floating-contact-button")).not.toBeInTheDocument()
    },
  )

  it("never renders a floating session button, leaving logout to the admin shell", () => {
    renderChrome("/dashboard")
    expect(screen.queryByRole("button", { name: /cerrar sesión/i })).not.toBeInTheDocument()
  })

  it("hides only the root chrome on /admin while preserving an embedded preview header from the route children", () => {
    renderChrome(
      "/admin",
      <div data-testid="admin-preview-canvas">
        <EditableWrapper componentName="header" label="Header">
          <Header />
        </EditableWrapper>
      </div>,
    )

    expect(screen.getByTestId("admin-preview-canvas")).toBeInTheDocument()
    expect(screen.getAllByTestId("storefront-header")).toHaveLength(1)
    expect(screen.getAllByTestId("editable-wrapper-header")).toHaveLength(1)
    expect(screen.queryByTestId("floating-contact-button")).not.toBeInTheDocument()
  })
})
