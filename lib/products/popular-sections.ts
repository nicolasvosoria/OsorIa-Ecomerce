/**
 * Shared data sources for the two home sections that the reference theme
 * (computershop2) keeps deliberately separate:
 *
 * - "Popular Items"   -> category tiles (`getPopularCategoryTiles`)
 * - "Popular products" -> individual product cards (`getPopularProductCards`)
 *
 * Both the server wrapper (live homepage) and the admin editor preview call
 * these SAME functions. That is what keeps editor and live in sync: there is
 * only one query per section, not one for the editor and a different one for
 * the live page.
 */
import { generateCategorySlug } from "@/lib/utils/category-slug"
import { formatCommercePrice } from "@/lib/products/pricing"
import { toCommerceProductCard } from "@/lib/products/adapter"
import { getCategories, getItemById, getItems } from "@/lib/supabase/products-api"
import { getTopSellingProductIds } from "@/lib/supabase/stats-api"
import { getRuntimeStoreId } from "@/lib/utils/store"
import type { CommerceProductCard, GetItemsParams, ItemCategory } from "@/lib/types/products"

/**
 * Cómo se eligen los productos que se muestran en la sección "products" del home:
 * - "display_order"  -> orden de exhibición manual (comportamiento histórico).
 * - "best_selling"   -> unidades vendidas reales (pedidos pagados y confirmados).
 * - "most_viewed"    -> contador de vistas del producto.
 * - "featured"       -> productos marcados como destacados.
 */
export type PopularSelectionMode = "display_order" | "best_selling" | "most_viewed" | "featured"

export interface PopularCategoryTile {
  id: string
  name: string
  slug: string
  imageUrl?: string
  startingPriceLabel: string
  startingPriceAmount?: number
  href: string
}

/** A store owner's curated pick for "Popular Items": which category, and an
 * optional per-tile image overriding the category's own `category_image_url`. */
export interface PopularCategoryTileOverride {
  categoryId: string
  imageUrl?: string
}

const POPULAR_CATEGORY_TILES_LIMIT = 4
const POPULAR_PRODUCT_CARDS_LIMIT = 4

async function resolveStartingPrice(categoryId: string): Promise<{ label: string; amount?: number }> {
  const cheapest = await getItems({
    category_id: categoryId,
    is_active: true,
    is_available_for_sale: true,
    order_by: "base_price",
    order_direction: "asc",
    limit: 1,
  })

  const item = cheapest.items[0]
  if (!item) return { label: "" }

  return {
    label: `Desde ${formatCommercePrice(item.base_price, item.currency_code)}`,
    amount: item.base_price,
  }
}

async function buildCategoryTile(category: ItemCategory, imageOverride?: string): Promise<PopularCategoryTile> {
  const slug = generateCategorySlug(category.category_name)
  const startingPrice = await resolveStartingPrice(category.id)

  return {
    id: category.id,
    name: category.category_name,
    slug,
    imageUrl: imageOverride || category.category_image_url || undefined,
    startingPriceLabel: startingPrice.label,
    startingPriceAmount: startingPrice.amount,
    href: `/catalog/${slug}`,
  }
}

/**
 * Category tiles for "Popular Items": image + name + starting price + link
 * to the category. When `curatedTiles` is given and non-empty, builds tiles
 * from exactly those categories, in that order, using each tile's own
 * `imageUrl` override (falling back to the category's image); `limit` is
 * ignored since the curated order and count are the admin's explicit choice.
 * Otherwise falls back to today's behavior: the first `limit` categories.
 */
export async function getPopularCategoryTiles(
  limit: number = POPULAR_CATEGORY_TILES_LIMIT,
  curatedTiles: PopularCategoryTileOverride[] = [],
): Promise<PopularCategoryTile[]> {
  const categories = await getCategories(false)

  if (curatedTiles.length > 0) {
    const categoriesById = new Map(categories.map((category) => [category.id, category]))

    const tiles = await Promise.all(
      curatedTiles.map((tile) => {
        const category = categoriesById.get(tile.categoryId)
        return category ? buildCategoryTile(category, tile.imageUrl) : null
      }),
    )

    return tiles.filter((tile): tile is PopularCategoryTile => tile !== null)
  }

  return Promise.all(categories.slice(0, limit).map((category) => buildCategoryTile(category)))
}

function buildCatalogQueryParams(
  mode: Exclude<PopularSelectionMode, "best_selling">,
): Pick<GetItemsParams, "order_by" | "order_direction" | "is_featured"> {
  if (mode === "most_viewed") {
    return { order_by: "view_count", order_direction: "desc" }
  }

  if (mode === "featured") {
    return { order_by: "display_order", order_direction: "asc", is_featured: true }
  }

  return { order_by: "display_order", order_direction: "asc" }
}

/** "best_selling" cards ranked by real units sold, backfilled with display-order products if sales are scarce. */
async function getBestSellingProductCards(limit: number): Promise<CommerceProductCard[]> {
  const storeId = await getRuntimeStoreId()
  const topIds = await getTopSellingProductIds(storeId, limit)

  const bestSellingItems = await Promise.all(topIds.map((id) => getItemById(id)))
  const cards = bestSellingItems
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .map(toCommerceProductCard)

  if (cards.length >= limit) {
    return cards
  }

  const seenIds = new Set(cards.map((card) => card.id))
  const backfillResult = await getItems({
    limit: limit + seenIds.size,
    is_active: true,
    is_available_for_sale: true,
    order_by: "display_order",
    order_direction: "asc",
  })

  const backfillCards = backfillResult.items
    .filter((item) => !seenIds.has(item.id))
    .map(toCommerceProductCard)

  return [...cards, ...backfillCards].slice(0, limit)
}

/** Individual product cards for "Popular products", straight from the catalog. */
export async function getPopularProductCards(
  limit: number = POPULAR_PRODUCT_CARDS_LIMIT,
  mode: PopularSelectionMode = "display_order",
): Promise<CommerceProductCard[]> {
  if (mode === "best_selling") {
    return getBestSellingProductCards(limit)
  }

  const result = await getItems({
    limit,
    is_active: true,
    is_available_for_sale: true,
    ...buildCatalogQueryParams(mode),
  })

  return result.items.map(toCommerceProductCard)
}
