/** @vitest-environment jsdom */
import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
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
  EditableWrapper: ({ children, componentName }: { children: ReactNode; componentName: string }) => (
    <div data-testid={`editable-wrapper-${componentName}`}>{children}</div>
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

import { RouteAwareChrome } from "@/components/layout/route-aware-chrome"

const NOTICE = <div data-testid="store-notice">Esta tienda no está disponible</div>

// El proxy sirve /store-inactive y /store-not-found por reescritura, así que el
// pathname del navegador sigue siendo el del storefront ("/" o "/shop"): la
// señal solo puede llegar del servidor, que lee el header del proxy (D3).
describe("RouteAwareChrome on a proxy-rewritten neutral page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedPathname = "/"
  })

  it.each(["/", "/shop"])(
    "leaves the notice alone on %s, with no storefront chrome around it",
    (pathname) => {
      mockedPathname = pathname

      render(<RouteAwareChrome isNeutralPage>{NOTICE}</RouteAwareChrome>)

      expect(screen.getByTestId("store-notice")).toBeInTheDocument()
      expect(screen.queryByTestId("storefront-header")).not.toBeInTheDocument()
      expect(screen.queryByTestId("storefront-footer")).not.toBeInTheDocument()
      expect(screen.queryByTestId("editable-wrapper-header")).not.toBeInTheDocument()
      expect(screen.queryByTestId("editable-wrapper-footer")).not.toBeInTheDocument()
      expect(screen.queryByTestId("floating-contact-button")).not.toBeInTheDocument()
    },
  )

  it("still dresses the same pathname in storefront chrome when the marker is absent", () => {
    mockedPathname = "/shop"

    render(<RouteAwareChrome>{NOTICE}</RouteAwareChrome>)

    expect(screen.getByTestId("storefront-header")).toBeInTheDocument()
    expect(screen.getByTestId("storefront-footer")).toBeInTheDocument()
    expect(screen.getByTestId("floating-contact-button")).toBeInTheDocument()
  })

  it("keeps the admin pathnames chromeless whether or not the marker is present", () => {
    mockedPathname = "/admin/products"

    render(<RouteAwareChrome isNeutralPage={false}>{NOTICE}</RouteAwareChrome>)

    expect(screen.queryByTestId("main-content-wrapper")).not.toBeInTheDocument()
    expect(screen.queryByTestId("storefront-header")).not.toBeInTheDocument()
    expect(screen.queryByTestId("floating-contact-button")).not.toBeInTheDocument()
  })
})
