"use server"

import type { SavedAddress } from "@/lib/account/saved-address"
import { computeCheckoutPayloadFingerprint } from "@/lib/checkout/idempotency"
import { CheckoutIdempotencyConflictError, StoreIdentityNotReadyError } from "@/lib/checkout/order-writer"
import { checkoutOrderSchema } from "@/lib/checkout/schemas"
import { quoteShipping } from "@/lib/shipping/quote"
import {
  UnservedDestinationError,
  type ShippingDestination,
  type ShippingResolution,
  type ShippingResolutionItem,
} from "@/lib/shipping/resolver"
import { getAccountProfile } from "@/lib/supabase/account-profile-api"
import { buildComboOrderSnapshotById } from "@/lib/supabase/combos-api"
import {
  createOrder,
  getMostRecentOrderByUserId,
  type CreateOrderData,
  type InventoryValidationResult,
} from "@/lib/supabase/orders-api"
import {
  ecommerceForSession,
  resolveServerAuthSession,
  type ServerAuthSession,
} from "@/lib/supabase/server-auth-session"
import { getServiceEcommerceClient } from "@/lib/supabase/service-client"
import { loadPublicStoreContactPhone } from "@/lib/supabase/store-contact-public"
import { findDefaultUserAddress } from "@/lib/supabase/user-addresses-api"
import { getRuntimeStoreId } from "@/lib/utils/store"

export type PlaceCheckoutOrderResult =
  | { success: true; orderNumber: string; orderId: string }
  | { success: false; error: string; validationResult?: InventoryValidationResult }

type CheckoutContactPrefill = { phone: string; address: string }

// D24: el checkout autenticado precarga el destino estructurado (departamento
// y municipio) igual que precarga teléfono y dirección -- sale SOLO de la
// dirección predeterminada de la libreta (nunca del último pedido, que hoy
// nunca guardó un destino estructurado para empezar).
type CheckoutLocationPrefill = {
  departmentCode: string
  departmentName: string
  city: string
  municipalityCode: string
  locationId: string
}

export type CheckoutPrefill = (CheckoutContactPrefill & CheckoutLocationPrefill) | null

const IDENTITY_NOT_READY_MESSAGE =
  "Esta tienda todavía no completó su configuración y no puede recibir pedidos en este momento."
const IDEMPOTENCY_CONFLICT_MESSAGE =
  "Tu carrito cambió desde el último intento. Actualiza la página e inténtalo de nuevo."

// D28: idempotencyKey is the client's per-checkout-attempt correlation token
// (app/checkout/page.tsx generates one UUID per page load and resends the
// SAME value on every retry within it). Deliberately not part of
// checkoutOrderSchema: it isn't user-entered data, and folding it in would
// make guestCheckoutFormSchema/authenticatedCheckoutFormSchema (both derived
// from checkoutOrderSchema via pick/omit) demand a field their forms never
// collect.
export async function placeCheckoutOrder(
  input: unknown,
  idempotencyKey: string,
): Promise<PlaceCheckoutOrderResult> {
  const parsed = checkoutOrderSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: "Los datos del pedido no son válidos. Revisa el formulario e intenta de nuevo.",
    }
  }

  if (!idempotencyKey) {
    return { success: false, error: "No se pudo identificar el intento de pedido. Recarga la página e inténtalo de nuevo." }
  }

  const authenticatedUserId = await resolveAuthenticatedUserId()
  // customer_type/user_id salen de la sesión y el pago nace pendiente, diga lo
  // que diga el cliente: la action escribe con el service client (bypasea RLS)
  // y los totales los recalcula createOrder contra la base de datos.
  const orderData: CreateOrderData = {
    ...parsed.data,
    idempotency_key: idempotencyKey,
    payload_fingerprint: computeCheckoutPayloadFingerprint(parsed.data),
    customer_type: authenticatedUserId ? "user" : "guest",
    user_id: authenticatedUserId,
    payment_status: "pending",
    payment_reference: undefined,
    subtotal: 0,
    total_amount: 0,
    currency_code: parsed.data.items[0]?.currency_code,
  }

  const serviceClient = getServiceEcommerceClient()
  if (!serviceClient) {
    return { success: false, error: "Supabase service role no configurado" }
  }

  try {
    const order = await createOrder(orderData, serviceClient)
    if (!order) {
      return { success: false, error: "No se pudo crear el pedido" }
    }

    // D12/D27: el recibo del cliente y la notificación del comercio ya
    // quedaron en el outbox DENTRO de la misma transacción atómica que creó
    // el pedido (ecommerce.create_order_with_notifications) -- no hay un
    // envío diferido que disparar aquí, el worker del outbox se encarga.
    return { success: true, orderNumber: order.order_number, orderId: order.id }
  } catch (error: any) {
    if (error instanceof StoreIdentityNotReadyError) {
      return { success: false, error: IDENTITY_NOT_READY_MESSAGE }
    }
    if (error instanceof CheckoutIdempotencyConflictError) {
      return { success: false, error: IDEMPOTENCY_CONFLICT_MESSAGE }
    }

    return {
      success: false,
      error: error?.message || "Error inesperado al crear pedido",
      ...(error?.validationResult
        ? { validationResult: error.validationResult as InventoryValidationResult }
        : {}),
    }
  }
}

