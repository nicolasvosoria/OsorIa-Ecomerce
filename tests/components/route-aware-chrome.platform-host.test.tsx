/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "http://admin.localhost:3000/" }
 */
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

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

vi.mock("@/components/ui/floating-contact-button", () => ({
  FloatingContactButton: () => <div data-testid="floating-contact-button">Contact</div>,
}))

import { RouteAwareChrome } from "@/components/layout/route-aware-chrome"

// En el host admin (Plan 12) el proxy sirve la consola bajo rutas limpias, así
// que el pathname parece de storefront ("/", "/create") — pero el storefront no
// existe en ese host: su chrome no debe montarse alrededor de la consola.
describe("RouteAwareChrome on the platform admin host", () => {
  it.each(["/", "/create", "/auth/login"])(
    "keeps the storefront chrome out of %s despite its storefront-looking pathname",
    (pathname) => {
      mockedPathname = pathname

      render(
        <RouteAwareChrome>
          <div data-testid="route-children">Consola</div>
        </RouteAwareChrome>,
      )

      expect(screen.getByTestId("route-children")).toBeInTheDocument()
      expect(screen.queryByTestId("storefront-header")).not.toBeInTheDocument()
      expect(screen.queryByTestId("storefront-footer")).not.toBeInTheDocument()
      expect(screen.queryByTestId("floating-contact-button")).not.toBeInTheDocument()
    },
  )
})
