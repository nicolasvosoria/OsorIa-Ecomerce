/**
 * Normalizes a category name into a URL-friendly slug.
 *
 * Only writes use this: it suggests and normalizes the slug the operator saves.
 * Reads resolve `item_categories.slug`, which is the stored source of truth, so a
 * rename never moves a live URL. The backfill in
 * `20260715000300_ecommerce_category_slug_seo.sql` replicates these exact steps in
 * SQL, so changing them here diverges from the slugs already stored.
 */
export function generateCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}
