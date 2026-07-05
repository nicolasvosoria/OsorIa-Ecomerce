import { PopularItems } from "./popular-items"
import { getPopularCategoryTiles } from "@/lib/products/popular-sections"
import type { PopularCategoryTile } from "@/lib/products/popular-sections"

// Deshabilitar caché para asegurar que siempre se obtengan los datos más recientes
export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function PopularItemsWrapper() {
  let tiles: PopularCategoryTile[] = []

  try {
    tiles = await getPopularCategoryTiles()
  } catch (error) {
    console.error('Error fetching popular category tiles:', error)
  }

  return <PopularItems initialTiles={tiles} />
}
