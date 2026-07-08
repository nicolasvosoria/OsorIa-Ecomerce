import { PopularItems } from "./popular-items"
import { getPopularCategoryTiles } from "@/lib/products/popular-sections"
import type { PopularCategoryTile } from "@/lib/products/popular-sections"
import { resolveCategoryTilesOverride } from "@/lib/sections/popular-variant"
import { getComponentStyleByName } from "@/lib/supabase/styles-api"

export async function PopularItemsWrapper() {
  let tiles: PopularCategoryTile[] = []

  try {
    const style = await getComponentStyleByName("popular")
    const categoryTiles = resolveCategoryTilesOverride(style?.variables?.categoryTiles)
    tiles = await getPopularCategoryTiles(undefined, categoryTiles)
  } catch (error) {
    console.error('Error fetching popular category tiles:', error)
  }

  return <PopularItems initialTiles={tiles} />
}
