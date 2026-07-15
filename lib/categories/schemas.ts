import { z } from "zod"

import { generateCategorySlug } from "@/lib/utils/category-slug"

const REQUIRED_NAME_MESSAGE = "El nombre de la categoría es requerido"
const UNSLUGGABLE_NAME_MESSAGE = "El nombre debe tener al menos una letra o número"

export const categorySchema = z.object({
  category_name: z
    .string()
    .trim()
    .min(1, REQUIRED_NAME_MESSAGE)
    .refine((name) => generateCategorySlug(name).length > 0, UNSLUGGABLE_NAME_MESSAGE),
  slug: z.string(),
  category_description: z.string(),
  category_image_url: z.string(),
  display_order: z.string(),
  is_active: z.boolean(),
  seo_title: z.string(),
  seo_description: z.string(),
})

export type CategoryFormValues = z.infer<typeof categorySchema>
