import { getSupabaseEcommerce } from './client'
import { ECOMMERCE_TABLES, ECOMMERCE_VIEWS } from './contract'
import { calculateComboPricing, deriveComboAvailability, buildComboOrderSnapshot } from '@/lib/combos/pricing'
import type { ComboAvailabilityTrace, ComboCatalogDetails, ComboComponentPriceInput, ComboDiscountType, ComboOrderSnapshot } from '@/lib/combos/types'
import type { StoreItemWithDetails } from '@/lib/types/products'

export interface ComboComponentInput {
  product_id: string
  variant_id?: string | null
  quantity: number
  display_order?: number
}

export interface CreateComboData {
  store_id?: string
  name: string
  slug?: string
  category_id?: string | null
  description?: string
  image_url?: string
  is_active?: boolean
  discount_type: ComboDiscountType
  discount_value: number
  components: ComboComponentInput[]
}

export interface UpdateComboData extends Partial<Omit<CreateComboData, 'components'>> {
  components?: ComboComponentInput[]
}

export interface ComboMutationResult {
  success: boolean
  error?: string
  combo?: ComboCatalogDetails
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

export function normalizeComboSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generateSlug(name: string) {
  return normalizeComboSlug(name)
}

function comboCategoryId(combo: any): string | null {
  const categoryId = combo?.category_id ?? combo?.metadata?.category_id
  return typeof categoryId === 'string' && categoryId.trim() ? categoryId.trim() : null
}

async function fetchComboMetadata(supabase: any, comboId: string): Promise<Record<string, any>> {
  const result = await withTimeout(
    supabase.from(ECOMMERCE_TABLES.productCombos).select('metadata').eq('id', comboId).single(),
    15000,
    'fetchComboMetadata',
  ) as { data: any | null; error: any }

  if (result.error) return {}
  return result.data?.metadata && typeof result.data.metadata === 'object' ? result.data.metadata : {}
}

function candidateSlugs(slug: string) {
  const candidates = new Set<string>()
  if (slug) candidates.add(slug)
  try {
    const decoded = decodeURIComponent(slug)
    if (decoded) {
      candidates.add(decoded)
      const normalizedDecoded = normalizeComboSlug(decoded)
      if (normalizedDecoded) candidates.add(normalizedDecoded)
    }
  } catch {
    // Keep original candidate only.
  }
  const normalized = normalizeComboSlug(slug)
  if (normalized) candidates.add(normalized)
  return Array.from(candidates)
}

async function resolveStoreId(supabase: any, explicitStoreId?: string | null): Promise<string | null> {
  if (explicitStoreId) return explicitStoreId

  try {
    const { getStoreId } = await import('@/lib/utils/store')
    const contextualStoreId = await getStoreId()
    if (contextualStoreId && contextualStoreId !== 'default') return contextualStoreId
  } catch {
    // Fallback below.
  }

  const { data: defaultStore } = await supabase
    .from(ECOMMERCE_VIEWS.storesLegacy)
    .select('id')
    .eq('subdomain', 'default')
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  return defaultStore?.id || null
}

function isProductActive(product: any) {
  return product?.is_active !== false && product?.is_available_for_sale !== false
}

function variantTitle(variant: any) {
  if (!variant) return null
  if (variant.variant_code) return variant.variant_code
  if (variant.variant_options && typeof variant.variant_options === 'object') {
    return Object.values(variant.variant_options).join(' / ')
  }
  return 'Variante'
}

function variantProductId(variant: any): string | null {
  return variant?.item_id || variant?.store_item_id || null
}

function comboIntegrityError(comboId: string): ComboAvailabilityTrace['blockingComponents'][number] {
  return {
    productId: comboId,
    productName: 'Combo incompleto',
    requiredQuantity: 2,
    availableQuantity: 0,
    message: 'El combo debe tener al menos dos componentes válidos',
  }
}

async function fetchCombos(supabase: any, comboIds?: string[], storeId?: string | null, includeInactive = false) {
  let query = supabase.from(ECOMMERCE_TABLES.productCombos).select('*').order('created_at', { ascending: false })

  if (comboIds && comboIds.length > 0) {
    query = query.in('id', comboIds)
  }
  if (storeId) {
    query = query.eq('store_id', storeId)
  }
  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const result = await withTimeout(query, 15000, 'fetchCombos') as { data: any[] | null; error: any }
  if (result.error) throw result.error
  return result.data || []
}

async function fetchComboComponents(supabase: any, comboIds: string[]) {
  if (comboIds.length === 0) return []

  const result = await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.productComboComponents)
      .select('*')
      .in('combo_id', comboIds)
      .order('display_order', { ascending: true }),
    15000,
    'fetchComboComponents',
  ) as { data: any[] | null; error: any }

  if (result.error) throw result.error
  return result.data || []
}