export type CheckoutShippingQuoteInput = {
  destination: ShippingDestination
  subtotal: number
  items: ShippingResolutionItem[]
}

export type CheckoutShippingQuoteResult =
  | { ok: true; resolution: ShippingResolution }
  | { ok: false; blocked: boolean; message: string }

const SHIPPING_QUOTE_NO_STORE_MESSAGE = "No se pudo identificar la tienda para calcular el envío."
const SHIPPING_QUOTE_UNAVAILABLE_COMBO_MESSAGE =
  "Uno de los combos del carrito ya no está disponible; el envío no se puede calcular todavía."
const SHIPPING_QUOTE_GENERIC_ERROR_MESSAGE = "No se pudo calcular el costo de envío en este momento."

// D27: the live checkout preview -- the rate tables stay closed to anon, so
// this is the only door in: it resolves the store the same way the rest of
// the public storefront does (getRuntimeStoreId, also loadPublicStoreContactPhone's
// fallback) and hands off to quoteShipping, never recomputing a price itself.
// D7: resolveShipping throws UnservedDestinationError specifically when the
// store's own setting blocks this destination -- distinguished here so the
// preview can say exactly that instead of a generic failure; any other
// throw (a network blip, a misconfigured zone) is honestly "we don't know
// yet", not "you can't buy this".
export async function getCheckoutShippingQuote(
  input: CheckoutShippingQuoteInput,
): Promise<CheckoutShippingQuoteResult> {
  const storeId = await getRuntimeStoreId()
  if (!storeId) {
    return { ok: false, blocked: false, message: SHIPPING_QUOTE_NO_STORE_MESSAGE }
  }

  if (!(await comboItemsAreAvailable(input.items))) {
    return { ok: false, blocked: false, message: SHIPPING_QUOTE_UNAVAILABLE_COMBO_MESSAGE }
  }

  try {
    const resolution = await quoteShipping({
      storeId,
      destination: input.destination,
      subtotal: input.subtotal,
      items: input.items,
    })
    return { ok: true, resolution }
  } catch (error: any) {
    if (error instanceof UnservedDestinationError) {
      return { ok: false, blocked: true, message: error.message }
    }
    return { ok: false, blocked: false, message: error?.message || SHIPPING_QUOTE_GENERIC_ERROR_MESSAGE }
  }
}

// Mirrors the gate prepareComboOrderItems already puts in front of the ORDER
// path (lib/supabase/orders-api.ts): a combo whose product_combo_components
// went missing quotes as 0g instead of throwing (resolveOrderWeightGrams's
// reduce over an empty array), a gap that path never reaches because an
// unavailable combo is rejected before resolveShipping ever runs. The live
// preview has no such gate in front of it, so it runs the same availability
// check here, first.
async function comboItemsAreAvailable(items: ShippingResolutionItem[]): Promise<boolean> {
  const comboItems = items.filter((item): item is ShippingResolutionItem & { comboId: string } =>
    Boolean(item.comboId),
  )
  const snapshots = await Promise.all(
    comboItems.map((item) => buildComboOrderSnapshotById(item.comboId, item.quantity)),
  )
  return snapshots.every((snapshot) => snapshot?.availability.isAvailable)
}

