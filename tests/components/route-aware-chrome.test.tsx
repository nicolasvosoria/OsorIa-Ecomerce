import type { ReactNode } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

let mockedPathname = "/"
const routerPush = vi.hoisted(() => vi.fn())
const logoutMock = vi.hoisted(() => vi.fn())
const authState = vi.hoisted(() => ({
  isAuthenticated: true,
  isLoading: false,
}))

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
  useRouter: () => ({ push: routerPush }),
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    ...authState,
    logout: logoutMock,
  }),
}))

vi.mock("@/components/layout/header", () => ({
  Header: () => <div data-testid="storefront-header">Storefront header</div>,
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

vi.mock("@/components/admin/edit-mode-toggle", () => ({
  EditModeToggle: () => <button data-testid="edit-mode-toggle">Edit mode</button>,
}))

vi.mock("@/components/admin/editor-panel", () => ({
  EditorPanel: () => <aside data-testid="editor-panel">Editor panel</aside>,
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
    "/product/torta-de-chocolate",
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
    authState.isAuthenticated = true
    authState.isLoading = false
    logoutMock.mockResolvedValue(undefined)
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
    expect(markup).not.toContain("Contact")
    expect(markup).not.toContain("Edit mode")
    expect(markup).not.toContain("Editor panel")
    expect(markup).not.toContain("Cerrar sesión")
  })

  it("renders the root editable storefront chrome exactly once on public storefront routes", () => {
    renderChrome("/shop")

    expect(screen.getByTestId("main-content-wrapper")).toBeInTheDocument()
    expect(screen.getByTestId("editable-wrapper-header")).toBeInTheDocument()
    expect(screen.getAllByTestId("storefront-header")).toHaveLength(1)
    expect(screen.getByTestId("floating-contact-button")).toBeInTheDocument()
    expect(screen.getByTestId("edit-mode-toggle")).toBeInTheDocument()
    expect(screen.getByTestId("editor-panel")).toBeInTheDocument()
    expect(screen.getByTestId("route-children")).toBeInTheDocument()
  })

  it.each(["/admin", "/admin/products", "/dashboard", "/dashboard/anything"])(
    "renders route children without root storefront chrome on %s",
    (pathname) => {
      renderChrome(pathname)

      expect(screen.getByTestId("main-content-wrapper")).toBeInTheDocument()
      expect(screen.getByTestId("route-children")).toBeInTheDocument()
      expect(screen.queryByTestId("editable-wrapper-header")).not.toBeInTheDocument()
      expect(screen.queryByTestId("storefront-header")).not.toBeInTheDocument()
      expect(screen.queryByTestId("floating-contact-button")).not.toBeInTheDocument()
      expect(screen.queryByTestId("edit-mode-toggle")).not.toBeInTheDocument()
      expect(screen.queryByTestId("editor-panel")).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: /cerrar sesión/i })).toBeInTheDocument()
    },
  )

  it("logs out from admin chrome routes without restoring the storefront header", async () => {
    renderChrome("/admin/orders")

    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }))

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledTimes(1)
    })
    expect(routerPush).toHaveBeenCalledWith("/")
    expect(screen.queryByTestId("storefront-header")).not.toBeInTheDocument()
  })

  it("does not render admin session actions for anonymous admin visitors", () => {
    authState.isAuthenticated = false

    renderChrome("/admin/orders")

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
    expect(screen.queryByTestId("edit-mode-toggle")).not.toBeInTheDocument()
    expect(screen.queryByTestId("editor-panel")).not.toBeInTheDocument()
  })
})