async function fetchComponentProducts(supabase: any, components: any[]) {
  const productIds = [...new Set(components.map((component) => component.product_id).filter(Boolean))]
  if (productIds.length === 0) return new Map<string, any>()

  const result = await withTimeout(
    supabase.from(ECOMMERCE_TABLES.storeItems).select('*').in('id', productIds),
    15000,
    'fetchComboProducts',
  ) as { data: any[] | null; error: any }

  if (result.error) throw result.error
  return new Map((result.data || []).map((product) => [product.id, product]))
}

async function fetchComponentVariants(supabase: any, components: any[]) {
  const variantIds = [...new Set(components.map((component) => component.variant_id).filter(Boolean))]
  if (variantIds.length === 0) return new Map<string, any>()

  const result = await withTimeout(
    supabase.from(ECOMMERCE_TABLES.itemVariants).select('*').in('id', variantIds),
    15000,
    'fetchComboVariants',
  ) as { data: any[] | null; error: any }

  if (result.error) throw result.error
  return new Map((result.data || []).map((variant) => [variant.id, variant]))
}

function buildComponentPriceInputs(
  comboComponents: any[],
  productById: Map<string, any>,
  variantById: Map<string, any>,
): ComboComponentPriceInput[] {
  return comboComponents.map((component) => {
    const product = productById.get(component.product_id)
    const variant = component.variant_id ? variantById.get(component.variant_id) : null
    const productExists = Boolean(product)
    const requestedVariantMissing = Boolean(component.variant_id) && !variant
    const variantBelongsToProduct = !variant || variantProductId(variant) === component.product_id
    const usableVariant = Boolean(variant && variantBelongsToProduct)
    const variantAvailable = !component.variant_id || (usableVariant && variant.is_available !== false)
    const trackInventory = usableVariant ? variant.track_inventory === true : product?.track_inventory === true
    const availableQuantity = usableVariant ? variant?.inventory_quantity ?? 0 : product?.inventory_quantity ?? 0
    const isAvailable = productExists && isProductActive(product) && !requestedVariantMissing && variantAvailable

    return {
      productId: component.product_id,
      productName: product?.item_name || 'Producto no encontrado',
      productSku: product?.item_code || null,
      variantId: component.variant_id || null,
      variantTitle: variantTitle(usableVariant ? variant : null),
      unitPrice: Number((usableVariant ? variant?.price : undefined) ?? product?.base_price ?? 0),
      quantity: Number(component.quantity || 1),
      currencyCode: product?.currency_code || 'COP',
      productImageUrl: product?.primary_image_url || null,
      productSlug: product?.item_slug || null,
      trackInventory,
      availableQuantity: trackInventory ? Number(availableQuantity || 0) : null,
      isAvailable,
    }
  })
}

