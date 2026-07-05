/**
 * Generates a URL-friendly slug from a category name.
 *
 * This is the single source of truth for category slugs: every place that
 * links to a category (home tiles, header nav) and the route that resolves
 * a category by slug (`app/catalog/[category]/page.tsx`) must use this same
 * function, or the link and the route matcher can silently diverge.
 */
export function generateCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}
