import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { CategoryPicker } from "@/components/admin/category-picker"
import type { ItemCategory } from "@/lib/types/products"

const { listActiveStoreCategoriesMock } = vi.hoisted(() => ({
  listActiveStoreCategoriesMock: vi.fn(),
}))

vi.mock("@/app/admin/actions/catalog-pickers", () => ({
  listActiveStoreCategories: listActiveStoreCategoriesMock,
}))

// jsdom doesn't implement ResizeObserver or scrollIntoView; the underlying
// `cmdk` Command list (shared with ProductPicker) needs both once an item is
// selected and its popover content mounts.
beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverStub
  Element.prototype.scrollIntoView = vi.fn()
})

const speakers: ItemCategory = {
  id: "cat-speakers",
  category_name: "Bocinas Bluetooth",
  slug: "bocinas-bluetooth",
  display_order: 1,
  is_active: true,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
}

describe("CategoryPicker", () => {
  it("shows a placeholder while categories are loading", () => {
    listActiveStoreCategoriesMock.mockReturnValue(new Promise(() => {}))

    render(<CategoryPicker value="" onChange={vi.fn()} />)

    expect(screen.getByRole("combobox")).toHaveTextContent("Cargando categorías…")
  })

  it("shows the selected category's name once categories load", async () => {
    listActiveStoreCategoriesMock.mockResolvedValue([speakers])

    render(<CategoryPicker value="cat-speakers" onChange={vi.fn()} />)

    await waitFor(() => expect(screen.getByRole("combobox")).toHaveTextContent("Bocinas Bluetooth"))
  })

  it("calls onChange with the picked category's id", async () => {
    listActiveStoreCategoriesMock.mockResolvedValue([speakers])
    const onChange = vi.fn()

    render(<CategoryPicker value="" onChange={onChange} />)

    await waitFor(() => expect(screen.getByRole("combobox")).not.toBeDisabled())
    fireEvent.click(screen.getByRole("combobox"))
    fireEvent.click(await screen.findByText("Bocinas Bluetooth"))

    expect(onChange).toHaveBeenCalledWith("cat-speakers")
  })
})
