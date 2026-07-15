import type { CategoryFormValues } from "@/lib/categories/schemas"
import type { ItemCategory } from "@/lib/types/products"

export const emptyCategoryFormValues: CategoryFormValues = {
  category_name: "",
  slug: "",
  category_description: "",
  category_image_url: "",
  display_order: "0",
  is_active: true,
  seo_title: "",
  seo_description: "",
}

export function toCategoryFormValues(category: ItemCategory): CategoryFormValues {
  return {
    category_name: category.category_name,
    slug: category.slug,
    category_description: category.category_description || "",
    category_image_url: category.category_image_url || "",
    display_order: category.display_order.toString(),
    is_active: category.is_active,
    seo_title: category.seo_title || "",
    seo_description: category.seo_description || "",
  }
}
