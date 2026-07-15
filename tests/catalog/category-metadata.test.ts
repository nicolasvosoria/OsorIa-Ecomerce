import { beforeEach, describe, expect, it, vi } from "vitest"

const { getCategoryBySlug, getStoreId, getStoreIdServer } = vi.hoisted(() => ({
  getCategoryBySlug: vi.fn(),
  getStoreId: vi.fn(),
  getStoreIdServer: vi.fn(),
}))

vi.mock("@/lib/supabase/categories-api", () => ({ getCategoryBySlug }))
vi.mock("@/lib/supabase/products-api", () => ({ getItems: vi.fn() }))
vi.mock("@/lib/utils/store", () => ({ getStoreId }))
vi.mock("@/lib/utils/store-server", () => ({ getStoreIdServer }))
vi.mock("next/navigation", () => ({ notFound: vi.fn() }))

import { generateMetadata } from "@/app/catalog/[category]/page"

function category(overrides: Record<string, unknown> = {}) {
  return {
    id: "cat-1",
    category_name: "Speakers",
    slug: "speakers",
    category_description: "Bocinas para todo tipo de espacio",
    is_active: true,
    ...overrides,
  }
}

function params(slug: string) {
  return { params: Promise.resolve({ category: slug }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  getStoreId.mockResolvedValue("store-1")
  getStoreIdServer.mockResolvedValue(null)
  getCategoryBySlug.mockResolvedValue(category())
})

describe("generateMetadata for /catalog/[category]", () => {
  it("prefers the curated SEO fields over the category name and description", async () => {
    getCategoryBySlug.mockResolvedValue(
      category({ seo_title: "Bocinas Bluetooth | OsorIA", seo_description: "Envío gratis" }),
    )

    const metadata = await generateMetadata(params("speakers"))

    expect(metadata).toMatchObject({
      title: "Bocinas Bluetooth | OsorIA",
      description: "Envío gratis",
    })
  })

  it("falls back to the category name and description when SEO is empty", async () => {
    const metadata = await generateMetadata(params("speakers"))

    expect(metadata).toMatchObject({
      title: "Speakers",
      description: "Bocinas para todo tipo de espacio",
    })
  })

  it("resolves the category by the slug in the URL, decoded", async () => {
    await generateMetadata(params("ropa-%C3%ADntima"))

    expect(getCategoryBySlug).toHaveBeenCalledWith("ropa-íntima", "store-1")
  })

  it("reports an unknown slug as not found rather than inheriting the generic title", async () => {
    getCategoryBySlug.mockResolvedValue(null)

    await expect(generateMetadata(params("nope"))).resolves.toEqual({
      title: "Categoría no encontrada",
    })
  })

  it("degrades to a generic title instead of throwing when the store cannot be resolved", async () => {
    getStoreId.mockResolvedValue(null)

    await expect(generateMetadata(params("speakers"))).resolves.toEqual({ title: "Categoría" })
  })

  it("degrades to a generic title instead of throwing when the lookup fails", async () => {
    getCategoryBySlug.mockRejectedValue(new Error("network down"))

    await expect(generateMetadata(params("speakers"))).resolves.toEqual({ title: "Categoría" })
  })
})
