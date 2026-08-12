import { z } from "zod"

import { MAX_PRODUCT_IMAGES } from "@/lib/products/images"
import { translations } from "@/lib/i18n/translations"

const REQUIRED_NAME_MESSAGE = "El nombre del producto es requerido"
const INVALID_BASE_PRICE_MESSAGE = "El precio base debe ser mayor a 0"
const NEGATIVE_STOCK_MESSAGE = "La cantidad de stock no puede ser negativa"
const TOO_MANY_IMAGES_MESSAGE = `Solo se permiten máximo ${MAX_PRODUCT_IMAGES} imágenes`
const REQUIRED_WEIGHT_MESSAGE = translations.es.products.weightRequiredError

const positiveBasePrice = z
  .string()
  .refine((value) => Number.parseFloat(value) > 0, INVALID_BASE_PRICE_MESSAGE)

const nonNegativeStock = z
  .string()
  .refine((value) => value === "" || Number.parseInt(value, 10) >= 0, NEGATIVE_STOCK_MESSAGE)

// Required in every store and mode (D9): the column stays nullable so the pre-existing
// catalog keeps working, but the form never lets a new or edited product leave it empty.
const requiredWeightGrams = z
  .string()
  .refine((value) => Number.parseInt(value, 10) >= 0, REQUIRED_WEIGHT_MESSAGE)

const productImages = z.array(z.string()).max(MAX_PRODUCT_IMAGES, TOO_MANY_IMAGES_MESSAGE)

// El stock solo se pide cuando el inventario se rastrea, así que no puede ser
// obligatorio. El resto de reglas (precio de comparación, imagen principal) se
// resuelven al mapear el payload, no como error de validación, para reflejar el
// comportamiento imperativo previo.
export const productSchema = z.object({
  item_name: z.string().trim().min(1, REQUIRED_NAME_MESSAGE),
  item_code: z.string(),
  item_description: z.string(),
  ai_details: z.string(),
  category_id: z.string(),
  base_price: positiveBasePrice,
  compare_at_price: z.string(),
  currency_code: z.string(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  is_available_for_sale: z.boolean(),
  track_inventory: z.boolean(),
  inventory_quantity: nonNegativeStock,
  low_stock_threshold: z.string(),
  weight_grams: requiredWeightGrams,
  seo_title: z.string(),
  seo_description: z.string(),
  tags: z.string(),
  display_order: z.string(),
  images: productImages,
})

export type ProductFormValues = z.infer<typeof productSchema>
