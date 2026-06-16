import type { SupabaseClient } from "@supabase/supabase-js"
import {
  isHomeDiscountPopupWithinSchedule,
  projectPublicHomeDiscountPopupConfig,
  type PublicHomeDiscountPopupConfig,
} from "@/lib/home-discount-popup"
import { listCombos } from "@/lib/supabase/combos-api"
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract"

export type AssistantCommerceProduct = {
  id: string
  item_name: string | null
  item_description?: string | null
  base_price: number | string | null
  compare_at_price?: number | string | null
  currency_code?: string | null
  item_slug?: string | null
  is_active?: boolean | null
  is_available_for_sale?: boolean | null
  track_inventory?: boolean | null
  inventory_quantity?: number | string | null
  metadata?: unknown
}

export type AssistantCommerceCombo = {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  isActive?: boolean
  pricing: { finalUnitPrice: number; componentSubtotal: number; currencyCode: string }
  availability: { isAvailable: boolean }
}

type BuildInput = {
  products: AssistantCommerceProduct[]
  combos: AssistantCommerceCombo[]
  popup: PublicHomeDiscountPopupConfig | null
  now: Date
}

type AssistantCommerceClient = Pick<SupabaseClient, "from">
type StoreIntegrationMetadataRow = { metadata?: unknown }

const MAX_CONTEXT_PRODUCTS = 6
const MAX_FETCHED_PRODUCTS = 20

const KEYWORDS = [
  "producto", "productos", "catálogo", "catalogo", "precio", "precios", "comprar", "compra",
  "descuento", "descuentos", "promo", "promoción", "promocion", "promociones", "oferta", "ofertas",
  "cupón", "cupon", "cupones", "combo", "combos", "qué tienen", "que tienen", "qué venden", "que venden",
]
const PROMOTION_KEYWORDS = [
  "descuento", "descuentos", "promo", "promoción", "promocion", "promociones", "oferta", "ofertas",
  "cupón", "cupon", "cupones", "combo", "combos",
]

const numberOrNull = (value: unknown) => {
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}
const currency = (value?: string | null) => value?.trim() || "COP"
const compact = (value: string, max = 180) => value.length > max ? `${value.slice(0, max).trim()}...` : value

function isSaleable(product: AssistantCommerceProduct) {
  return product.is_active !== false && product.is_available_for_sale !== false
}

function productAvailability(product: AssistantCommerceProduct) {
  if (!isSaleable(product)) return "no disponible"
  if (product.track_inventory !== true) return "disponible"
  const quantity = numberOrNull(product.inventory_quantity) ?? 0
  return quantity > 0 ? `disponible (${quantity} en inventario)` : "no disponible"
}

function productCta(product: AssistantCommerceProduct) {
  if (productAvailability(product) === "no disponible") return null
  return `/products/${product.item_slug?.trim() || product.id}`
}

function aiDetails(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return ""
  const details = (metadata as Record<string, unknown>).ai_details
  return typeof details === "string" ? details.trim() : ""
}

function productLine(product: AssistantCommerceProduct) {
  const current = numberOrNull(product.base_price)
  if (current === null) return null
  const previous = numberOrNull(product.compare_at_price)
  const lines = [
    `- ${product.item_name?.trim() || "Producto sin nombre"}`,
    `  Precio actual: ${current} ${currency(product.currency_code)}`,
  ]
  if (previous !== null && previous > current) lines.push(`  Precio anterior: ${previous} ${currency(product.currency_code)}`)
  lines.push(`  Disponibilidad: ${productAvailability(product)}`)
  const cta = productCta(product)
  if (cta) lines.push(`  CTA: ${cta}`)
  if (product.item_description?.trim()) lines.push(`  Descripción: ${compact(product.item_description.trim())}`)
  const details = aiDetails(product.metadata)
  if (details) lines.push(`  Detalles: ${compact(details)}`)
  return lines.join("\n")
}

function hasProductDiscount(product: AssistantCommerceProduct) {
  const current = numberOrNull(product.base_price)
  const previous = numberOrNull(product.compare_at_price)
  return current !== null && previous !== null && previous > current
}

function comboLine(combo: AssistantCommerceCombo) {
  if (combo.isActive === false || !combo.availability.isAvailable) return null
  const current = numberOrNull(combo.pricing.finalUnitPrice)
  if (current === null) return null
  const previous = numberOrNull(combo.pricing.componentSubtotal)
  const lines = [`- Combo: ${combo.name}`, `  Precio actual: ${current} ${currency(combo.pricing.currencyCode)}`]
  if (previous !== null && previous > current) lines.push(`  Precio anterior: ${previous} ${currency(combo.pricing.currencyCode)}`)
  lines.push("  Disponibilidad: disponible", `  CTA: /products/${combo.slug?.trim() || combo.id}`)
  if (combo.description?.trim()) lines.push(`  Descripción: ${compact(combo.description.trim())}`)
  return lines.join("\n")
}

