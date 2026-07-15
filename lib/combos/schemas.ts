import { z } from "zod"

const REQUIRED_NAME_MESSAGE = "El nombre del combo es requerido"
const MIN_DISTINCT_COMPONENTS_MESSAGE = "Selecciona al menos dos productos o variantes diferentes"

const comboComponentSchema = z.object({
  product_id: z.string(),
  variant_id: z.string(),
  quantity: z.string(),
})

export type ComboComponentFormValues = z.infer<typeof comboComponentSchema>

function distinctComponentCount(components: ComboComponentFormValues[]): number {
  const keys = new Set(
    components
      .filter((component) => component.product_id)
      .map((component) => `${component.product_id}:${component.variant_id || "base"}`),
  )
  return keys.size
}

export const comboSchema = z.object({
  name: z.string().trim().min(1, REQUIRED_NAME_MESSAGE),
  slug: z.string(),
  category_id: z.string(),
  description: z.string(),
  image_url: z.string(),
  is_active: z.boolean(),
  discount_type: z.enum(["percentage", "fixed_cop"]),
  discount_value: z.string(),
  components: z
    .array(comboComponentSchema)
    .refine((components) => distinctComponentCount(components) >= 2, MIN_DISTINCT_COMPONENTS_MESSAGE),
})

export type ComboFormValues = z.infer<typeof comboSchema>
