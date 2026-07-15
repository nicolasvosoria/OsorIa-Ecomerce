import { z } from "zod"

const MAX_PRODUCT_IMAGES = 5

const REQUIRED_NAME_MESSAGE = "El nombre del producto es requerido"
const INVALID_BASE_PRICE_MESSAGE = "El precio base debe ser mayor a 0"
const REQUIRED_STOCK_MESSAGE = "La cantidad en stock es requerida"
const NEGATIVE_STOCK_MESSAGE = "La cantidad de stock no puede ser negativa"
const TOO_MANY_IMAGES_MESSAGE = "Solo se permiten máximo 5 imágenes"

const positiveBasePrice = z
  .string()
  .refine((value) => Number.parseFloat(value) > 0, INVALID_BASE_PRICE_MESSAGE)

const productImages = z.array(z.string()).max(MAX_PRODUCT_IMAGES, TOO_MANY_IMAGES_MESSAGE)

// Campos compartidos por crear y editar. El resto de reglas (precio de
// comparación, imagen principal) se resuelven al mapear el payload, no como
// error de validación, para reflejar el comportamiento imperativo previo.
const sharedProductFields = {
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
  low_stock_threshold: z.string(),
  seo_title: z.string(),
  seo_description: z.string(),
  tags: z.string(),
  display_order: z.string(),
  images: productImages,
}

// Crear exige stock (era `required` nativo + chequeo imperativo >= 0).
export const createProductSchema = z.object({
  ...sharedProductFields,
  inventory_quantity: z
    .string()
    .min(1, REQUIRED_STOCK_MESSAGE)
    .refine((value) => Number.parseInt(value, 10) >= 0, NEGATIVE_STOCK_MESSAGE),
})

// Editar mostraba el stock solo con inventario activo y no lo validaba; se
// mantiene laxo para no endurecer el comportamiento existente.
export const editProductSchema = z.object({
  ...sharedProductFields,
  inventory_quantity: z.string(),
})

export type ProductFormValues = z.infer<typeof editProductSchema>
export type CreateProductFormValues = z.infer<typeof createProductSchema>
