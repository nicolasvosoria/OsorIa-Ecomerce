import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ComboForm } from "@/components/admin/combos/combo-form"
import type { ComboCatalogDetails } from "@/lib/combos/types"

const { authorizeActiveStoreAdmin, listCombos, loadComboPickerData, notFound, redirect } =
  vi.hoisted(() => ({
    authorizeActiveStoreAdmin: vi.fn(),
    listCombos: vi.fn(),
    loadComboPickerData: vi.fn(),
    notFound: vi.fn(),
    redirect: vi.fn(),
  }))

const { createComboAction, updateComboAction, deleteComboAction } = vi.hoisted(() => ({
  createComboAction: vi.fn(),
  updateComboAction: vi.fn(),
  deleteComboAction: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/supabase/combos-api", () => ({ listCombos }))
vi.mock("@/lib/supabase/combo-picker-api", () => ({ loadComboPickerData }))
vi.mock("next/navigation", () => ({
  notFound,
  redirect,
  usePathname: () => "/admin/products/combos",
}))
vi.mock("@/app/admin/products/combos/actions", () => ({
  createComboAction,
  updateComboAction,
  deleteComboAction,
}))

import EditComboPage from "@/app/admin/products/combos/[id]/edit/page"
import { CombosTable } from "@/app/admin/products/combos/components/combos-table"
import CreateComboPage from "@/app/admin/products/combos/create/page"
import AdminCombosPage from "@/app/admin/products/combos/page"

const SERVICE = { marker: "service-client" }
const GRANT = { supabase: SERVICE, storeId: "store-1", userId: "user-1" }

const COFFEE_COMBO = comboFixture("11111111-1111-4111-8111-111111111111", "Combo Café")
const TEA_COMBO = comboFixture("22222222-2222-4222-8222-222222222222", "Combo Té")

function comboFixture(id: string, name: string): ComboCatalogDetails {
  return {
    id,
    name,
    slug: name.toLowerCase().replace(" ", "-"),
    categoryId: null,
    description: null,
    imageUrl: null,
    seoTitle: null,
    seoDescription: null,
    isActive: true,
    pricing: {
      componentSubtotal: 20000,
      discountType: "percentage",
      discountValue: 10,
      discountAmount: 2000,
      finalUnitPrice: 18000,
      currencyCode: "COP",
      components: [],
    },
    availability: { isAvailable: true, derivedStock: 5, blockingComponents: [] },
    components: [],
  }
}

function findElementOfType(node: ReactNode, type: unknown): ReactElement | null {
  if (!isValidElement(node)) return null
  if (node.type === type) return node

  const children = (node.props as { children?: ReactNode }).children
  for (const child of Children.toArray(children)) {
    const found = findElementOfType(child, type)
    if (found) return found
  }
  return null
}

function comboFormOf(page: ReactNode) {
  return findElementOfType(page, ComboForm) as ReactElement<
    ComponentProps<typeof ComboForm>
  > | null
}

beforeEach(() => {
  vi.clearAllMocks()
  authorizeActiveStoreAdmin.mockResolvedValue(GRANT)
  listCombos.mockResolvedValue([COFFEE_COMBO, TEA_COMBO])
  loadComboPickerData.mockResolvedValue({ products: [], categories: [] })
})

describe("CombosTable", () => {
  it("sends each row to its own edit screen instead of editing beside the table", () => {
    render(<CombosTable combos={[COFFEE_COMBO, TEA_COMBO]} state="ready" />)

    const [coffeeLink, teaLink] = screen.getAllByRole("link", { name: "Editar" })
    expect(coffeeLink).toHaveAttribute("href", `/admin/products/combos/${COFFEE_COMBO.id}/edit`)
    expect(teaLink).toHaveAttribute("href", `/admin/products/combos/${TEA_COMBO.id}/edit`)
  })
})

describe("AdminCombosPage", () => {
  it("offers the create screen as a header action and renders no form of its own", async () => {
    const page = await AdminCombosPage()

    render(page)

    expect(screen.getByRole("link", { name: "Nuevo combo" })).toHaveAttribute(
      "href",
      "/admin/products/combos/create",
    )
    expect(comboFormOf(page)).toBeNull()
  })
})

describe("CreateComboPage", () => {
  it("opens an empty form wired to the create action", async () => {
    const page = await CreateComboPage()
    const form = comboFormOf(page)

    expect(form?.props.defaultValues.name).toBe("")
    expect(form?.props.onSubmit).toBe(createComboAction)
  })
})

describe("EditComboPage", () => {
  it("loads the combo named by the route, not the first one of the store", async () => {
    const page = await EditComboPage({ params: Promise.resolve({ id: TEA_COMBO.id }) })

    expect(comboFormOf(page)?.props.defaultValues.name).toBe(TEA_COMBO.name)
    expect(notFound).not.toHaveBeenCalled()
  })

  it("scopes the lookup to the active store with the granted client", async () => {
    await EditComboPage({ params: Promise.resolve({ id: TEA_COMBO.id }) })

    expect(listCombos).toHaveBeenCalledWith({
      store_id: "store-1",
      includeInactive: true,
      supabaseOverride: SERVICE,
    })
  })

  it("404s on a combo id outside the active store instead of opening a blank form", async () => {
    listCombos.mockResolvedValue([COFFEE_COMBO])
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND")
    })

    await expect(
      EditComboPage({ params: Promise.resolve({ id: TEA_COMBO.id }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND")
  })
})