export async function hydrateCombos(
  combos: any[],
  supabaseOverride?: any,
): Promise<ComboCatalogDetails[]> {
  const supabase = getClient(supabaseOverride)
  if (!supabase || combos.length === 0) return []

  const components = await fetchComboComponents(supabase, combos.map((combo) => combo.id))
  const productById = await fetchComponentProducts(supabase, components)
  const variantById = await fetchComponentVariants(supabase, components)

  return combos.map((combo) => {
    const comboComponents = components.filter((component) => component.combo_id === combo.id)
    const priceInputs = buildComponentPriceInputs(comboComponents, productById, variantById)
    const pricing = calculateComboPricing(
      priceInputs,
      { type: combo.discount_type, value: Number(combo.discount_value || 0) },
      combo.currency_code || 'COP',
    )
    const availability = deriveComboAvailability(priceInputs, 1)
    const hasEnoughValidComponents = priceInputs.filter((component) => component.isAvailable !== false).length >= 2
    const blockingComponents = hasEnoughValidComponents
      ? availability.blockingComponents
      : [...availability.blockingComponents, comboIntegrityError(combo.id)]

    return {
      id: combo.id,
      name: combo.name,
      slug: combo.slug,
      categoryId: comboCategoryId(combo),
      description: combo.description,
      imageUrl: combo.image_url,
      isActive: combo.is_active !== false,
      pricing,
      availability: {
        ...availability,
        isAvailable: combo.is_active !== false && hasEnoughValidComponents && availability.isAvailable,
        blockingComponents,
      },
      components: pricing.components,
    }
  })
}

export async function listCombos(params: {
  store_id?: string | null
  category_id?: string | null
  includeInactive?: boolean
  supabaseOverride?: any
} = {}): Promise<ComboCatalogDetails[]> {
  const supabase = getClient(params.supabaseOverride)
  if (!supabase) return []

  const storeId = await resolveStoreId(supabase, params.store_id)
  if (!storeId) return []

  const combos = await fetchCombos(supabase, undefined, storeId, params.includeInactive)
  const hydrated = await hydrateCombos(combos, supabase)
  if (!params.category_id) return hydrated
  return hydrated.filter((combo) => combo.categoryId === params.category_id)
}

export async function getComboById(
  comboId: string,
  supabaseOverride?: any,
  includeInactive = true,
): Promise<ComboCatalogDetails | null> {
  const supabase = getClient(supabaseOverride)
  if (!supabase) return null

  const combos = await fetchCombos(supabase, [comboId], undefined, includeInactive)
  const [combo] = await hydrateCombos(combos, supabase)
  return combo || null
}

export async function getComboBySlug(
  slug: string,
  storeId?: string | null,
  supabaseOverride?: any,
  includeInactive = false,
): Promise<ComboCatalogDetails | null> {
  const supabase = getClient(supabaseOverride)
  if (!supabase) return null

  const resolvedStoreId = await resolveStoreId(supabase, storeId)
  if (!resolvedStoreId) return null

  const result = await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.productCombos)
      .select('*')
      .in('slug', candidateSlugs(slug))
      .eq('store_id', resolvedStoreId)
      .limit(1)
      .maybeSingle(),
    15000,
    'getComboBySlug',
  ) as { data: any | null; error: any }

  if (result.error) return null
  if (!result.data) {
    const normalizedCandidates = new Set(candidateSlugs(slug).map((candidate) => normalizeComboSlug(candidate)).filter(Boolean))
    const combos = await fetchCombos(supabase, undefined, resolvedStoreId, includeInactive)
    const matchedCombo = combos.find((combo) => normalizedCandidates.has(normalizeComboSlug(combo.slug || '')))
    if (!matchedCombo) return null
    const [combo] = await hydrateCombos([matchedCombo], supabase)
    return combo || null
  }
  if (!includeInactive && result.data.is_active === false) return null

  const [combo] = await hydrateCombos([result.data], supabase)
  return combo || null
}

