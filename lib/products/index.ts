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
import type { Product, Collection, ProductSortKey, ProductCollectionSortKey } from '@/lib/commerce/types';

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

/**
 * Obtener una categoría por handle
 */
export async function getCollection(handle: string): Promise<Collection | null> {
  // Removido 'use cache' para evitar problemas con headers() en getStoreId()
  // El cache se manejará a nivel de Next.js con revalidateTag si es necesario
  try {
    // Pasar null como storeId para que getCategories maneje la obtención del storeId
    const categories = await getCategories(false, null);
    const category = categories.find(
      cat => cat.category_name.toLowerCase().replace(/\s+/g, '-') === handle
    );
    return category ? adaptSupabaseCategory(category) : null;
  } catch (error) {
    console.error('Error fetching collection from Supabase:', error);
    return null;
  }
}

/**
 * Obtener productos con filtros
 */
export async function getProducts(params: {
  limit?: number;
  sortKey?: ProductSortKey;
  reverse?: boolean;
  query?: string;
}): Promise<Product[]> {
  // Removido 'use cache' para evitar problemas con headers() en getStoreId()
  // El cache se manejará a nivel de Next.js con revalidateTag si es necesario
  try {
    const { order_by, order_direction } = mapSortKeyToOrderBy(params.sortKey);
    const direction = params.reverse
      ? (order_direction === 'asc' ? 'desc' : 'asc')
      : order_direction;

    const getItemsParams: GetItemsParams = {
      limit: params.limit || 20,
      search: params.query,
      order_by,
      order_direction: direction,
    };

    const result = await getItems(getItemsParams);
    return adaptSupabaseProducts(result.items);
  } catch (error) {
    console.error('Error fetching products from Supabase:', error);
    return [];
  }
}

/**
 * Obtener productos de una colección (categoría)
 */
export async function getCollectionProducts(params: {
  collection: string;
  limit?: number;
  sortKey?: ProductCollectionSortKey;
  reverse?: boolean;
  query?: string;
}): Promise<Product[]> {
  // Removido 'use cache' para evitar problemas con headers() en getStoreId()
  // El cache se manejará a nivel de Next.js con revalidateTag si es necesario
  try {
    // Buscar la categoría por handle
    // Pasar null como storeId para que getCategories maneje la obtención del storeId
    const categories = await getCategories(false, null);
    const category = categories.find(
      cat => cat.category_name.toLowerCase().replace(/\s+/g, '-') === params.collection
    );

    if (!category) {
      console.warn(`Category not found: ${params.collection}`);
      return [];
    }

    const { order_by, order_direction } = mapSortKeyToOrderBy(params.sortKey as ProductSortKey);
    const direction = params.reverse
      ? (order_direction === 'asc' ? 'desc' : 'asc')
      : order_direction;

    const getItemsParams: GetItemsParams = {
      category_id: category.id,
      limit: params.limit || 20,
      search: params.query,
      order_by,
      order_direction: direction,
    };

    const result = await getItems(getItemsParams);
    return adaptSupabaseProducts(result.items);
  } catch (error) {
    console.error('Error fetching collection products from Supabase:', error);
    return [];
  }
}
