'use server'

import { getShopProductsPage } from '@/lib/products'
import type { ProductsPage, ShopServerFilters } from '@/lib/commerce/types'

export async function loadMoreShopProducts(
  params: ShopServerFilters & { offset: number },
): Promise<ProductsPage> {
  const { offset, ...filters } = params
  return getShopProductsPage(filters, offset)
}