export function comboToStoreItem(combo: ComboCatalogDetails): StoreItemWithDetails {
  const now = new Date().toISOString()
  const finalPrice = combo.pricing.finalUnitPrice
  const componentSubtotal = combo.pricing.componentSubtotal

  return {
    id: combo.id,
    item_code: `COMBO-${combo.id.slice(0, 8)}`,
    item_name: combo.name,
    item_description: combo.description || undefined,
    item_description_html: combo.description ? `<p>${combo.description}</p>` : undefined,
    category_id: combo.categoryId || undefined,
    base_price: finalPrice,
    compare_at_price: componentSubtotal > finalPrice ? componentSubtotal : undefined,
    currency_code: combo.pricing.currencyCode,
    is_active: combo.isActive,
    is_featured: false,
    is_available_for_sale: combo.availability.isAvailable,
    track_inventory: true,
    inventory_quantity: combo.availability.derivedStock ?? 999999,
    low_stock_threshold: 1,
    item_slug: normalizeComboSlug(combo.slug || combo.name || combo.id) || combo.id,
    seo_title: combo.name,
    seo_description: combo.description || undefined,
    metadata: {
      item_kind: 'combo',
      combo_id: combo.id,
      category_id: combo.categoryId || null,
      combo_discount_type: combo.pricing.discountType,
      combo_discount_value: combo.pricing.discountValue,
    },
    tags: ['combo'],
    primary_image_url: combo.imageUrl || undefined,
    primary_image_alt: combo.name,
    display_order: 0,
    view_count: 0,
    created_at: now,
    updated_at: now,
    item_kind: 'combo',
    combo,
    variants: [],
    images: [],
    options: [],
  }
}

export async function getComboStock(comboId: string, requestedQuantity = 1): Promise<number | null> {
  const combo = await getComboById(comboId, undefined, false)
  if (!combo || !combo.availability.isAvailable) return 0
  if (combo.availability.derivedStock === null) return null
  return Math.max(0, combo.availability.derivedStock - Math.max(0, requestedQuantity - 1))
}

export async function buildComboOrderSnapshotById(
  comboId: string,
  orderedQuantity: number,
  supabaseOverride?: any,
): Promise<ComboOrderSnapshot | null> {
  const combo = await getComboById(comboId, supabaseOverride, false)
  if (!combo || !combo.availability.isAvailable) return null

  const availability = deriveComboAvailability(combo.components, orderedQuantity)
  if (!availability.isAvailable) {
    return {
      ...buildComboOrderSnapshot({
        comboId: combo.id,
        name: combo.name,
        slug: combo.slug,
        description: combo.description,
        imageUrl: combo.imageUrl,
        isActive: combo.isActive,
        pricing: combo.pricing,
        availability,
        orderedQuantity,
      }),
      availability,
    }
  }

  return buildComboOrderSnapshot({
    comboId: combo.id,
    name: combo.name,
    slug: combo.slug,
    description: combo.description,
    imageUrl: combo.imageUrl,
    isActive: combo.isActive,
    pricing: combo.pricing,
    availability,
    orderedQuantity,
  })
}

function normalizeComponentQuantity(quantity: unknown): number {
  const numeric = Number(quantity)
  if (!Number.isFinite(numeric) || numeric < 1) return 0
  return Math.floor(numeric)
}

