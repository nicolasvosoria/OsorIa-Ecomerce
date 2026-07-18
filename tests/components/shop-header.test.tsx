import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const mockUseComponentStyle = vi.fn()
const mockUseAdmin = vi.fn()

vi.mock("@/contexts/styles-context", () => ({
  useComponentStyle: (...args: unknown[]) => mockUseComponentStyle(...args),
}))

vi.mock("@/contexts/admin-context", () => ({
  useAdmin: () => mockUseAdmin(),
}))

import { ShopHeader, SHOP_COPY_DEFAULTS } from "@/app/shop/components/shop-header"

describe("ShopHeader", () => {
  it("renders nothing beyond the existing chrome when unconfigured (today's /shop unchanged)", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: defaults,
    }))

    const { container } = render(<ShopHeader />)

    expect(SHOP_COPY_DEFAULTS).toEqual({ title: "", subtitle: "" })
    expect(container).toBeEmptyDOMElement()
  })

  it("reads title/subtitle from component_styles \"shop\"", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((name: string, defaults: Record<string, unknown>) => {
      expect(name).toBe("shop")
      return { styles: { ...defaults, title: "Bienvenido", subtitle: "Ofertas de la semana" } }
    })

    render(<ShopHeader />)

    expect(screen.getByRole("heading", { name: "Bienvenido" })).toBeInTheDocument()
    expect(screen.getByText("Ofertas de la semana")).toBeInTheDocument()
  })

  it("overlays a live-preview content edit over the stored copy", () => {
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, title: "Bienvenido" },
    }))
    mockUseAdmin.mockReturnValue({
      componentEdits: new Map([["shop", { title: "Título en vivo" }]]),
    })

    render(<ShopHeader />)

    expect(screen.getByRole("heading", { name: "Título en vivo" })).toBeInTheDocument()
  })

  it("renders only the title when no subtitle is configured", () => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map() })
    mockUseComponentStyle.mockImplementation((_name: string, defaults: Record<string, unknown>) => ({
      styles: { ...defaults, title: "Tienda" },
    }))

    render(<ShopHeader />)

    expect(screen.getByRole("heading", { name: "Tienda" })).toBeInTheDocument()
  })
})
