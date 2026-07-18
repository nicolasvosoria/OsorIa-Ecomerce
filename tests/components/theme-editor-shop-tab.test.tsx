/** @vitest-environment jsdom */

// Slice 11: the Vitrina tab's controls. Covers the null "Relevancia (por
// defecto)" sort option (D20) mapping to `null`, a real sort selection, a
// filter-visibility toggle, and copy edits — each reporting the right staged
// change through its callback. Radix Select can't be driven under jsdom (no
// pointer capture / scrollIntoView), so it's swapped for a native <select>
// that keeps the value/onValueChange contract.

import { createElement, Fragment } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ThemeEditorShopTab } from "@/components/theme/theme-editor-shop-tab"
import { EMPTY_SELECT_VALUE } from "@/lib/ui/select-empty-value"
import type { ShopConfig } from "@/lib/shop/shop-config"

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) =>
    createElement(
      "select",
      { value: value ?? "", onChange: (event: any) => onValueChange?.(event.target.value) },
      children,
    ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => createElement(Fragment, null, children),
  SelectItem: ({ value, children }: any) => createElement("option", { value }, children),
}))

const ALL_VISIBLE: ShopConfig["filters"] = {
  category: true,
  color: true,
  tipo: true,
  sort: true,
  price: true,
  enOferta: true,
}

function renderTab(config: ShopConfig, overrides: Partial<Parameters<typeof ThemeEditorShopTab>[0]> = {}) {
  const onUpdateConfig = vi.fn()
  const onCopyChange = vi.fn()
  render(
    <ThemeEditorShopTab
      config={config}
      onUpdateConfig={onUpdateConfig}
      copy={{}}
      onCopyChange={onCopyChange}
      {...overrides}
    />,
  )
  return { onUpdateConfig, onCopyChange }
}

describe("ThemeEditorShopTab controls", () => {
  it("offers Relevancia (por defecto) as the first sort option and maps it to null (D20)", async () => {
    const config: ShopConfig = { defaultSort: "price-asc", filters: { ...ALL_VISIBLE } }
    const { onUpdateConfig } = renderTab(config)

    expect(screen.getAllByRole("option")[0]).toHaveTextContent("Relevancia (por defecto)")

    await userEvent.selectOptions(screen.getByRole("combobox"), EMPTY_SELECT_VALUE)

    expect(onUpdateConfig).toHaveBeenCalledTimes(1)
    expect(onUpdateConfig.mock.calls[0][0](config).defaultSort).toBeNull()
  })

  it("stages a real sort selection onto defaultSort", async () => {
    const config: ShopConfig = { defaultSort: null, filters: { ...ALL_VISIBLE } }
    const { onUpdateConfig } = renderTab(config)

    await userEvent.selectOptions(screen.getByRole("combobox"), "newest")

    expect(onUpdateConfig.mock.calls[0][0](config).defaultSort).toBe("newest")
  })

  it("stages a filter-visibility toggle", async () => {
    const config: ShopConfig = { defaultSort: null, filters: { ...ALL_VISIBLE } }
    const { onUpdateConfig } = renderTab(config)

    await userEvent.click(screen.getByLabelText("Categoría"))

    expect(onUpdateConfig.mock.calls[0][0](config).filters.category).toBe(false)
  })

  it("reports copy edits through onCopyChange", () => {
    const config: ShopConfig = { defaultSort: null, filters: { ...ALL_VISIBLE } }
    const { onCopyChange } = renderTab(config)

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Nuestra tienda" } })

    expect(onCopyChange).toHaveBeenCalledWith("title", "Nuestra tienda")
  })
})
