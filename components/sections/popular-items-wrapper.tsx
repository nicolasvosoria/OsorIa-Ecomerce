import { PopularItems } from "./popular-items"
import { getPopularCategoryTiles } from "@/lib/products/popular-sections"
import type { PopularCategoryTile } from "@/lib/products/popular-sections"

export async function PopularItemsWrapper() {
  let tiles: PopularCategoryTile[] = []

  try {
    tiles = await getPopularCategoryTiles()
  } catch (error) {
    console.error('Error fetching popular category tiles:', error)
  }

  return <PopularItems initialTiles={tiles} />
}