// D16: con datos guardados en la cuenta el checkout deja de adivinar — lee la
// dirección predeterminada de la libreta y el teléfono del perfil (A1) en vez de
// copiar el último pedido. El teléfono y la dirección se guardan por separado,
// así que cada campo decide su fuente por su cuenta: lo guardado manda y el
// último pedido rellena el hueco que quede. Quien todavía no ha guardado nada,
// que hoy es casi todo el mundo, conserva el comportamiento anterior. D24: el
// destino estructurado (departamento/municipio) viaja siempre junto a "saved",
// nunca lo completa el último pedido.
export async function getCheckoutPrefill(): Promise<CheckoutPrefill> {
  const session = await resolveServerAuthSession()
  if (!session) {
    return null
  }

  const saved = toPrefillFields(await readSavedAccountData(session))
  if (saved.phone && saved.address) {
    return saved
  }

  const lastOrder = await prefillFromMostRecentOrder(session)
  if (!lastOrder) {
    return saved.phone || saved.address ? saved : null
  }

  return {
    ...saved,
    phone: saved.phone || lastOrder.phone,
    address: saved.address || lastOrder.address,
  }
}

// D14/D11: names who the customer is coordinating the shipment with -- the
// checkout page is a client component and must not query the store itself
// (lib/supabase/store-contact-public.ts is the one place that does). No
// phone on file just means the coordination note never renders, same as the
// WhatsApp button in components/ui/floating-contact-button.tsx.
export async function getCheckoutStoreContactPhone(): Promise<string | null> {
  return loadPublicStoreContactPhone()
}

type SavedAccountData = { phone: string | null; defaultAddress: SavedAddress | null }

// El destino estructurado se lee tal cual de la dirección guardada -- a
// diferencia de phone/address, no tiene una segunda fuente (el último pedido)
// de la que rellenar el hueco.
function toPrefillFields(saved: SavedAccountData): NonNullable<CheckoutPrefill> {
  const location = saved.defaultAddress
  return {
    phone: saved.phone ?? "",
    address: location?.addressLine1 ?? "",
    departmentCode: location?.departmentCode ?? "",
    departmentName: location?.departmentName ?? "",
    city: location?.city ?? "",
    municipalityCode: location?.municipalityCode ?? "",
    locationId: location?.locationId ?? "",
  }
}

// El prefill es una comodidad, no un dato del pedido: si la cuenta no se puede
// leer, el checkout sigue en pie con lo que haya. El motivo queda registrado —
// no se pierde — igual que hace getMostRecentOrderByUserId con el suyo.
async function readSavedAccountData(session: ServerAuthSession): Promise<SavedAccountData> {
  try {
    const [profile, defaultAddress] = await Promise.all([
      getAccountProfile(session.userId, session.client),
      findDefaultUserAddress(session.userId, session.client),
    ])

    return { phone: profile?.phone ?? null, defaultAddress }
  } catch (error) {
    console.error("[Checkout] No se pudieron leer los datos guardados de la cuenta:", error)
    return { phone: null, defaultAddress: null }
  }
}

async function prefillFromMostRecentOrder(
  session: ServerAuthSession,
): Promise<CheckoutContactPrefill | null> {
  const lastOrder = await getMostRecentOrderByUserId(
    session.userId,
    ecommerceForSession(session.client),
  )
  if (!lastOrder) {
    return null
  }

  return {
    phone: lastOrder.customer_phone || "",
    address: lastOrder.shipping_address || "",
  }
}

async function resolveAuthenticatedUserId(): Promise<string | null> {
  const session = await resolveServerAuthSession()
  return session?.userId ?? null
}