function popupLines(popup: PublicHomeDiscountPopupConfig | null, now: Date) {
  if (!popup || !isHomeDiscountPopupWithinSchedule(popup, now)) return null
  const lines = [`Promoción pública validada: ${popup.title}`, `Texto: ${popup.text}`]
  if (popup.ctaMode === "copy_coupon") lines.push(`Cupón: ${popup.coupon}`)
  else if (popup.ctaUrl) lines.push(`CTA: ${popup.ctaUrl}`)
  lines.push(`Acción: ${popup.ctaText}`)
  return lines.join("\n")
}

export function isCommerceContextQuestion(message: string): boolean {
  const normalized = message.toLowerCase().trim()
  if (!normalized) return false
  if (KEYWORDS.some((keyword) => normalized.includes(keyword))) return true
  const words = normalized.split(/\s+/).filter((word) => word.length >= 2)
  return words.length >= 2 && message.length < 120
}

function isPromotionQuestion(message: string): boolean {
  const normalized = message.toLowerCase().trim()
  return PROMOTION_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

function productsForContext(products: AssistantCommerceProduct[], wantsPromotion: boolean) {
  if (!wantsPromotion) return products.slice(0, MAX_CONTEXT_PRODUCTS)
  const discounted = products.filter(hasProductDiscount)
  const regular = products.filter((product) => !hasProductDiscount(product))
  return [...discounted, ...regular].slice(0, MAX_CONTEXT_PRODUCTS)
}

export function buildAssistantCommerceContext({ products, combos, popup, now }: BuildInput): string {
  const sections: string[] = []
  const productLines = products.slice(0, MAX_CONTEXT_PRODUCTS).map(productLine).filter(Boolean)
  const comboLines = combos.slice(0, 3).map(comboLine).filter(Boolean)
  const popupBlock = popupLines(popup, now)
  if (productLines.length) sections.push(`Productos verificados:\n${productLines.join("\n")}`)
  if (comboLines.length) sections.push(`Combos verificados:\n${comboLines.join("\n")}`)
  if (popupBlock) sections.push(popupBlock)
  return sections.length
    ? ["Datos de comercio verificados (no inventar descuentos, cupones, combos ni CTAs fuera de esta lista):", ...sections].join("\n\n")
    : ""
}

function terms(message: string) {
  return Array.from(new Set(message.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/g, "")).filter((word) => word.length > 2)))
}

async function fetchProducts(supabase: AssistantCommerceClient, storeUuid: string, userMessage: string) {
  const search = terms(userMessage)
  const wantsPromotion = isPromotionQuestion(userMessage)
  let query = supabase.from(ECOMMERCE_TABLES.storeItems)
    .select("id, item_name, item_description, base_price, compare_at_price, currency_code, metadata, item_slug, is_active, is_available_for_sale, track_inventory, inventory_quantity")
    .eq("store_id", storeUuid).eq("is_active", true).order("display_order", { ascending: true }).limit(MAX_FETCHED_PRODUCTS)
  if (search.length && !wantsPromotion && typeof query.or === "function") {
    query = query.or(search.flatMap((term) => [`item_name.ilike.%${term}%`, `item_description.ilike.%${term}%`]).join(","))
  }
  const { data, error } = await query as { data: AssistantCommerceProduct[] | null; error: unknown }
  return error || !data ? [] : productsForContext(data, wantsPromotion)
}

function homeDiscountPopupFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null
  return (metadata as Record<string, unknown>).homeDiscountPopup
}

async function fetchPopup(supabase: AssistantCommerceClient, storeUuid: string) {
  const { data } = await supabase.from(ECOMMERCE_TABLES.storeIntegrations).select("metadata").eq("store_id", storeUuid).maybeSingle() as {
    data: StoreIntegrationMetadataRow | null
  }
  return projectPublicHomeDiscountPopupConfig(homeDiscountPopupFromMetadata(data?.metadata))
}

export async function getAssistantCommerceContext({ supabase, storeUuid, userMessage, now = new Date() }: {
  supabase: AssistantCommerceClient
  storeUuid: string | null
  userMessage: string
  now?: Date
}): Promise<string> {
  if (!storeUuid || !isCommerceContextQuestion(userMessage)) return ""
  try {
    const [products, combos, popup] = await Promise.all([
      fetchProducts(supabase, storeUuid, userMessage),
      listCombos({ store_id: storeUuid, supabaseOverride: supabase }).catch(() => []),
      fetchPopup(supabase, storeUuid).catch(() => null),
    ])
    return buildAssistantCommerceContext({ products, combos: combos as AssistantCommerceCombo[], popup, now })
  } catch (error) {
    console.error("[Chat API] Error al construir contexto de comercio:", error)
    return ""
  }
}
