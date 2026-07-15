import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

let mockedPathname = "/admin"

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
}))

import { AdminPageBreadcrumb } from "@/components/admin/page-breadcrumb"
import { AdminPageHeader } from "@/components/admin/page-header"
import { adminBreadcrumbTrail, isRouteOrDescendant } from "@/lib/admin/routes"

const ORDER_ID = "0c9f9a1e-1c4c-4f0a-9d1f-6a1b2c3d4e5f"
const PRODUCT_ID = "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e"
const COMBO_ID = "11111111-1111-4111-8111-111111111111"
const CATEGORY_ID = "22222222-2222-4222-8222-222222222222"

function labelsOf(pathname: string, entityLabel?: string): string[] {
  return adminBreadcrumbTrail(pathname, entityLabel).map((step) => step.label)
}

describe("adminBreadcrumbTrail", () => {
  it("shows only the admin root on the dashboard", () => {
    expect(labelsOf("/admin")).toEqual(["Admin"])
  })

  it("nests a top-level section under the admin root", () => {
    expect(labelsOf("/admin/products")).toEqual(["Admin", "Productos"])
  })

  it("nests the super_admin stores console under the admin root", () => {
    expect(labelsOf("/admin/stores")).toEqual(["Admin", "Tiendas"])
  })

  it("nests a static child under its section", () => {
    expect(labelsOf("/admin/products/create")).toEqual(["Admin", "Productos", "Crear"])
  })

  it("derives the trail from the url, so combos reads as a child of products", () => {
    expect(labelsOf("/admin/products/combos")).toEqual(["Admin", "Productos", "Combos"])
  })

  it("skips the dynamic segment of a route that has no page of its own", () => {
    expect(labelsOf(`/admin/products/${PRODUCT_ID}/edit`)).toEqual(["Admin", "Productos", "Editar"])
  })

  it("nests the combo create screen under combos", () => {
    expect(labelsOf("/admin/products/combos/create")).toEqual([
      "Admin",
      "Productos",
      "Combos",
      "Crear",
    ])
  })

  it("nests the combo edit screen under combos, skipping the combo id", () => {
    expect(labelsOf(`/admin/products/combos/${COMBO_ID}/edit`)).toEqual([
      "Admin",
      "Productos",
      "Combos",
      "Editar",
    ])
  })

  it("derives the trail from the url, so categories reads as a child of products", () => {
    expect(labelsOf("/admin/products/categories")).toEqual(["Admin", "Productos", "Categorías"])
  })

  it("nests the category create screen under categories", () => {
    expect(labelsOf("/admin/products/categories/create")).toEqual([
      "Admin",
      "Productos",
      "Categorías",
      "Crear",
    ])
  })

  it("nests the category edit screen under categories, skipping the category id", () => {
    expect(labelsOf(`/admin/products/categories/${CATEGORY_ID}/edit`)).toEqual([
      "Admin",
      "Productos",
      "Categorías",
      "Editar",
    ])
  })

  it("uses the entity override as the leaf label of a dynamic route", () => {
    expect(labelsOf(`/admin/orders/${ORDER_ID}`, "Pedido #1042")).toEqual([
      "Admin",
      "Pedidos",
      "Pedido #1042",
    ])
  })

  it("falls back to the route label when a dynamic route gets no entity override", () => {
    expect(labelsOf(`/admin/orders/${ORDER_ID}`)).toEqual(["Admin", "Pedidos", "Pedido"])
  })

  it("ignores an entity override on a route without a dynamic segment", () => {
    expect(labelsOf("/admin/products/create", "Pedido #1042")).toEqual([
      "Admin",
      "Productos",
      "Crear",
    ])
  })

  it("links every step to its own url and leaves the leaf as the current page", () => {
    expect(adminBreadcrumbTrail("/admin/products/combos")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Productos", href: "/admin/products" },
      { label: "Combos", href: "/admin/products/combos" },
    ])
  })

  it("drops unregistered routes instead of guessing a label from the url", () => {
    expect(labelsOf("/admin/unknown-section")).toEqual(["Admin"])
    expect(labelsOf("/shop")).toEqual([])
  })
})

describe("isRouteOrDescendant", () => {
  it.each([
    ["/admin/theme", "/admin/theme"],
    ["/admin/theme/colors", "/admin/theme"],
  ])("matches %s against %s", (pathname, base) => {
    expect(isRouteOrDescendant(pathname, base)).toBe(true)
  })

  it.each([
    ["/admin/themes", "/admin/theme"],
    ["/admin", "/admin/theme"],
  ])("rejects %s against %s", (pathname, base) => {
    expect(isRouteOrDescendant(pathname, base)).toBe(false)
  })
})

describe("AdminPageBreadcrumb", () => {
  beforeEach(() => {
    mockedPathname = "/admin"
  })

  it("links the ancestors and marks the leaf as the current page", () => {
    mockedPathname = "/admin/products/create"

    render(<AdminPageBreadcrumb />)

    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin")
    expect(screen.getByRole("link", { name: "Productos" })).toHaveAttribute("href", "/admin/products")
    expect(screen.getByText("Crear")).toHaveAttribute("aria-current", "page")
  })

  it("renders nothing outside the admin route registry", () => {
    mockedPathname = "/shop"

    const { container } = render(<AdminPageBreadcrumb />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe("AdminPageHeader", () => {
  beforeEach(() => {
    mockedPathname = "/admin/products"
  })

  it("renders the breadcrumb of the current route above the title", () => {
    render(<AdminPageHeader title="Gestión de Productos" subtitle="Administra tu catálogo" />)

    expect(screen.getByRole("navigation", { name: "breadcrumb" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Gestión de Productos" })).toBeInTheDocument()
    expect(screen.getByText("Administra tu catálogo")).toBeInTheDocument()
  })

  it("passes the entity label down to the breadcrumb leaf", () => {
    mockedPathname = `/admin/orders/${ORDER_ID}`

    render(
      <AdminPageHeader title="Pedido #1042" subtitle="12 de julio" entityLabel="Pedido #1042" />,
    )

    expect(screen.getByRole("link", { name: "Pedidos" })).toHaveAttribute("href", "/admin/orders")
    expect(screen.getByText("Pedido #1042", { selector: "[aria-current='page']" })).toBeInTheDocument()
  })

  it("renders every action in a single row and no back arrow", () => {
    render(
      <AdminPageHeader
        title="Gestión de Productos"
        subtitle="Administra tu catálogo"
        actions={
          <>
            <button type="button">Combos</button>
            <button type="button">Nuevo Producto</button>
          </>
        }
      />,
    )

    expect(screen.getByRole("button", { name: "Combos" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Nuevo Producto" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Volver" })).not.toBeInTheDocument()
  })
})