async function validateComboComponentRows(
  supabase: any,
  components: ComboComponentInput[],
  comboId: string,
  storeId: string,
): Promise<{ rows: any[]; error?: string }> {
  if (components.length < 2) {
    return { rows: [], error: 'Un combo debe tener al menos dos componentes' }
  }

  const normalized = components.map((component, index) => ({
    combo_id: comboId,
    product_id: component.product_id,
    variant_id: component.variant_id || null,
    quantity: normalizeComponentQuantity(component.quantity),
    display_order: component.display_order ?? index,
  }))

  if (normalized.some((component) => !component.product_id || component.quantity < 1)) {
    return { rows: [], error: 'Todos los componentes deben tener producto y cantidad válida' }
  }

  const duplicateKeys = new Set<string>()
  for (const component of normalized) {
    const key = `${component.product_id}:${component.variant_id || 'no-variant'}`
    if (duplicateKeys.has(key)) {
      return { rows: [], error: 'El combo contiene componentes duplicados' }
    }
    duplicateKeys.add(key)
  }

  try {
    const productById = await fetchComponentProducts(supabase, normalized)
    const variantById = await fetchComponentVariants(supabase, normalized)

    for (const component of normalized) {
      const product = productById.get(component.product_id)
      if (!product) {
        return { rows: [], error: 'Uno o más productos del combo no existen' }
      }
      if (product.store_id && product.store_id !== storeId) {
        return { rows: [], error: 'Los productos del combo deben pertenecer a la tienda del combo' }
      }
      if (!isProductActive(product)) {
        return { rows: [], error: `${product.item_name || 'Producto'} no está disponible para combos` }
      }

      if (component.variant_id) {
        const variant = variantById.get(component.variant_id)
        if (!variant) {
          return { rows: [], error: 'Una o más variantes del combo no existen' }
        }
        if (variantProductId(variant) !== component.product_id) {
          return { rows: [], error: 'La variante seleccionada no pertenece al producto del componente' }
        }
        if (variant.is_available === false) {
          return { rows: [], error: `${variantTitle(variant) || 'Variante'} no está disponible para combos` }
        }
      }
    }
  } catch (error: any) {
    return { rows: [], error: error?.message || 'Error al validar componentes del combo' }
  }

  return { rows: normalized }
}

async function fetchComboStoreId(supabase: any, comboId: string): Promise<string | null> {
  const result = await withTimeout(
    supabase.from(ECOMMERCE_TABLES.productCombos).select('store_id').eq('id', comboId).single(),
    15000,
    'fetchComboStoreId',
  ) as { data: { store_id?: string | null } | null; error: any }

  if (result.error) return null
  return result.data?.store_id || null
}

async function restoreComboComponents(supabase: any, rows: any[]): Promise<void> {
  if (rows.length === 0) return
  await withTimeout(
    supabase.from(ECOMMERCE_TABLES.productComboComponents).insert(
      rows.map(({ id: _id, created_at: _createdAt, updated_at: _updatedAt, ...row }) => row),
    ),
    20000,
    'restoreComboComponents',
  )
}

export async function createCombo(data: CreateComboData): Promise<ComboMutationResult> {
  const supabase = getClient()
  if (!supabase) return { success: false, error: 'Supabase no configurado' }

  const storeId = await resolveStoreId(supabase, data.store_id)
  if (!storeId) return { success: false, error: 'No se pudo obtener el ID de la tienda' }

  const componentValidation = await validateComboComponentRows(
    supabase,
    data.components,
    '00000000-0000-0000-0000-000000000000',
    storeId,
  )
  if (componentValidation.error) {
    return { success: false, error: componentValidation.error }
  }

  const slug = normalizeComboSlug(data.slug?.trim() || data.name)
  const result = await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.productCombos)
      .insert({
        store_id: storeId,
        name: data.name.trim(),
        slug,
        description: data.description?.trim() || null,
        image_url: data.image_url?.trim() || null,
        is_active: data.is_active ?? true,
        discount_type: data.discount_type,
        discount_value: Number(data.discount_value || 0),
        metadata: {
          category_id: data.category_id || null,
        },
      })
      .select()
      .single(),
    20000,
    'createCombo',
  ) as { data: any | null; error: any }

  if (result.error || !result.data) {
    return { success: false, error: result.error?.message || 'Error al crear el combo' }
  }

  const rows = componentValidation.rows.map((row) => ({
    ...row,
    combo_id: result.data.id,
  }))

  const componentsResult = await withTimeout(
    supabase.from(ECOMMERCE_TABLES.productComboComponents).insert(rows),
    20000,
    'createComboComponents',
  ) as { error: any }

  if (componentsResult.error) {
    await withTimeout(
      supabase.from(ECOMMERCE_TABLES.productCombos).delete().eq('id', result.data.id),
      15000,
      'cleanupComboAfterComponentFailure',
    ).catch(() => undefined)
    return { success: false, error: componentsResult.error.message || 'Error al crear componentes del combo' }
  }

  return { success: true, combo: await getComboById(result.data.id) || undefined }
}

