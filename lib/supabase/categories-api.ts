import { getSupabaseEcommerce } from './client'
import { ECOMMERCE_TABLES } from './contract'
import { isDefaultStoreAlias, resolveDefaultStoreId } from './store-alias'
import { generateCategorySlug } from '@/lib/utils/category-slug'
import type { ItemCategory } from '@/lib/types/products'

export interface CategoryWriteData {
  category_name: string
  slug?: string
  category_description?: string
  category_image_url?: string
  display_order?: number
  is_active?: boolean
  seo_title?: string
  seo_description?: string
}

export interface CategoryMutationResult {
  success: boolean
  error?: string
  category?: ItemCategory
}

export type CategoryWithProductCount = ItemCategory & { productCount: number }

const EMPTY_SLUG_ERROR = 'El nombre debe tener al menos una letra o número para formar un slug'

const UNIQUE_VIOLATION_CODE = '23505'

// Postgres devuelve un 23505 crudo ("duplicate key value violates unique
// constraint ...") cuando el operador reutiliza un nombre o un slug. El código no
// dice cuál de las dos uniques falló, pero el nombre de la constraint sí.
const DUPLICATE_ERROR_BY_CONSTRAINT: Record<string, string> = {
  item_categories_store_id_category_name_key: 'Ya existe una categoría con este nombre en la tienda',
  item_categories_store_id_slug_key: 'Ya existe una categoría con este slug en la tienda. Elige otro.',
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 15000, operation = 'operation'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout después de ${timeoutMs}ms en ${operation}`)), timeoutMs),
    ),
  ])
}

function getClient(supabaseOverride?: any) {
  return supabaseOverride ?? getSupabaseEcommerce()
}

function categoryWriteError(error: any, fallback: string): string {
  if (error?.code !== UNIQUE_VIOLATION_CODE) {
    return error?.message || fallback
  }

  const reported = `${error.message || ''} ${error.details || ''}`
  const violated = Object.keys(DUPLICATE_ERROR_BY_CONSTRAINT).find((constraint) =>
    reported.includes(constraint),
  )

  return violated ? DUPLICATE_ERROR_BY_CONSTRAINT[violated] : error.message || fallback
}

function buildCategoryRow(data: CategoryWriteData, slug: string) {
  return {
    category_name: data.category_name.trim(),
    slug,
    category_description: data.category_description?.trim() || null,
    category_image_url: data.category_image_url?.trim() || null,
    display_order: Number(data.display_order || 0),
    is_active: data.is_active ?? true,
    seo_title: data.seo_title?.trim() || null,
    seo_description: data.seo_description?.trim() || null,
  }
}

export async function getCategoryBySlug(
  slug: string,
  storeId: string,
  supabaseOverride?: any,
  includeInactive = false,
): Promise<ItemCategory | null> {
  const supabase = getClient(supabaseOverride)
  if (!supabase) return null

  const resolvedStoreId = isDefaultStoreAlias(storeId)
    ? await resolveDefaultStoreId(supabase, 'getCategoryBySlug')
    : storeId
  if (!resolvedStoreId) return null

  let query = supabase
    .from(ECOMMERCE_TABLES.itemCategories)
    .select('*')
    .eq('store_id', resolvedStoreId)
    .eq('slug', slug)

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const result = (await withTimeout(query.maybeSingle(), 15000, 'getCategoryBySlug')) as {
    data: ItemCategory | null
    error: any
  }

  if (result.error) {
    console.error('[Categories] Error al obtener la categoría por slug:', result.error)
    return null
  }

  return result.data
}

export async function getCategoryById(
  categoryId: string,
  storeId: string,
  supabaseOverride?: any,
): Promise<ItemCategory | null> {
  const supabase = getClient(supabaseOverride)
  if (!supabase) return null

  const result = (await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.itemCategories)
      .select('*')
      .eq('id', categoryId)
      .eq('store_id', storeId)
      .maybeSingle(),
    15000,
    'getCategoryById',
  )) as { data: ItemCategory | null; error: any }

  if (result.error) {
    console.error('[Categories] Error al obtener la categoría:', result.error)
    return null
  }

  return result.data
}

async function countProductsByCategory(
  storeId: string,
  supabaseOverride?: any,
): Promise<Map<string, number>> {
  const supabase = getClient(supabaseOverride)
  if (!supabase) return new Map()

  const result = (await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.storeItems)
      .select('category_id')
      .eq('store_id', storeId)
      .not('category_id', 'is', null),
    15000,
    'countProductsByCategory',
  )) as { data: { category_id: string }[] | null; error: any }

  if (result.error) throw result.error

  const countByCategoryId = new Map<string, number>()
  for (const { category_id } of result.data || []) {
    countByCategoryId.set(category_id, (countByCategoryId.get(category_id) || 0) + 1)
  }

  return countByCategoryId
}

export async function listCategoriesWithProductCounts(
  storeId: string,
  supabaseOverride?: any,
): Promise<CategoryWithProductCount[]> {
  const supabase = getClient(supabaseOverride)
  if (!supabase) return []

  const [categoriesResult, countByCategoryId] = await Promise.all([
    withTimeout(
      supabase
        .from(ECOMMERCE_TABLES.itemCategories)
        .select('*')
        .eq('store_id', storeId)
        .order('display_order', { ascending: true }),
      15000,
      'listCategories',
    ) as Promise<{ data: ItemCategory[] | null; error: any }>,
    countProductsByCategory(storeId, supabase),
  ])

  if (categoriesResult.error) throw categoriesResult.error

  return (categoriesResult.data || []).map((category) => ({
    ...category,
    productCount: countByCategoryId.get(category.id) || 0,
  }))
}

export async function createCategory(
  data: CategoryWriteData,
  storeId: string,
  supabaseOverride?: any,
): Promise<CategoryMutationResult> {
  const supabase = getClient(supabaseOverride)
  if (!supabase) return { success: false, error: 'Supabase no configurado' }

  const slug = generateCategorySlug(data.slug?.trim() || data.category_name)
  if (!slug) return { success: false, error: EMPTY_SLUG_ERROR }

  const result = (await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.itemCategories)
      .insert({ ...buildCategoryRow(data, slug), store_id: storeId })
      .select()
      .single(),
    20000,
    'createCategory',
  )) as { data: ItemCategory | null; error: any }

  if (result.error || !result.data) {
    return { success: false, error: categoryWriteError(result.error, 'Error al crear la categoría') }
  }

  return { success: true, category: result.data }
}

export async function updateCategory(
  categoryId: string,
  data: CategoryWriteData,
  storeId: string,
  supabaseOverride?: any,
): Promise<CategoryMutationResult> {
  const supabase = getClient(supabaseOverride)
  if (!supabase) return { success: false, error: 'Supabase no configurado' }

  const slug = generateCategorySlug(data.slug?.trim() || data.category_name)
  if (!slug) return { success: false, error: EMPTY_SLUG_ERROR }

  // El .eq('store_id') acota la escritura para que no se pueda editar la categoría
  // de otra tienda (mismo patrón de defensa que updateCombo).
  const result = (await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.itemCategories)
      .update(buildCategoryRow(data, slug))
      .eq('id', categoryId)
      .eq('store_id', storeId)
      .select()
      .maybeSingle(),
    20000,
    'updateCategory',
  )) as { data: ItemCategory | null; error: any }

  if (result.error) {
    return { success: false, error: categoryWriteError(result.error, 'Error al actualizar la categoría') }
  }
  if (!result.data) {
    return { success: false, error: 'Categoría no encontrada' }
  }

  return { success: true, category: result.data }
}

export async function deactivateCategory(
  categoryId: string,
  storeId: string,
  supabaseOverride?: any,
): Promise<CategoryMutationResult> {
  const supabase = getClient(supabaseOverride)
  if (!supabase) return { success: false, error: 'Supabase no configurado' }

  const result = (await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.itemCategories)
      .update({ is_active: false })
      .eq('id', categoryId)
      .eq('store_id', storeId)
      .select()
      .maybeSingle(),
    20000,
    'deactivateCategory',
  )) as { data: ItemCategory | null; error: any }

  if (result.error) {
    return { success: false, error: result.error.message || 'Error al desactivar la categoría' }
  }
  if (!result.data) {
    return { success: false, error: 'Categoría no encontrada' }
  }

  return { success: true, category: result.data }
}

// store_items.category_id es nullable y su FK es on delete set null, así que los
// productos sobreviven al borrado y quedan sin categoría; el aviso de la UI cuenta
// cuántos son antes de confirmar.
export async function deleteCategory(
  categoryId: string,
  storeId: string,
  supabaseOverride?: any,
): Promise<CategoryMutationResult> {
  const supabase = getClient(supabaseOverride)
  if (!supabase) return { success: false, error: 'Supabase no configurado' }

  const result = (await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.itemCategories)
      .delete()
      .eq('id', categoryId)
      .eq('store_id', storeId)
      .select('id')
      .maybeSingle(),
    20000,
    'deleteCategory',
  )) as { data: { id: string } | null; error: any }

  if (result.error) {
    return { success: false, error: result.error.message || 'Error al eliminar la categoría' }
  }
  if (!result.data) {
    return { success: false, error: 'Categoría no encontrada' }
  }

  return { success: true }
}
