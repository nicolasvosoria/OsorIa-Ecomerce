import type { ComboFormValues } from "@/lib/combos/schemas"
import type { ComboCatalogDetails } from "@/lib/combos/types"

const MIN_COMBO_COMPONENTS = 2

export const emptyComboFormValues: ComboFormValues = {
  name: "",
  slug: "",
  category_id: "",
  description: "",
  image_url: "",
  is_active: true,
  discount_type: "percentage",
  discount_value: "0",
  components: Array.from({ length: MIN_COMBO_COMPONENTS }, () => ({
    product_id: "",
    variant_id: "",
    quantity: "1",
  })),
}

export function toComboFormValues(combo: ComboCatalogDetails): ComboFormValues {
  return {
    name: combo.name,
    slug: combo.slug || "",
    category_id: combo.categoryId || "",
    description: combo.description || "",
    image_url: combo.imageUrl || "",
    is_active: combo.isActive,
    discount_type: combo.pricing.discountType,
    discount_value: combo.pricing.discountValue.toString(),
    components: combo.components.map((component) => ({
      product_id: component.productId,
      variant_id: component.variantId || "",
      quantity: component.quantity.toString(),
    })),
  }
}
