import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CategoryForm } from "@/components/admin/categories/category-form"
import type { CategoryWithProductCount } from "@/lib/supabase/categories-api"

const { authorizeActiveStoreAdmin, getCategoryById, listCategoriesWithProductCounts, notFound, redirect } =
  vi.hoisted(() => ({
    authorizeActiveStoreAdmin: vi.fn(),
    getCategoryById: vi.fn(),
    listCategoriesWithProductCounts: vi.fn(),
    notFound: vi.fn(),
    redirect: vi.fn(),
  }))

const { createCategoryAction, updateCategoryAction, deactivateCategoryAction, deleteCategoryAction } =
  vi.hoisted(() => ({
    createCategoryAction: vi.fn(),
    updateCategoryAction: vi.fn(),
    deactivateCategoryAction: vi.fn(),
    deleteCategoryAction: vi.fn(),
  }))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/supabase/categories-api", () => ({ getCategoryById, listCategoriesWithProductCounts }))
vi.mock("next/navigation", () => ({
  notFound,
  redirect,
  usePathname: () => "/admin/products/categories",
}))
vi.mock("@/app/admin/products/categories/actions", () => ({
  createCategoryAction,
  updateCategoryAction,
  deactivateCategoryAction,
  deleteCategoryAction,
}))

import EditCategoryPage from "@/app/admin/products/categories/[id]/edit/page"
import { CategoriesTable } from "@/app/admin/products/categories/components/categories-table"
import CreateCategoryPage from "@/app/admin/products/categories/create/page"
import AdminCategoriesPage from "@/app/admin/products/categories/page"

const SERVICE = { marker: "service-client" }
const GRANT = { supabase: SERVICE, storeId: "store-1", userId: "user-1" }

const SPEAKERS = categoryFixture("11111111-1111-4111-8111-111111111111", "Speakers", "speakers", 2)
const STANDS = categoryFixture("22222222-2222-4222-8222-222222222222", "Stands", "stands", 0)

function categoryFixture(
  id: string,
  name: string,
  slug: string,
  productCount: number,
): CategoryWithProductCount {
  return {
    id,
    category_name: name,
    slug,
    display_order: 1,
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    productCount,
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

function categoryFormOf(page: ReactNode) {
  return findElementOfType(page, CategoryForm) as ReactElement<
    ComponentProps<typeof CategoryForm>
  > | null
}

beforeEach(() => {
  vi.clearAllMocks()
  authorizeActiveStoreAdmin.mockResolvedValue(GRANT)
  listCategoriesWithProductCounts.mockResolvedValue([SPEAKERS, STANDS])
  getCategoryById.mockResolvedValue(STANDS)
})

describe("CategoriesTable", () => {
  it("shows how many products each category holds", () => {
    render(<CategoriesTable categories={[SPEAKERS, STANDS]} state="ready" />)

    expect(screen.getByRole("cell", { name: "2" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "0" })).toBeInTheDocument()
  })

  it("sends each row to its own edit screen", () => {
    render(<CategoriesTable categories={[SPEAKERS, STANDS]} state="ready" />)

    const [speakersLink, standsLink] = screen.getAllByRole("link", { name: "Editar" })
    expect(speakersLink).toHaveAttribute("href", `/admin/products/categories/${SPEAKERS.id}/edit`)
    expect(standsLink).toHaveAttribute("href", `/admin/products/categories/${STANDS.id}/edit`)
  })

  it("offers deactivating as the reversible action beside the destructive one", () => {
    render(<CategoriesTable categories={[SPEAKERS]} state="ready" />)

    expect(screen.getByRole("button", { name: "Desactivar Speakers" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Eliminar Speakers" })).toBeInTheDocument()
  })

  it("drops the deactivate action on an already inactive category", () => {
    render(<CategoriesTable categories={[{ ...SPEAKERS, is_active: false }]} state="ready" />)

    expect(screen.queryByRole("button", { name: "Desactivar Speakers" })).not.toBeInTheDocument()
  })
})

describe("AdminCategoriesPage", () => {
  it("offers the create screen as a header action and renders no form of its own", async () => {
    const page = await AdminCategoriesPage()

    render(page)

    expect(screen.getByRole("link", { name: "Nueva categoría" })).toHaveAttribute(
      "href",
      "/admin/products/categories/create",
    )
    expect(categoryFormOf(page)).toBeNull()
  })

  it("scopes the listing to the active store with the granted client", async () => {
    await AdminCategoriesPage()

    expect(listCategoriesWithProductCounts).toHaveBeenCalledWith("store-1", SERVICE)
  })

  it("sends a non-admin away instead of listing another store's categories", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "No autorizado" })
    redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT")
    })

    await expect(AdminCategoriesPage()).rejects.toThrow("NEXT_REDIRECT")
    expect(listCategoriesWithProductCounts).not.toHaveBeenCalled()
  })
})

describe("CreateCategoryPage", () => {
  it("opens an empty form wired to the create action", async () => {
    const page = await CreateCategoryPage()
    const form = categoryFormOf(page)

    expect(form?.props.defaultValues.category_name).toBe("")
    expect(form?.props.onSubmit).toBe(createCategoryAction)
  })
})

describe("EditCategoryPage", () => {
  it("loads the category named by the route with its stored slug", async () => {
    const page = await EditCategoryPage({ params: Promise.resolve({ id: STANDS.id }) })

    expect(categoryFormOf(page)?.props.defaultValues).toMatchObject({
      category_name: "Stands",
      slug: "stands",
    })
  })

  it("scopes the lookup to the active store with the granted client", async () => {
    await EditCategoryPage({ params: Promise.resolve({ id: STANDS.id }) })

    expect(getCategoryById).toHaveBeenCalledWith(STANDS.id, "store-1", SERVICE)
  })

  it("404s on a category outside the active store instead of opening a blank form", async () => {
    getCategoryById.mockResolvedValue(null)
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND")
    })

    await expect(
      EditCategoryPage({ params: Promise.resolve({ id: STANDS.id }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND")
  })
})
