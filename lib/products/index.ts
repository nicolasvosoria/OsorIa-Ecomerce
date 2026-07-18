/**
 * API de productos desde Supabase
 * Funciones para obtener productos y categorías de la base de datos
 */

import {
  getItems,
  getCategories,
  type GetItemsParams,
} from '@/lib/supabase/products-api';
import {
  adaptSupabaseProducts,
  adaptSupabaseCategory,
  adaptSupabaseCategories,
} from './adapter';
import type {
  Collection,
  ProductCollectionSortKey,
  ProductSortKey,
  ProductsPage,
  ShopServerFilters,
} from '@/lib/commerce/types';
import type { ItemCategory } from '@/lib/types/products';
import { SHOP_PAGE_SIZE } from '@/lib/commerce/constants';
import { mapSortKeys } from '@/lib/commerce/utils';

// Mapeo de ProductSortKey a campos de la base de datos
function mapSortKeyToOrderBy(sortKey?: ProductSortKey): {
  order_by: 'created_at' | 'display_order' | 'item_name' | 'base_price' | 'view_count';
  order_direction: 'asc' | 'desc';
} {
  switch (sortKey) {
    case 'CREATED_AT':
      return { order_by: 'created_at', order_direction: 'desc' };
    case 'PRICE':
      return { order_by: 'base_price', order_direction: 'asc' };
    case 'TITLE':
      return { order_by: 'item_name', order_direction: 'asc' };
    case 'BEST_SELLING':
      return { order_by: 'view_count', order_direction: 'desc' };
    default:
      return { order_by: 'display_order', order_direction: 'asc' };
  }
}

/**
 * Obtener todas las categorías
 */
export async function getCollections(): Promise<Collection[]> {
  // Removido 'use cache' para evitar problemas con headers() en getStoreId()
  // El cache se manejará a nivel de Next.js con revalidateTag si es necesario
  try {
    // Pasar null como storeId para que getCategories maneje la obtención del storeId
    const categories = await getCategories(false, null);
    return adaptSupabaseCategories(categories);
  } catch (error) {
    console.error('Error fetching collections from Supabase:', error);
    return [];
  }
}

// Resuelve por item_categories.slug (persistido): el mismo campo que ya usan
// categories-api y popular-sections, así un rename de categoría no mueve la
// URL de /shop.
async function findCategoryByHandle(handle: string): Promise<ItemCategory | null> {
  // Pasar null como storeId para que getCategories maneje la obtención del storeId
  const categories = await getCategories(false, null);
  return categories.find(cat => cat.slug === handle) ?? null;
}

/**
 * Obtener una categoría por handle
 */
export async function getCollection(handle: string): Promise<Collection | null> {
  // Removido 'use cache' para evitar problemas con headers() en getStoreId()
  // El cache se manejará a nivel de Next.js con revalidateTag si es necesario
  try {
    const category = await findCategoryByHandle(handle);
    return category ? adaptSupabaseCategory(category) : null;
  } catch (error) {
    console.error('Error fetching collection from Supabase:', error);
    return null;
  }
}

// Ejecuta getItems y adapta a ProductsPage; en error, loguea errorMessage y devuelve página vacía
async function fetchProductsPage(
  getItemsParams: GetItemsParams,
  errorMessage: string
): Promise<ProductsPage> {
  try {
    const result = await getItems(getItemsParams);
    return { products: adaptSupabaseProducts(result.items), total: result.total, hasMore: result.has_more };
  } catch (error) {
    console.error(errorMessage, error);
    return { products: [], total: 0, hasMore: false };
  }
}

/**
 * Obtener productos con filtros
 */
async function getProducts(params: {
  limit?: number;
  offset?: number;
  sortKey?: ProductSortKey;
  reverse?: boolean;
  query?: string;
  onSale?: boolean;
  priceMin?: number;
  priceMax?: number;
}): Promise<ProductsPage> {
  // Removido 'use cache' para evitar problemas con headers() en getStoreId()
  // El cache se manejará a nivel de Next.js con revalidateTag si es necesario
  const { order_by, order_direction } = mapSortKeyToOrderBy(params.sortKey);
  const direction = params.reverse
    ? (order_direction === 'asc' ? 'desc' : 'asc')
    : order_direction;

  return fetchProductsPage(
    {
      limit: params.limit || SHOP_PAGE_SIZE,
      offset: params.offset,
      search: params.query,
      order_by,
      order_direction: direction,
      on_sale: params.onSale,
      price_min: params.priceMin,
      price_max: params.priceMax,
    },
    'Error fetching products from Supabase:'
  );
}

/**
 * Obtener productos de una colección (categoría)
 */
async function getCollectionProducts(params: {
  collection: string;
  limit?: number;
  offset?: number;
  sortKey?: ProductCollectionSortKey;
  reverse?: boolean;
  query?: string;
  onSale?: boolean;
  priceMin?: number;
  priceMax?: number;
}): Promise<ProductsPage> {
  // Removido 'use cache' para evitar problemas con headers() en getStoreId()
  // El cache se manejará a nivel de Next.js con revalidateTag si es necesario
  try {
    const category = await findCategoryByHandle(params.collection);

    if (!category) {
      console.warn(`Category not found: ${params.collection}`);
      return { products: [], total: 0, hasMore: false };
    }

    const { order_by, order_direction } = mapSortKeyToOrderBy(params.sortKey as ProductSortKey);
    const direction = params.reverse
      ? (order_direction === 'asc' ? 'desc' : 'asc')
      : order_direction;

    return await fetchProductsPage(
      {
        category_id: category.id,
        limit: params.limit || SHOP_PAGE_SIZE,
        offset: params.offset,
        search: params.query,
        order_by,
        order_direction: direction,
        on_sale: params.onSale,
        price_min: params.priceMin,
        price_max: params.priceMax,
      },
      'Error fetching collection products from Supabase:'
    );
  } catch (error) {
    console.error('Error fetching collection products from Supabase:', error);
    return { products: [], total: 0, hasMore: false };
  }
}

/**
 * Página de /shop compartida por el render inicial (RSC) y el "Cargar más" (server action).
 */
export async function getShopProductsPage(
  filters: ShopServerFilters,
  offset: number = 0
): Promise<ProductsPage> {
  const isRootCollection = !filters.collection || filters.collection === 'all';
  const shared = {
    limit: SHOP_PAGE_SIZE,
    offset,
    query: filters.search,
    onSale: filters.onSale,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
  };

  if (isRootCollection) {
    const { sortKey, reverse } = mapSortKeys(filters.sort, 'product');
    return getProducts({ ...shared, sortKey, reverse });
  }

  const { sortKey, reverse } = mapSortKeys(filters.sort, 'collection');
  return getCollectionProducts({ ...shared, collection: filters.collection, sortKey, reverse });
}
