import type { PopularCategoryTileOverride } from "@/lib/products/popular-sections"
import { resolveEnumValue } from "@/lib/sections/resolve-enum"

export const POPULAR_COLUMNS_OPTIONS = [
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
] as const

export type PopularColumns = (typeof POPULAR_COLUMNS_OPTIONS)[number]["value"]

const POPULAR_COLUMNS_VALUES = POPULAR_COLUMNS_OPTIONS.map((option) => option.value)

const DEFAULT_POPULAR_COLUMNS: PopularColumns = "2"

export function resolvePopularColumns(value: unknown): PopularColumns {
  return resolveEnumValue(value, POPULAR_COLUMNS_VALUES, DEFAULT_POPULAR_COLUMNS)
}

// Only the responsive part varies; the grid always keeps `grid-cols-1 gap-3`
// on mobile. Uses `md:` (not `lg:`) for 3/4 columns: the theme editor's
// preview iframe (desktop stage) is narrower than `lg` (1024px), so gating
// the selected count behind `lg:` meant choosing 3 or 4 kept rendering 2
// columns there — only the (non-breakpoint-gated) overlay text sizing
// changed. `md:` (768px) is a width the preview reaches, so the chosen
// column count actually shows. Same values as `PRODUCTS_COLUMNS_CLASS` in
// `lib/sections/products-variant.ts`.
export const POPULAR_COLUMNS_CLASS: Record<PopularColumns, string> = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-2 md:grid-cols-3",
  "4": "sm:grid-cols-2 md:grid-cols-4",
}

export const POPULAR_TILE_ASPECT_OPTIONS = [
  { value: "actual", label: "Predeterminado (6:5)" },
  { value: "cuadrado", label: "Cuadrado" },
  { value: "retrato", label: "Retrato (4:5)" },
  { value: "paisaje", label: "Panorámico (16:9)" },
] as const

export type PopularTileAspect = (typeof POPULAR_TILE_ASPECT_OPTIONS)[number]["value"]

const POPULAR_TILE_ASPECT_VALUES = POPULAR_TILE_ASPECT_OPTIONS.map((option) => option.value)

const DEFAULT_POPULAR_TILE_ASPECT: PopularTileAspect = "actual"

export function resolveTileAspect(value: unknown): PopularTileAspect {
  return resolveEnumValue(value, POPULAR_TILE_ASPECT_VALUES, DEFAULT_POPULAR_TILE_ASPECT)
}

export const POPULAR_TILE_ASPECT_CLASS: Record<PopularTileAspect, string> = {
  actual: "aspect-[6/5]",
  cuadrado: "aspect-square",
  retrato: "aspect-[4/5]",
  paisaje: "aspect-[16/9]",
}

// Overlay-mode typography/spacing scale down as columns grow so the title,
// price, and CTA always fit inside a narrower tile without overlapping the
// image or clipping at the bottom (reported at columns=4, and to a lesser
// extent columns=3). "below" mode already has room and is unaffected. "2"
// reproduces today's hardcoded overlay classes byte-for-byte.
export const POPULAR_OVERLAY_CONTAINER_CLASS: Record<PopularColumns, string> = {
  "2": "gap-2 p-[30px]",
  "3": "gap-1.5 p-[20px]",
  "4": "gap-1 p-[14px]",
}

export const POPULAR_OVERLAY_TITLE_CLASS: Record<PopularColumns, string> = {
  "2": "text-[24px] sm:text-[30px] md:text-[34px] lg:text-[40px] leading-tight",
  "3": "text-[20px] sm:text-[24px] md:text-[26px] lg:text-[28px] leading-tight",
  "4": "text-[16px] sm:text-[18px] md:text-[20px] lg:text-[22px] leading-tight",
}

export const POPULAR_OVERLAY_PRICE_CLASS: Record<PopularColumns, string> = {
  "2": "text-[13px] sm:text-[16px] md:text-[18px] lg:text-[21px]",
  "3": "text-[12px] sm:text-[13px] md:text-[14px] lg:text-[15px]",
  "4": "text-[11px] sm:text-[12px] md:text-[12px] lg:text-[13px]",
}

export const POPULAR_OVERLAY_CTA_CLASS: Record<PopularColumns, string> = {
  "2": "mt-2 min-h-[44px] px-5 text-base",
  "3": "mt-1.5 min-h-[38px] px-4 text-sm",
  "4": "mt-1 min-h-[32px] px-3 text-xs",
}

export const POPULAR_TEXT_PLACEMENT_OPTIONS = [
  { value: "overlay", label: "Superpuesto sobre la imagen" },
  { value: "below", label: "Debajo de la imagen" },
] as const

export type PopularTextPlacement = (typeof POPULAR_TEXT_PLACEMENT_OPTIONS)[number]["value"]

const POPULAR_TEXT_PLACEMENT_VALUES = POPULAR_TEXT_PLACEMENT_OPTIONS.map((option) => option.value)

const DEFAULT_POPULAR_TEXT_PLACEMENT: PopularTextPlacement = "overlay"

export function resolveTextPlacement(value: unknown): PopularTextPlacement {
  return resolveEnumValue(value, POPULAR_TEXT_PLACEMENT_VALUES, DEFAULT_POPULAR_TEXT_PLACEMENT)
}

export const POPULAR_GRID_LAYOUT_OPTIONS = [
  { value: "uniform", label: "Uniforme" },
  { value: "mosaic", label: "Mosaico (primer elemento destacado)" },
] as const

export type PopularGridLayout = (typeof POPULAR_GRID_LAYOUT_OPTIONS)[number]["value"]

const POPULAR_GRID_LAYOUT_VALUES = POPULAR_GRID_LAYOUT_OPTIONS.map((option) => option.value)

const DEFAULT_POPULAR_GRID_LAYOUT: PopularGridLayout = "uniform"

export function resolveGridLayout(value: unknown): PopularGridLayout {
  return resolveEnumValue(value, POPULAR_GRID_LAYOUT_VALUES, DEFAULT_POPULAR_GRID_LAYOUT)
}

export const POPULAR_MOSAIC_FIRST_ITEM_CLASS: Record<PopularGridLayout, string> = {
  uniform: "",
  mosaic: "sm:col-span-2 sm:row-span-2",
}

function isCategoryTileEntry(entry: unknown): entry is { categoryId: string; imageUrl?: unknown } {
  if (typeof entry !== "object" || entry === null) return false

  const categoryId = (entry as { categoryId?: unknown }).categoryId
  return typeof categoryId === "string" && categoryId !== ""
}

// Sanitizes the raw `categoryTiles` content field into the curated tiles
// `getPopularCategoryTiles` accepts: drops malformed entries and entries an
// admin hasn't picked a category for yet, and normalizes an empty/blank
// `imageUrl` to "not set" so it falls back to the category's own image.
export function resolveCategoryTilesOverride(value: unknown): PopularCategoryTileOverride[] {
  if (!Array.isArray(value)) return []

  return value.filter(isCategoryTileEntry).map((entry) => ({
    categoryId: entry.categoryId,
    ...(typeof entry.imageUrl === "string" && entry.imageUrl ? { imageUrl: entry.imageUrl } : {}),
  }))
}