export async function updateCombo(comboId: string, data: UpdateComboData): Promise<ComboMutationResult> {
  const supabase = getClient()
  if (!supabase) return { success: false, error: 'Supabase no configurado' }

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name.trim()
  if (data.slug !== undefined || data.name !== undefined) {
    const nextSlug = data.slug?.trim() || (data.name ? data.name : '')
    if (nextSlug) updateData.slug = normalizeComboSlug(nextSlug)
  }
  if (data.description !== undefined) updateData.description = data.description?.trim() || null
  if (data.image_url !== undefined) updateData.image_url = data.image_url?.trim() || null
  if (data.is_active !== undefined) updateData.is_active = data.is_active
  if (data.discount_type !== undefined) updateData.discount_type = data.discount_type
  if (data.discount_value !== undefined) updateData.discount_value = Number(data.discount_value || 0)
  if (data.category_id !== undefined) {
    const currentMetadata = await fetchComboMetadata(supabase, comboId)
    updateData.metadata = {
      ...currentMetadata,
      category_id: data.category_id || null,
    }
  }

  let replacementRows: any[] | null = null
  let existingComponentRows: any[] = []
  if (data.components !== undefined) {
    const storeId = await fetchComboStoreId(supabase, comboId)
    if (!storeId) return { success: false, error: 'No se pudo obtener el combo' }

    const componentValidation = await validateComboComponentRows(supabase, data.components, comboId, storeId)
    if (componentValidation.error) {
      return { success: false, error: componentValidation.error }
    }
    replacementRows = componentValidation.rows

    const existingResult = await withTimeout(
      supabase.from(ECOMMERCE_TABLES.productComboComponents).select('*').eq('combo_id', comboId),
      15000,
      'fetchExistingComboComponents',
    ) as { data: any[] | null; error: any }

    if (existingResult.error) {
      return { success: false, error: existingResult.error.message || 'Error al leer componentes actuales del combo' }
    }
    existingComponentRows = existingResult.data || []
  }

  let componentsWereReplaced = false
  if (replacementRows) {
    const deleteResult = await withTimeout(
      supabase.from(ECOMMERCE_TABLES.productComboComponents).delete().eq('combo_id', comboId),
      20000,
      'deleteComboComponents',
    ) as { error: any }

    if (deleteResult.error) {
      return { success: false, error: deleteResult.error.message || 'Error al reemplazar componentes del combo' }
    }

    const insertResult = await withTimeout(
      supabase.from(ECOMMERCE_TABLES.productComboComponents).insert(replacementRows),
      20000,
      'updateComboComponents',
    ) as { error: any }

    if (insertResult.error) {
      await restoreComboComponents(supabase, existingComponentRows).catch(() => undefined)
      return { success: false, error: insertResult.error.message || 'Error al guardar componentes del combo' }
    }

    componentsWereReplaced = true
  }

  if (Object.keys(updateData).length > 0) {
    const result = await withTimeout(
      supabase.from(ECOMMERCE_TABLES.productCombos).update(updateData).eq('id', comboId),
      20000,
      'updateCombo',
    ) as { error: any }

    if (result.error) {
      if (componentsWereReplaced) {
        await withTimeout(
          supabase.from(ECOMMERCE_TABLES.productComboComponents).delete().eq('combo_id', comboId),
          20000,
          'rollbackComboComponentsAfterUpdateFailure',
        ).catch(() => undefined)
        await restoreComboComponents(supabase, existingComponentRows).catch(() => undefined)
      }
      return { success: false, error: result.error.message || 'Error al actualizar el combo' }
    }
  }

  return { success: true, combo: await getComboById(comboId) || undefined }
}
