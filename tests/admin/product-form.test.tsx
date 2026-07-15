import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/components/admin/image-upload", () => ({
  ImageUpload: () => <div data-testid="image-upload" />,
}))

// jsdom doesn't implement ResizeObserver; the Radix checkboxes measure
// themselves as soon as they mount.
beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverStub
})

import { ProductForm } from "@/components/admin/products/product-form"
import { defaultProductFormValues, toProductFormValues } from "@/lib/products/form-values"
import type { ProductFormValues } from "@/lib/products/schemas"
import type { StoreItemWithDetails } from "@/lib/types/products"

const STOCK_LABEL = "Cantidad en Stock"
const THRESHOLD_LABEL = "Umbral de Stock Bajo"
const TRACK_INVENTORY_LABEL = "Rastrear inventario"

const CREATE_ACTION = {
  label: "Crear Producto",
  pendingLabel: "Creando...",
  onSubmit: vi.fn(async () => {}),
}

function renderProductForm(defaultValues: ProductFormValues = defaultProductFormValues) {
  return render(
    <ProductForm categories={[]} defaultValues={defaultValues} submitActions={[CREATE_ACTION]} />,
  )
}

function trackedProduct(): StoreItemWithDetails {
  const product: StoreItemWithDetails = {
    id: "item-1",
    item_name: "Café Especial",
    base_price: 12000,
    currency_code: "COP",
    is_active: true,
    is_featured: false,
    is_available_for_sale: true,
    track_inventory: true,
    inventory_quantity: 7,
    low_stock_threshold: 3,
    display_order: 0,
    view_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  }

  return product
}

describe("ProductForm stock visibility", () => {
  it("hides the stock field when a new product does not track inventory", () => {
    renderProductForm()

    expect(screen.queryByLabelText(STOCK_LABEL)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(THRESHOLD_LABEL)).not.toBeInTheDocument()
  })

  it("hides the stock field when an existing product does not track inventory", () => {
    renderProductForm(toProductFormValues({ ...trackedProduct(), track_inventory: false }))

    expect(screen.queryByLabelText(STOCK_LABEL)).not.toBeInTheDocument()
  })

  it("reveals the stock field on a new product as soon as inventory is tracked", async () => {
    renderProductForm()

    fireEvent.click(screen.getByLabelText(TRACK_INVENTORY_LABEL))

    expect(await screen.findByLabelText(STOCK_LABEL)).toBeInTheDocument()
    expect(screen.getByLabelText(THRESHOLD_LABEL)).toBeInTheDocument()
  })

  it("shows the stored stock of an existing product that tracks inventory", () => {
    renderProductForm(toProductFormValues(trackedProduct()))

    expect(screen.getByLabelText(STOCK_LABEL)).toHaveValue(7)
    expect(screen.getByLabelText(THRESHOLD_LABEL)).toHaveValue(3)
  })
})

describe("ProductForm field accessibility", () => {
  it("points a field at its hint so a screen reader reads the help text", () => {
    renderProductForm()

    const aiDetails = screen.getByLabelText("Detalles y Características para el Asistente Virtual")
    const hintId = aiDetails.getAttribute("aria-describedby")

    expect(hintId).toBeTruthy()
    expect(document.getElementById(hintId as string)).toHaveTextContent(
      /utilizada por el asistente virtual/,
    )
  })

  it("marks an invalid field and points it at its error message", async () => {
    renderProductForm()

    fireEvent.click(screen.getByRole("button", { name: "Crear Producto" }))

    const name = screen.getByLabelText("Nombre del Producto *")
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"))

    const errorId = name.getAttribute("aria-describedby")
    expect(document.getElementById(errorId as string)).toHaveTextContent(
      "El nombre del producto es requerido",
    )
  })

  it("leaves a valid field unmarked and undescribed", () => {
    renderProductForm()

    const seoTitle = screen.getByLabelText("Título SEO")

    expect(seoTitle).not.toHaveAttribute("aria-invalid")
    expect(seoTitle).not.toHaveAttribute("aria-describedby")
  })
})

describe("ProductForm submit actions", () => {
  it("renders one submit button per action next to a shared cancel link", () => {
    render(
      <ProductForm
        categories={[]}
        defaultValues={defaultProductFormValues}
        submitActions={[
          CREATE_ACTION,
          {
            label: "Guardar y crear otro",
            pendingLabel: "Creando...",
            onSubmit: vi.fn(async () => {}),
          },
        ]}
      />,
    )

    expect(screen.getByRole("button", { name: "Crear Producto" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Guardar y crear otro" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/admin/products",
    )
  })
})
