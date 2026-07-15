import { getCategories, getItems, getVariantsByItemIds } from './products-api'
import type { ItemCategory, StoreItemWithDetails } from '@/lib/types/products'

const MAX_PICKER_PRODUCTS = 100

export type ComboPickerData = {
  products: StoreItemWithDetails[]
  categories: ItemCategory[]
}

// El picker se carga en el servidor, no en el formulario cliente: un fetch del
// navegador no accede a la cookie firmada de tienda activa y ofrecería los
// productos de la tienda anfitriona mientras las acciones de combos escriben en
// la tienda en la que se entró.
export async function loadComboPickerData(
  supabase: any,
  storeId: string,
): Promise<ComboPickerData> {
  const [productRows, categories] = await Promise.all([
    getItems(
      {
        store_id: storeId,
        limit: MAX_PICKER_PRODUCTS,
        item_kind: 'products',
        is_active: true,
        is_available_for_sale: true,
      },
      supabase,
    ),
    getCategories(false, storeId, supabase),
  ])

  const variantsByItemId = await getVariantsByItemIds(
    productRows.items.map((product) => product.id),
    supabase,
  )

  const products = productRows.items.map((product) => ({
    ...product,
    variants: variantsByItemId.get(product.id) || [],
  }))

  return { products, categories }
}
