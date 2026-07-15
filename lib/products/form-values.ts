import type { ProductFormValues } from "@/lib/products/schemas"
import type { StoreItem, StoreItemWithDetails } from "@/lib/types/products"

const DEFAULT_CURRENCY_CODE = "COP"

export const defaultProductFormValues: ProductFormValues = {
  item_name: "",
  item_code: "",
  item_description: "",
  ai_details: "",
  category_id: "",
  base_price: "",
  compare_at_price: "",
  currency_code: DEFAULT_CURRENCY_CODE,
  is_active: true,
  is_featured: false,
  is_available_for_sale: true,
  track_inventory: false,
  inventory_quantity: "0",
  low_stock_threshold: "10",
  seo_title: "",
  seo_description: "",
  tags: "",
  display_order: "0",
  images: [],
}

export function toProductFormValues(product: StoreItemWithDetails): ProductFormValues {
  return {
    item_name: product.item_name,
    item_code: product.item_code ?? "",
    item_description: product.item_description ?? "",
    ai_details: readAiDetails(product.metadata),
    category_id: product.category_id ?? "",
    base_price: toFormNumber(product.base_price),
    compare_at_price: toFormNumber(product.compare_at_price),
    currency_code: product.currency_code || DEFAULT_CURRENCY_CODE,
    is_active: product.is_active,
    is_featured: product.is_featured,
    is_available_for_sale: product.is_available_for_sale,
    track_inventory: product.track_inventory,
    inventory_quantity: toFormNumber(product.inventory_quantity),
    low_stock_threshold: toFormNumber(product.low_stock_threshold),
    seo_title: product.seo_title ?? "",
    seo_description: product.seo_description ?? "",
    tags: product.tags?.join(", ") ?? "",
    display_order: toFormNumber(product.display_order),
    images: productImageUrls(product),
  }
}

// La imagen principal encabeza la galería y también puede estar repetida dentro
// de ella, así que el orden manda y los duplicados se descartan.
function productImageUrls(product: StoreItemWithDetails): string[] {
  const galleryUrls = (product.images ?? []).map((image) => image.image_url)
  const urls = [product.primary_image_url, ...galleryUrls]

  return [...new Set(urls.filter((url): url is string => Boolean(url)))]
}

function readAiDetails(metadata: StoreItem["metadata"]): string {
  const aiDetails = metadata?.ai_details

  return typeof aiDetails === "string" ? aiDetails : ""
}

function toFormNumber(value: number | undefined): string {
  return value?.toString() ?? ""
}
