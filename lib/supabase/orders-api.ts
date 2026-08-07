import { getSupabaseEcommerce } from "./client";
import { ECOMMERCE_FUNCTIONS, ECOMMERCE_TABLES } from "./contract";
import { getStoreId } from "@/lib/utils/store";
import { buildComboOrderSnapshotById } from "./combos-api";
import type { ComboOrderSnapshot } from "@/lib/combos/types";
import {
  CheckoutIdempotencyConflictError,
  StoreIdentityNotReadyError,
  writeOrderAtomically,
} from "@/lib/checkout/order-writer";
import { transitionOrderStatusAtomically } from "@/lib/orders/order-status-writer";

// Tipos para pedidos
export interface Order {
  id: string;
  store_id?: string | null;
  order_number: string;
  order_date: string;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "returned"
    | "cancelled";
  customer_type: "guest" | "user";
  user_id?: string | null;
  customer_email: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone?: string | null;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  shipping_notes?: string | null;
  payment_method?: string | null;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  payment_reference?: string | null;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency_code: string;
  notes?: string | null;
  metadata?: Record<string, any>;
  confirmed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderAddress {
  id: string;
  order_id: string;
  address_type?: string | null;
  addr_type?: string | null;
  address_line_1?: string | null;
  address_line1?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  created_at?: string;
  updated_at?: string;
}

function buildShippingAddressRow(orderId: string, orderData: CreateOrderData) {
  return {
    id: generateUuid(),
    order_id: orderId,
    address_type: "shipping",
    address_line_1: orderData.shipping_address,
    city: orderData.shipping_city,
    postal_code: orderData.shipping_postal_code,
    country: orderData.shipping_country || "Colombia",
  };
}

function normalizeOrderAddress(row: any): OrderAddress {
  return {
    ...row,
    address_type: row.address_type ?? row.addr_type ?? null,
    address_line_1: row.address_line_1 ?? row.address_line1 ?? null,
  } as OrderAddress;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string | null;
  product_name: string;
  product_sku?: string | null;
  variant_id?: string | null;
  variant_title?: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  currency_code: string;
  product_image_url?: string | null;
  product_slug?: string | null;
  selected_options?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

function getComboIdFromOrderItem(item: { metadata?: Record<string, any> }): string | null {
  const metadata = item.metadata || {};
  if (metadata.item_kind === "combo" && typeof metadata.combo_id === "string") {
    return metadata.combo_id;
  }
  if (typeof metadata.comboId === "string") {
    return metadata.comboId;
  }
  return null;
}

function getComboSnapshotFromMetadata(item: { metadata?: Record<string, any> }): ComboOrderSnapshot | null {
  const snapshot = item.metadata?.combo_snapshot || item.metadata?.comboSnapshot;
  return snapshot && typeof snapshot === "object" ? (snapshot as ComboOrderSnapshot) : null;
}

function hasComboIntent(metadata?: Record<string, any>): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  return (
    metadata.item_kind === "combo" ||
    typeof metadata.combo_id === "string" ||
    typeof metadata.comboId === "string" ||
    metadata.combo_snapshot !== undefined ||
    metadata.comboSnapshot !== undefined
  );
}

function stripUntrustedComboSnapshotMetadata<T extends { metadata?: Record<string, any> }>(
  item: T,
): T {
  if (!item.metadata || typeof item.metadata !== "object") {
    return item;
  }

  const safeMetadata = { ...item.metadata };
  delete safeMetadata.combo_snapshot;
  delete safeMetadata.comboSnapshot;

  return {
    ...item,
    metadata: safeMetadata,
  };
}

export interface CreateOrderData {
  // D28: per-store checkout correlation key for one checkout attempt, and a
  // hash of the payload it was issued for -- both required so createOrder can
  // hand them straight to ecommerce.create_order_with_notifications (D27).
  // Snake_case like every other field here: this interface mirrors DB columns.
  idempotency_key: string;
  payload_fingerprint: string;
  customer_type: "guest" | "user";
  user_id?: string | null;
  customer_email: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone?: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country?: string;
  shipping_notes?: string;
  payment_method?: string;
  payment_status?: "pending" | "paid" | "failed" | "refunded";
  payment_reference?: string;
  subtotal: number;
  shipping_cost?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount: number;
  currency_code?: string;
  notes?: string;
  metadata?: Record<string, any>;
  items: Array<{
    product_id?: string;
    product_name: string;
    product_sku?: string;
    variant_id?: string;
    variant_title?: string;
    unit_price: number;
    quantity: number;
    total_price: number;
    currency_code?: string;
    product_image_url?: string;
    product_slug?: string;
    selected_options?: Record<string, any>;
    metadata?: Record<string, any>;
  }>;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  addresses?: OrderAddress[];
}

// Resultado de validación de inventario
export interface InventoryValidationResult {
  isValid: boolean;
  errors: Array<{
    product_name: string;
    product_id?: string;
    variant_id?: string;
    variant_title?: string;
    requested_quantity: number;
    available_quantity: number;
    message: string;
  }>;
}

// Item plano que espera la RPC ecommerce.decrement_inventory (autoridad
// sobre el stock, ver decrementInventoryAtomically más abajo).
interface InventoryDecrementItem {
  variant_id: string | null;
  product_id: string | null;
  quantity: number;
}

// Mismo item, pero con datos de presentación (nombre/título) para poder
// construir mensajes de error legibles si la RPC reporta un faltante.
interface InventoryDecrementContext extends InventoryDecrementItem {
  product_name: string;
  variant_title?: string | null;
}

// Item sin stock suficiente, tal como lo devuelve ecommerce.decrement_inventory.
interface InventoryShortage {
  variant_id: string | null;
  product_id: string | null;
  requested: number;
  available: number;
}

// Helper para manejar timeouts
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 15000,
  operation: string = "operation",
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(`Timeout después de ${timeoutMs}ms en ${operation}`),
          ),
        timeoutMs,
      ),
    ),
  ]);
}

function generateUuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function mapProviderPaymentStatus(
  providerStatus: string | null | undefined,
): Order["payment_status"] | null {
  if (!providerStatus) {
    return null;
  }

  const normalized = providerStatus.toLowerCase();

  if (
    ["approved", "succeeded", "paid", "completed", "authorized"].includes(
      normalized,
    )
  ) {
    return "paid";
  }

  if (
    ["rejected", "failed", "cancelled", "declined", "error"].includes(
      normalized,
    )
  ) {
    return "failed";
  }

  if (["refunded", "partially_refunded", "chargeback"].includes(normalized)) {
    return "refunded";
  }

  if (
    ["pending", "in_process", "requires_action", "processing"].includes(
      normalized,
    )
  ) {
    return "pending";
  }

  return null;
}

function getProviderPaymentField(
  transaction: any,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = transaction?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function applyPaymentCompatibility(
  order: any,
  providerTransaction?: any,
): Order {
  const providerMethod = getProviderPaymentField(providerTransaction, [
    "provider_payment_method",
    "payment_method",
    "method",
    "provider",
  ]);
  const providerReference = getProviderPaymentField(providerTransaction, [
    "provider_transaction_id",
    "transaction_id",
    "reference",
    "id",
  ]);
  const providerStatus = mapProviderPaymentStatus(
    getProviderPaymentField(providerTransaction, ["status"]),
  );

  return {
    ...order,
    payment_method: order?.payment_method ?? providerMethod ?? null,
    payment_status: order?.payment_status ?? providerStatus ?? "pending",
    payment_reference: order?.payment_reference ?? providerReference ?? null,
  } as Order;
}

async function fetchLatestPaymentTransaction(
  supabase: any,
  orderId: string,
): Promise<any | null> {
  const transactionResult = (await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.paymentTransactions)
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1),
    15000,
    "fetchLatestPaymentTransaction",
  )) as { data: any[] | null; error: any };

  if (transactionResult.error) {
    return null;
  }

  return transactionResult.data?.[0] || null;
}

function extractProviderPaymentPayload(
  metadata?: Record<string, any>,
): Record<string, any> | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const candidates = [
    metadata.provider_payload,
    metadata.providerPayload,
    metadata.payment_transaction,
    metadata.paymentTransaction,
    metadata.transaction,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      return candidate;
    }
  }

  if (
    metadata.provider ||
    metadata.provider_payment_method ||
    metadata.provider_transaction_id ||
    metadata.status
  ) {
    return metadata;
  }

  return null;
}

async function maybeInsertPaymentTransaction(
  supabase: any,
  order: Order,
  metadata: Record<string, any> | undefined,
  idempotencyKey: string,
): Promise<void> {
  const providerPayload = extractProviderPaymentPayload(metadata);
  if (!providerPayload) {
    return;
  }

  // idempotency_key is unique (payment_transactions_idempotency_key_key):
  // a retry of this SAME checkout attempt reuses the SAME key, so it's
  // ignored instead of inserting a second row for the order. Null for every
  // OTHER writer of this table (none exist today), so this never constrains
  // a future one -- same reasoning as orders.idempotency_key.
  await withTimeout(
    supabase.from(ECOMMERCE_TABLES.paymentTransactions).upsert(
      {
        id: generateUuid(),
        order_id: order.id,
        idempotency_key: idempotencyKey,
        provider:
          providerPayload.provider ||
          providerPayload.gateway ||
          "provider_payload",
        transaction_type: providerPayload.transaction_type || "payment",
        amount:
          providerPayload.amount ??
          providerPayload.total_amount ??
          order.total_amount,
        currency_code:
          providerPayload.currency_code || order.currency_code || "COP",
        status: providerPayload.status || "pending",
        provider_payment_method:
          providerPayload.provider_payment_method ||
          providerPayload.payment_method ||
          null,
        provider_transaction_id:
          providerPayload.provider_transaction_id ||
          providerPayload.transaction_id ||
          providerPayload.reference ||
          null,
        provider_txn_id:
          providerPayload.provider_transaction_id ||
          providerPayload.transaction_id ||
          providerPayload.reference ||
          null,
        metadata: providerPayload,
        raw_response: providerPayload,
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true },
    ),
    15000,
    "createPaymentTransaction",
  ).catch((paymentError) => {
    console.warn(
      "[Orders] No se pudo persistir payment_transactions:",
      paymentError,
    );
  });
}

async function fetchOrderItems(
  supabase: any,
  orderId: string,
): Promise<OrderItem[]> {
  const itemsResult = (await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.orderItems)
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    15000,
    "fetchOrderItems",
  )) as { data: any[] | null; error: any };

  if (itemsResult.error) {
    console.error(
      "[Orders] Error al obtener items del pedido:",
      itemsResult.error,
    );
    return [];
  }

  return (itemsResult.data || []) as OrderItem[];
}

async function fetchOrderAddresses(
  supabase: any,
  orderId: string,
): Promise<OrderAddress[]> {
  const addressesResult = (await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.orderAddresses)
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    15000,
    "fetchOrderAddresses",
  )) as { data: any[] | null; error: any };

  if (addressesResult.error) {
    console.warn(
      "[Orders] Error al obtener direcciones del pedido:",
      addressesResult.error,
    );
    return [];
  }

  return (addressesResult.data || []).map(normalizeOrderAddress);
}

async function hydrateOrderGraph(
  supabase: any,
  orderRow: any,
): Promise<OrderWithItems> {
  const [items, addresses, providerTransaction] = await Promise.all([
    fetchOrderItems(supabase, orderRow.id),
    fetchOrderAddresses(supabase, orderRow.id),
    fetchLatestPaymentTransaction(supabase, orderRow.id),
  ]);

  return {
    ...applyPaymentCompatibility(orderRow, providerTransaction),
    items,
    addresses,
  };
}

// Resuelve el store_id de nuestro catálogo a partir de un product_id y/o
// variant_id. Se usa tanto para items normales (nivel superior) como para
// los componentes de un combo (ver resolveOrderStoreId).
async function resolveStoreIdFromCatalogRef(
  supabase: any,
  ref: { productId?: string | null; variantId?: string | null },
): Promise<string | null> {
  if (ref.productId) {
    const productStoreResult = (await withTimeout(
      supabase
        .from(ECOMMERCE_TABLES.storeItems)
        .select("store_id")
        .eq("id", ref.productId)
        .single(),
      10000,
      "resolveStoreFromProduct",
    )) as { data: { store_id?: string | null } | null; error: any };

    if (!productStoreResult.error && productStoreResult.data?.store_id) {
      return productStoreResult.data.store_id;
    }
  }

  if (ref.variantId) {
    const variantStoreItemResult = (await withTimeout(
      supabase
        .from(ECOMMERCE_TABLES.itemVariants)
        .select("store_item_id")
        .eq("id", ref.variantId)
        .single(),
      10000,
      "resolveStoreItemFromVariant",
    )) as { data: { store_item_id?: string | null } | null; error: any };

    if (
      !variantStoreItemResult.error &&
      variantStoreItemResult.data?.store_item_id
    ) {
      const storeByVariantResult = (await withTimeout(
        supabase
          .from(ECOMMERCE_TABLES.storeItems)
          .select("store_id")
          .eq("id", variantStoreItemResult.data.store_item_id)
          .single(),
        10000,
        "resolveStoreFromVariant",
      )) as { data: { store_id?: string | null } | null; error: any };

      if (
        !storeByVariantResult.error &&
        storeByVariantResult.data?.store_id
      ) {
        return storeByVariantResult.data.store_id;
      }
    }
  }

  return null;
}

async function resolveOrderStoreId(
  supabase: any,
  items: CreateOrderData["items"],
): Promise<string | null> {
  for (const item of items) {
    const catalogStoreId = await resolveStoreIdFromCatalogRef(supabase, {
      productId: item.product_id,
      variantId: item.variant_id,
    });
    if (catalogStoreId) {
      return catalogStoreId;
    }

    // Los items combo llegan con product_id/variant_id en null
    // (prepareComboOrderItems los limpia): el store hay que resolverlo desde
    // el primer componente del snapshot del combo que sí referencie nuestro
    // catálogo.
    const comboSnapshot = getComboSnapshotFromMetadata(item);
    if (comboSnapshot) {
      for (const component of comboSnapshot.components) {
        const comboStoreId = await resolveStoreIdFromCatalogRef(supabase, {
          productId: component.productId,
          variantId: component.variantId,
        });
        if (comboStoreId) {
          return comboStoreId;
        }
      }
    }
  }

  const contextStoreId = await getStoreId();
  if (contextStoreId) {
    return contextStoreId;
  }

  // Fallback determinista: `stores` no tiene columna `is_default` en el
  // esquema actual, así que se toma la tienda activa más antigua (orden
  // estable por created_at). Multi-tenant no está activo hoy: cuando lo
  // esté (Plan E) esta resolución "a ciegas" deberá revisarse, porque no
  // debe adivinar tienda en un entorno con varias tiendas reales.
  const defaultStoreResult = (await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.stores)
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1),
    10000,
    "resolveDefaultStore",
  )) as { data: Array<{ id: string }> | null; error: any };

  if (defaultStoreResult.error) {
    return null;
  }

  return defaultStoreResult.data?.[0]?.id || null;
}

async function prepareComboOrderItems(
  items: CreateOrderData["items"],
  supabase: any,
): Promise<CreateOrderData["items"]> {
  const preparedItems: CreateOrderData["items"] = [];
  const validationErrors: InventoryValidationResult["errors"] = [];

  for (const item of items) {
    const safeItem = stripUntrustedComboSnapshotMetadata(item);
    const comboId = getComboIdFromOrderItem(safeItem);
    if (!comboId) {
      if (hasComboIntent(item.metadata)) {
        validationErrors.push({
          product_name: item.product_name,
          product_id: item.product_id,
          variant_id: item.variant_id,
          requested_quantity: item.quantity,
          available_quantity: 0,
          message: `${item.product_name} no tiene un combo válido asociado`,
        });
        continue;
      }
      preparedItems.push(safeItem);
      continue;
    }

    const snapshot = await buildComboOrderSnapshotById(
      comboId,
      item.quantity,
      supabase,
    );

    if (!snapshot || !snapshot.availability.isAvailable) {
      const blockingComponents = snapshot?.availability.blockingComponents || [];
      if (blockingComponents.length === 0) {
        validationErrors.push({
          product_name: item.product_name,
          requested_quantity: item.quantity,
          available_quantity: 0,
          message: `${item.product_name} no está disponible como combo`,
        });
      } else {
        for (const component of blockingComponents) {
          validationErrors.push({
            product_name: component.productName,
            product_id: component.productId,
            variant_id: component.variantId || undefined,
            requested_quantity: component.requiredQuantity,
            available_quantity: component.availableQuantity,
            message: component.message,
          });
        }
      }
      continue;
    }

    preparedItems.push({
      ...safeItem,
      product_id: undefined,
      variant_id: undefined,
      variant_title: "Combo",
      unit_price: snapshot.chargedUnitPrice,
      total_price: snapshot.chargedLineTotal,
      currency_code: snapshot.pricing.currencyCode,
      product_slug: snapshot.slug || item.product_slug,
      product_image_url: snapshot.imageUrl || item.product_image_url,
      selected_options: {
        ...(item.selected_options || {}),
        item_kind: "combo",
      },
      metadata: {
        ...(safeItem.metadata || {}),
        item_kind: "combo",
        combo_id: comboId,
        combo_snapshot: snapshot,
      },
    });
  }

  if (validationErrors.length > 0) {
    const validationResult: InventoryValidationResult = {
      isValid: false,
      errors: validationErrors,
    };
    const error = new Error(
      `No hay suficiente stock disponible:\n${validationErrors.map((err) => err.message).join("\n")}`,
    );
    (error as any).validationResult = validationResult;
    throw error;
  }

  return preparedItems;
}

async function fetchAuthoritativeVariantPrices(
  supabase: any,
  variantIds: string[],
): Promise<Map<string, { price: number | null; itemId: string }>> {
  if (variantIds.length === 0) return new Map();

  const result = (await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.itemVariants)
      .select("id, price, item_id")
      .in("id", variantIds),
    15000,
    "fetchAuthoritativeVariantPrices",
  )) as {
    data: Array<{ id: string; price: number | null; item_id: string }> | null;
    error: any;
  };

  if (result.error) {
    throw new Error(
      `No se pudieron validar las variantes del pedido: ${result.error.message || result.error}`,
    );
  }

  return new Map(
    (result.data || []).map((variant) => [
      variant.id,
      { price: variant.price, itemId: variant.item_id },
    ]),
  );
}

async function fetchAuthoritativeStoreItemPrices(
  supabase: any,
  productIds: string[],
): Promise<Map<string, { basePrice: number; currencyCode: string }>> {
  if (productIds.length === 0) return new Map();

  const result = (await withTimeout(
    supabase
      .from(ECOMMERCE_TABLES.storeItems)
      .select("id, base_price, currency_code")
      .in("id", productIds),
    15000,
    "fetchAuthoritativeStoreItemPrices",
  )) as {
    data: Array<{ id: string; base_price: number; currency_code: string }> | null;
    error: any;
  };

  if (result.error) {
    throw new Error(
      `No se pudieron validar los productos del pedido: ${result.error.message || result.error}`,
    );
  }

  return new Map(
    (result.data || []).map((product) => [
      product.id,
      { basePrice: product.base_price, currencyCode: product.currency_code },
    ]),
  );
}

/**
 * Recalcula unit_price/total_price/currency_code desde la DB para cada item que
 * referencia nuestro catálogo, ignorando lo que envíe el cliente. Los combos ya
 * llegan con precio autoritativo (prepareComboOrderItems) y se dejan intactos.
 *
 * Si un product_id/variant_id no resuelve en la DB, el item se trata como
 * externo (p. ej. de un catálogo legado) y conserva el precio del cliente para ese item, igual
 * que ya hacen validateInventoryBeforeOrder/resolveOrderStoreId. Esto es
 * transitorio: cuando se retire el remanente de datos legados, todo item deberá
 * resolver en el catálogo y esta rama externa queda sin uso.
 */
async function applyAuthoritativePricing(
  items: CreateOrderData["items"],
  supabase: any,
): Promise<CreateOrderData["items"]> {
  const pricableItems = items.filter((item) => !getComboIdFromOrderItem(item));

  const variantIds = [
    ...new Set(
      pricableItems
        .map((item) => item.variant_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const variantById = await fetchAuthoritativeVariantPrices(supabase, variantIds);

  const directProductIds = pricableItems
    .filter((item) => !item.variant_id)
    .map((item) => item.product_id)
    .filter((id): id is string => Boolean(id));
  const variantProductIds = [...variantById.values()].map((variant) => variant.itemId);
  const productIds = [...new Set([...directProductIds, ...variantProductIds])];
  const productById = await fetchAuthoritativeStoreItemPrices(supabase, productIds);

  return items.map((item) => {
    if (getComboIdFromOrderItem(item)) {
      return item;
    }

    if (item.variant_id) {
      const variant = variantById.get(item.variant_id);
      if (!variant) {
        return item;
      }

      const product = productById.get(variant.itemId);
      const unitPrice = Number(variant.price ?? product?.basePrice ?? 0);
      return {
        ...item,
        unit_price: unitPrice,
        total_price: unitPrice * item.quantity,
        currency_code: product?.currencyCode || item.currency_code || "COP",
      };
    }

    if (item.product_id) {
      const product = productById.get(item.product_id);
      if (!product) {
        return item;
      }

      const unitPrice = Number(product.basePrice ?? 0);
      return {
        ...item,
        unit_price: unitPrice,
        total_price: unitPrice * item.quantity,
        currency_code: product.currencyCode || "COP",
      };
    }

    return item;
  });
}

/**
 * Validar inventario antes de crear una orden.
 * Verifica que todos los productos tengan suficiente stock disponible en el
 * momento de la validación, pero es solo un pre-chequeo best-effort para UX
 * (evita llegar hasta el descuento cuando ya se sabe que no hay stock):
 * existe una ventana de carrera entre esta validación y la creación real de
 * la orden. La AUTORIDAD sobre el stock es la RPC atómica
 * ecommerce.decrement_inventory (ver decrementInventoryAtomically más abajo),
 * que es quien realmente decide si hay stock suficiente al momento de
 * descontar y puede hacer que la orden se elimine si no lo hay.
 */
async function validateInventoryBeforeOrder(
  items: CreateOrderData["items"],
  supabaseOverride?: any,
): Promise<InventoryValidationResult> {
  const result: InventoryValidationResult = {
    isValid: true,
    errors: [],
  };

  try {
    const supabase = supabaseOverride ?? getSupabaseEcommerce();
    if (!supabase) {
      // Si no hay supabase, permitir la orden (para productos de catálogos externos)
      return result;
    }

    // Validar cada item
    for (const item of items) {
      try {
        const comboSnapshot = getComboSnapshotFromMetadata(item);
        if (comboSnapshot) {
          if (!comboSnapshot.availability.isAvailable) {
            result.isValid = false;
            for (const component of comboSnapshot.availability.blockingComponents) {
              result.errors.push({
                product_name: component.productName,
                product_id: component.productId,
                variant_id: component.variantId || undefined,
                requested_quantity: component.requiredQuantity,
                available_quantity: component.availableQuantity,
                message: component.message,
              });
            }
          }
          continue;
        }

        // Si hay variant_id, validar inventario de la variante
        if (item.variant_id) {
          const variantResult = (await withTimeout(
            supabase
              .from(ECOMMERCE_TABLES.itemVariants)
              .select("track_inventory, inventory_quantity, is_available")
              .eq("id", item.variant_id)
              .single(),
            10000,
            "validateVariantInventory",
          )) as { data: any; error: any };

          if (variantResult.error || !variantResult.data) {
            // Si no se encuentra la variante, permitir la orden (puede ser producto externo)
            continue;
          }

          const variant = variantResult.data;

          // Si track_inventory es true, validar stock
          if (variant.track_inventory) {
            const availableQuantity = variant.inventory_quantity || 0;

            // Verificar si no está disponible
            if (!variant.is_available) {
              result.isValid = false;
              result.errors.push({
                product_name: item.product_name,
                product_id: item.product_id,
                variant_id: item.variant_id,
                variant_title: item.variant_title,
                requested_quantity: item.quantity,
                available_quantity: 0,
                message: `${item.product_name}${item.variant_title ? ` - ${item.variant_title}` : ""} no está disponible`,
              });
              continue;
            }

            // Verificar si hay suficiente stock
            if (availableQuantity < item.quantity) {
              result.isValid = false;
              result.errors.push({
                product_name: item.product_name,
                product_id: item.product_id,
                variant_id: item.variant_id,
                variant_title: item.variant_title,
                requested_quantity: item.quantity,
                available_quantity: availableQuantity,
                message:
                  availableQuantity === 0
                    ? `${item.product_name}${item.variant_title ? ` - ${item.variant_title}` : ""} está agotado`
                    : `Solo hay ${availableQuantity} unidad${availableQuantity !== 1 ? "es" : ""} disponible${availableQuantity !== 1 ? "s" : ""} de ${item.product_name}${item.variant_title ? ` - ${item.variant_title}` : ""}. Solicitaste ${item.quantity}`,
              });
            }
          }
        }
        // Si hay product_id pero no variant_id, validar inventario del producto
        else if (item.product_id) {
          const productResult = (await withTimeout(
            supabase
              .from(ECOMMERCE_TABLES.storeItems)
              .select(
                "track_inventory, inventory_quantity, is_available_for_sale, is_active",
              )
              .eq("id", item.product_id)
              .single(),
            10000,
            "validateProductInventory",
          )) as { data: any; error: any };

          if (productResult.error || !productResult.data) {
            // Si no se encuentra el producto, permitir la orden (puede ser producto externo)
            continue;
          }

          const product = productResult.data;

          // Si track_inventory es true, validar stock
          if (product.track_inventory) {
            const availableQuantity = product.inventory_quantity || 0;

            // Verificar si no está disponible para venta
            if (!product.is_available_for_sale || !product.is_active) {
              result.isValid = false;
              result.errors.push({
                product_name: item.product_name,
                product_id: item.product_id,
                requested_quantity: item.quantity,
                available_quantity: 0,
                message: `${item.product_name} no está disponible`,
              });
              continue;
            }

            // Verificar si hay suficiente stock
            if (availableQuantity < item.quantity) {
              result.isValid = false;
              result.errors.push({
                product_name: item.product_name,
                product_id: item.product_id,
                requested_quantity: item.quantity,
                available_quantity: availableQuantity,
                message:
                  availableQuantity === 0
                    ? `${item.product_name} está agotado`
                    : `Solo hay ${availableQuantity} unidad${availableQuantity !== 1 ? "es" : ""} disponible${availableQuantity !== 1 ? "s" : ""} de ${item.product_name}. Solicitaste ${item.quantity}`,
              });
            }
          }
        }
      } catch (error: any) {
        // Continuar con el siguiente item si hay un error
        console.error(
          `[Orders] Error al validar inventario para item ${item.product_name}:`,
          error,
        );
      }
    }
  } catch (error: any) {
    console.error("[Orders] Error inesperado al validar inventario:", error);
    // En caso de error, no bloquear la orden (permitir productos externos)
  }

  return result;
}

/**
 * Aplana los items de una orden ya persistida a la lista de decrementos que
 * espera ecommerce.decrement_inventory, expandiendo combos a sus componentes
 * -- misma expansión que antes hacía updateInventoryAfterOrder a mano, item
 * por item, con lecturas intermedias.
 */
function buildInventoryDecrementPlan(
  items: OrderItem[],
): InventoryDecrementContext[] {
  const plan: InventoryDecrementContext[] = [];

  for (const item of items) {
    const comboSnapshot = getComboSnapshotFromMetadata(item);
    if (comboSnapshot) {
      for (const component of comboSnapshot.components) {
        const quantity = component.quantity * item.quantity;

        if (component.variantId) {
          plan.push({
            variant_id: component.variantId,
            product_id: component.productId ?? null,
            quantity,
            product_name: component.productName,
            variant_title: component.variantTitle,
          });
        } else if (component.productId) {
          plan.push({
            variant_id: null,
            product_id: component.productId,
            quantity,
            product_name: component.productName,
          });
        }
      }
      continue;
    }

    if (item.variant_id) {
      plan.push({
        variant_id: item.variant_id,
        product_id: item.product_id ?? null,
        quantity: item.quantity,
        product_name: item.product_name,
        variant_title: item.variant_title,
      });
    } else if (item.product_id) {
      plan.push({
        variant_id: null,
        product_id: item.product_id,
        quantity: item.quantity,
        product_name: item.product_name,
      });
    }
  }

  return plan;
}

/**
 * Descuenta inventario de forma ATÓMICA vía la RPC
 * ecommerce.decrement_inventory (ver migración
 * supabase/migrations/20260713000100_ecommerce_atomic_inventory.sql). La
 * función valida y descuenta en una única sentencia UPDATE condicional por
 * item, dentro de la transacción implícita de la función: elimina la
 * ventana de carrera del viejo read-then-write (dos compras concurrentes del
 * último stock ya no pueden leer el mismo valor y descontar ambas).
 *
 * Esta llamada es la AUTORIDAD sobre el stock. Un resultado con `shortages`
 * no vacío significa que la orden ya creada no tiene respaldo real de stock
 * y debe tratarse como si la validación hubiera fallado (ver createOrder).
 */
async function decrementInventoryAtomically(
  supabase: any,
  orderId: string,
  storeId: string | null,
  orderItems: OrderItem[],
): Promise<{ shortages: InventoryShortage[] }> {
  const plan = buildInventoryDecrementPlan(orderItems);
  if (plan.length === 0) {
    return { shortages: [] };
  }

  const items: InventoryDecrementItem[] = plan.map(
    ({ variant_id, product_id, quantity }) => ({ variant_id, product_id, quantity }),
  );

  const result = (await withTimeout(
    supabase.rpc(ECOMMERCE_FUNCTIONS.decrementInventory, {
      p_order_id: orderId,
      p_store_id: storeId,
      p_items: items,
    }),
    15000,
    "decrementInventory",
  )) as { data: InventoryShortage[] | null; error: any };

  if (result.error) {
    // Error de infraestructura (timeout, RPC no disponible, etc.), NO un
    // faltante de stock: se propaga tal cual para que el llamador decida
    // (comportamiento best-effort, no borra la orden).
    throw result.error;
  }

  return { shortages: result.data || [] };
}

/**
 * Arma un InventoryValidationResult (mismo formato que
 * validateInventoryBeforeOrder) a partir de los faltantes reportados por
 * decrementInventoryAtomically, recuperando nombre/título de los items
 * originales para mensajes legibles.
 */
function buildShortageValidationResult(
  shortages: InventoryShortage[],
  orderItems: OrderItem[],
): InventoryValidationResult {
  const contexts = buildInventoryDecrementPlan(orderItems);

  const errors = shortages.map((shortage) => {
    const context = contexts.find((candidate) =>
      shortage.variant_id
        ? candidate.variant_id === shortage.variant_id
        : candidate.product_id === shortage.product_id,
    );
    const label = `${context?.product_name || "Producto"}${
      context?.variant_title ? ` - ${context.variant_title}` : ""
    }`;

    return {
      product_name: context?.product_name || "Producto",
      product_id: shortage.product_id || undefined,
      variant_id: shortage.variant_id || undefined,
      variant_title: context?.variant_title || undefined,
      requested_quantity: shortage.requested,
      available_quantity: shortage.available,
      message:
        shortage.available === 0
          ? `${label} está agotado`
          : `Solo hay ${shortage.available} unidad${shortage.available !== 1 ? "es" : ""} disponible${shortage.available !== 1 ? "s" : ""} de ${label}. Solicitaste ${shortage.requested}`,
    };
  });

  return { isValid: false, errors };
}

/**
 * Crear un nuevo pedido con sus items
 * @throws {Error} Si el inventario no es suficiente, lanza un error con los detalles
 */
export async function createOrder(
  orderData: CreateOrderData,
  supabaseOverride?: any,
): Promise<OrderWithItems | null> {
  try {
    const supabase = supabaseOverride ?? getSupabaseEcommerce();
    if (!supabase) {
      console.error("[Orders] Supabase no configurado");
      return null;
    }

    const sanitizedItems = orderData.items.map(stripUntrustedComboSnapshotMetadata);
    const preparedItems = await prepareComboOrderItems(sanitizedItems, supabase);
    const pricedItems = await applyAuthoritativePricing(preparedItems, supabase);

    const recalculatedSubtotal = pricedItems.reduce(
      (sum, item) => sum + Number(item.total_price || 0),
      0,
    );
    // Envío e impuestos no tienen cálculo real todavía (fuera de alcance, otro
    // plan); se fuerzan a 0 en vez de confiar en lo que envíe el cliente.
    const shippingCost = 0;
    const taxAmount = 0;
    const discountAmount = Math.min(
      Math.max(Number(orderData.discount_amount || 0), 0),
      recalculatedSubtotal,
    );

    const normalizedOrderData: CreateOrderData = {
      ...orderData,
      items: pricedItems,
      subtotal: recalculatedSubtotal,
      shipping_cost: shippingCost,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: recalculatedSubtotal + shippingCost + taxAmount - discountAmount,
    };

    // Validar inventario antes de crear la orden
    const validationResult = await validateInventoryBeforeOrder(
      normalizedOrderData.items,
      supabase,
    );

    if (!validationResult.isValid) {
      // Crear mensaje de error detallado
      const errorMessages = validationResult.errors
        .map((err) => err.message)
        .join("\n");
      const error = new Error(
        `No hay suficiente stock disponible:\n${errorMessages}`,
      );
      // Agregar información de validación al error para acceso programático
      (error as any).validationResult = validationResult;
      throw error;
    }

    const resolvedStoreId = await resolveOrderStoreId(
      supabase,
      normalizedOrderData.items,
    );

    if (!resolvedStoreId) {
      console.error("[Orders] No se pudo resolver la tienda del pedido");
      return null;
    }

    // D27: header + items + the two D12 outbox notifications, all-or-nothing
    // behind ecommerce.create_order_with_notifications. Replaces the two
    // separate insert() calls this used to be (each its own HTTP request and
    // its own transaction -- see the migration's comment for the orphaned-
    // write hazard that created).
    const atomicWrite = await writeOrderAtomically({
      supabase,
      storeId: resolvedStoreId,
      idempotencyKey: orderData.idempotency_key,
      payloadFingerprint: orderData.payload_fingerprint,
      header: normalizedOrderData,
    });

    const order = atomicWrite.order;
    const orderItems = atomicWrite.items;

    // D28/D41: the four follow-ups below run every time -- including on a
    // replayed retry -- rather than being skipped when atomicWrite.replayed
    // is true. A FIRST attempt can die anywhere between the atomic RPC
    // succeeding and these finishing (e.g. the network drops right after);
    // the customer's natural retry reuses the same idempotency key and
    // reaches this same code with replayed:true, and skipping here on that
    // assumption ("they all landed then too") is exactly what used to leave
    // inventory never decremented and rows silently missing. Each follow-up
    // is instead idempotent PER ORDER on its own terms: the three writes
    // below use their natural key with ON CONFLICT DO NOTHING (order_item_id
    // for combo snapshots, (order_id, address_type) for the shipping
    // address, idempotency_key for the payment transaction -- see
    // 20260805000700_ecommerce_checkout_followup_convergence.sql), and
    // decrementInventoryAtomically's RPC claims a durable per-order marker
    // in the SAME transaction as the decrement, so a retry can never double
    // an insert or double-decrement stock, on a replay or a plain
    // double-submit alike.
    const comboSnapshotRows = orderItems
      .map((orderItem) => {
        const snapshot = getComboSnapshotFromMetadata(orderItem);
        if (!snapshot) return null;

        return {
          order_id: order.id,
          order_item_id: orderItem.id,
          combo_id: snapshot.id,
          combo_name: snapshot.name,
          combo_slug: snapshot.slug || null,
          ordered_quantity: snapshot.orderedQuantity,
          component_subtotal: snapshot.pricing.componentSubtotal,
          discount_type: snapshot.pricing.discountType,
          discount_value: snapshot.pricing.discountValue,
          discount_amount: snapshot.pricing.discountAmount,
          charged_unit_price: snapshot.chargedUnitPrice,
          charged_line_total: snapshot.chargedLineTotal,
          currency_code: snapshot.pricing.currencyCode,
          snapshot,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (comboSnapshotRows.length > 0) {
      // order_item_id is unique per row (order_combo_snapshots_order_item_key):
      // a retry recomputes the SAME snapshot rows from the SAME (replayed or
      // fresh) order items, so ignoring the conflict converges to exactly one
      // snapshot per combo order item instead of raising or duplicating.
      const snapshotResult = await withTimeout(
        supabase
          .from(ECOMMERCE_TABLES.orderComboSnapshots)
          .upsert(comboSnapshotRows, { onConflict: "order_item_id", ignoreDuplicates: true }),
        15000,
        "createOrderComboSnapshots",
      ) as { error: any };

      if (snapshotResult.error) {
        throw new Error(
          `No se pudo persistir order_combo_snapshots: ${snapshotResult.error.message || snapshotResult.error}`,
        );
      }
    }

    // (order_id, address_type) is unique (order_addresses_order_id_address_type_key):
    // this always writes the same 'shipping' type for a given order, so a
    // retry's insert is ignored instead of creating a second shipping row.
    await withTimeout(
      supabase.from(ECOMMERCE_TABLES.orderAddresses).upsert(
        buildShippingAddressRow(order.id, normalizedOrderData),
        { onConflict: "order_id,address_type", ignoreDuplicates: true },
      ),
      15000,
      "createOrderAddress",
    ).catch((addressError) => {
      console.warn(
        "[Orders] No se pudo persistir order_addresses:",
        addressError,
      );
    });

    await maybeInsertPaymentTransaction(
      supabase,
      order,
      normalizedOrderData.metadata,
      orderData.idempotency_key,
    );

    // Descontar inventario de forma ATÓMICA después de crear la orden.
    // Esta RPC es la autoridad sobre el stock (ver decrementInventoryAtomically):
    // si reporta faltantes, la orden recién creada no tiene respaldo real y
    // se elimina para no dejarla huérfana ni sobrevender.
    try {
      const { shortages } = await decrementInventoryAtomically(
        supabase,
        order.id,
        resolvedStoreId,
        orderItems,
      );

      if (shortages.length > 0) {
        await withTimeout(
          supabase.from(ECOMMERCE_TABLES.orders).delete().eq("id", order.id),
          15000,
          "deleteOrderAfterInventoryShortage",
        ).catch((deleteError) => {
          console.error(
            "[Orders] No se pudo eliminar la orden tras detectar faltante de stock:",
            deleteError,
          );
        });

        const validationResult = buildShortageValidationResult(
          shortages,
          orderItems,
        );
        const error = new Error(
          `No hay suficiente stock disponible:\n${validationResult.errors
            .map((err) => err.message)
            .join("\n")}`,
        );
        (error as any).validationResult = validationResult;
        throw error;
      }
    } catch (error: any) {
      if (error?.validationResult) {
        // Faltante real de stock: se relanza para que el catch externo de
        // createOrder lo propague (la API responde 409).
        throw error;
      }

      // Error de infraestructura al llamar la RPC (timeout, red, etc.), no
      // un faltante de stock. Comportamiento best-effort: registramos y NO
      // borramos la orden, se puede corregir el inventario manualmente.
      console.error(
        "[Orders] Error al descontar inventario después de crear orden:",
        error,
      );
      console.warn(
        "[Orders] ⚠️ La orden fue creada exitosamente, pero el inventario no se pudo descontar de forma confiable. Revisar manualmente.",
      );
    }

    return {
      ...applyPaymentCompatibility(order),
      items: orderItems,
    };
  } catch (error: any) {
    console.error("[Orders] Error inesperado al crear pedido:", error);
    if (
      error?.validationResult ||
      error instanceof StoreIdentityNotReadyError ||
      error instanceof CheckoutIdempotencyConflictError
    ) {
      // Motivos específicos que el llamador (placeCheckoutOrder) necesita
      // distinguir de un fallo genérico -- ver su catch.
      throw error;
    }
    return null;
  }
}

/**
 * Obtener un pedido por ID con sus items
 */
export async function getOrderById(
  orderId: string,
  storeId: string,
): Promise<OrderWithItems | null> {
  try {
    const supabase = getSupabaseEcommerce();
    if (!supabase) {
      console.error("[Orders] Supabase no configurado");
      return null;
    }

    const query = supabase
      .from(ECOMMERCE_TABLES.orders)
      .select("*")
      .eq("id", orderId)
      .eq("store_id", storeId);

    const orderResult = (await withTimeout(
      query.single(),
      15000,
      "getOrderById",
    )) as { data: any; error: any };

    if (orderResult.error || !orderResult.data) {
      console.error("[Orders] Error al obtener pedido:", orderResult.error);
      return null;
    }

    return await hydrateOrderGraph(supabase, orderResult.data);
  } catch (error: any) {
    console.error("[Orders] Error inesperado al obtener pedido:", error);
    return null;
  }
}

export interface OrderByNumberAuth {
  // Tienda resuelta server-side (host); nunca un valor provisto por el cliente.
  storeId: string;
  // Prueba de propiedad: order_number es secuencial y adivinable, así que
  // exigimos que coincida con el email del comprador antes de exponer PII.
  email: string;
}

/**
 * Obtener un pedido por número de pedido, restringido a la tienda actual y
 * al comprador (order_number por sí solo no autoriza el acceso).
 */
export async function getOrderByNumber(
  orderNumber: string,
  auth: OrderByNumberAuth,
  supabaseOverride?: any,
): Promise<OrderWithItems | null> {
  try {
    const supabase = supabaseOverride ?? getSupabaseEcommerce();
    if (!supabase) {
      console.error("[Orders] Supabase no configurado");
      return null;
    }

    const orderResult = (await withTimeout(
      supabase
        .from(ECOMMERCE_TABLES.orders)
        .select("*")
        .eq("order_number", orderNumber)
        .eq("store_id", auth.storeId)
        .eq("customer_email", auth.email)
        .single(),
      15000,
      "getOrderByNumber",
    )) as { data: any; error: any };

    if (orderResult.error || !orderResult.data) {
      console.error("[Orders] Error al obtener pedido:", orderResult.error);
      return null;
    }

    return await hydrateOrderGraph(supabase, orderResult.data);
  } catch (error: any) {
    console.error("[Orders] Error inesperado al obtener pedido:", error);
    return null;
  }
}

/**
 * Obtener un pedido por número de pedido para el usuario autenticado de la
 * sesión (pantalla de éxito de checkout tras refrescar). El caller debe pasar
 * el cliente con la sesión del usuario: RLS (orders_owner_or_admin_read) solo
 * expone filas con user_id = auth.uid(), así que no depende de un email en la
 * URL como el flujo de invitado.
 *
 * A propósito NO filtra por tienda: la confirmación tiene que resolver el
 * pedido recién hecho aunque la tienda del host no se pueda resolver en ese
 * request. El detalle del historial, que sí quiere ese recorte, usa
 * getStoreOrderByNumberForUser.
 */
export async function getOrderByNumberForUser(
  orderNumber: string,
  userId: string,
  supabaseOverride?: any,
): Promise<OrderWithItems | null> {
  return readOrderByNumberForUser({
    orderNumber,
    userId,
    storeId: null,
    supabaseOverride,
    operation: "getOrderByNumberForUser",
  });
}

// Dueño (user_id) y tienda del host (store_id) viajan juntos porque juntos
// definen qué pedido es visible en esta tienda: ninguno de los dos basta solo.
export interface StoreCustomerOrderAuth {
  storeId: string;
  userId: string;
}

/**
 * Obtener un pedido del historial de la tienda actual (D17). El store_id acota
 * la lectura a la tienda del host; la propiedad la sigue cargando user_id, así
 * que acertar el número de pedido de otra persona no lo expone.
 */
export async function getStoreOrderByNumberForUser(
  orderNumber: string,
  auth: StoreCustomerOrderAuth,
  supabaseOverride?: any,
): Promise<OrderWithItems | null> {
  return readOrderByNumberForUser({
    orderNumber,
    userId: auth.userId,
    storeId: auth.storeId,
    supabaseOverride,
    operation: "getStoreOrderByNumberForUser",
  });
}

async function readOrderByNumberForUser({
  orderNumber,
  userId,
  storeId,
  supabaseOverride,
  operation,
}: {
  orderNumber: string;
  userId: string;
  storeId: string | null;
  supabaseOverride?: any;
  operation: string;
}): Promise<OrderWithItems | null> {
  try {
    const supabase = supabaseOverride ?? getSupabaseEcommerce();
    if (!supabase) {
      console.error("[Orders] Supabase no configurado");
      return null;
    }

    let query = supabase
      .from(ECOMMERCE_TABLES.orders)
      .select("*")
      .eq("order_number", orderNumber)
      .eq("user_id", userId);

    if (storeId) {
      query = query.eq("store_id", storeId);
    }

    const orderResult = (await withTimeout(query.single(), 15000, operation)) as {
      data: any;
      error: any;
    };

    // PGRST116 (ninguna fila) es el resultado esperado cuando el pedido no es
    // del usuario de la sesión, no un error a registrar.
    if (orderResult.error && orderResult.error.code !== "PGRST116") {
      console.error("[Orders] Error al obtener pedido:", orderResult.error);
    }

    if (orderResult.error || !orderResult.data) {
      return null;
    }

    return await hydrateOrderGraph(supabase, orderResult.data);
  } catch (error: any) {
    console.error("[Orders] Error inesperado al obtener pedido:", error);
    return null;
  }
}

/**
 * Obtener lista de pedidos
 */
export interface GetOrdersParams {
  limit?: number;
  offset?: number;
  order_by?: "created_at" | "order_date" | "total_amount";
  order_direction?: "asc" | "desc";
  status?: Order["status"];
  payment_status?: Order["payment_status"];
  storeId: string;
}

export interface GetOrdersResult {
  orders: OrderWithItems[];
  total: number;
}

export async function getOrders(
  params: GetOrdersParams,
  supabaseOverride?: any,
): Promise<GetOrdersResult> {
  try {
    const supabase = supabaseOverride ?? getSupabaseEcommerce();
    if (!supabase) {
      console.error("[Orders] Supabase no configurado");
      return { orders: [], total: 0 };
    }

    const {
      limit = 100,
      offset = 0,
      order_by = "created_at",
      order_direction = "desc",
      status,
      payment_status,
      storeId,
    } = params;

    let query = supabase
      .from(ECOMMERCE_TABLES.orders)
      .select("*", { count: "exact" })
      // Acotar a la tienda confiable (defensa en profundidad server-side)
      .eq("store_id", storeId);

    // Filtrar por estado si se especifica
    if (status) {
      query = query.eq("status", status);
    }

    // Filtrar por estado de pago si se especifica
    if (payment_status) {
      query = query.eq("payment_status", payment_status);
    }

    // Ordenar
    query = query
      .order(order_by, { ascending: order_direction === "asc" })
      .range(offset, offset + limit - 1);

    const result = (await withTimeout(query, 15000, "getOrders")) as {
      data: any[] | null;
      error: any;
      count: number | null;
    };

    if (result.error) {
      console.error("[Orders] Error al obtener pedidos:", result.error);
      return { orders: [], total: 0 };
    }

    const orders = ((result.data || []) as Order[]).map((order) =>
      applyPaymentCompatibility(order),
    );

    const hydratedOrders = await Promise.all(
      orders.map(async (order) => hydrateOrderGraph(supabase, order)),
    );

    return {
      orders: hydratedOrders,
      total: result.count || 0,
    };
  } catch (error: any) {
    console.error("[Orders] Error inesperado al obtener pedidos:", error);
    return { orders: [], total: 0 };
  }
}

/**
 * Obtener pedidos por email del cliente
 */
export async function getOrdersByEmail(
  email: string,
  limit: number = 50,
  storeId?: string,
): Promise<OrderWithItems[]> {
  try {
    const supabase = getSupabaseEcommerce();
    if (!supabase) {
      console.error("[Orders] Supabase no configurado");
      return [];
    }

    let query = supabase
      .from(ECOMMERCE_TABLES.orders)
      .select("*")
      .eq("customer_email", email);
    if (storeId) {
      query = query.eq("store_id", storeId);
    }

    const ordersResult = (await withTimeout(
      query.order("order_date", { ascending: false }).limit(limit),
      15000,
      "getOrdersByEmail",
    )) as { data: any; error: any };

    if (ordersResult.error || !ordersResult.data) {
      console.error("[Orders] Error al obtener pedidos:", ordersResult.error);
      return [];
    }

    const orders = (ordersResult.data as Order[]).map((order) =>
      applyPaymentCompatibility(order),
    );

    const ordersWithItems: OrderWithItems[] = await Promise.all(
      orders.map(async (order) => hydrateOrderGraph(supabase, order)),
    );

    return ordersWithItems;
  } catch (error: any) {
    console.error("[Orders] Error inesperado al obtener pedidos:", error);
    return [];
  }
}

/**
 * Obtener el pedido más reciente de un usuario autenticado (prefill de
 * checkout). El caller debe pasar el cliente con la sesión del usuario: RLS
 * (orders_owner_or_admin_read) solo expone filas con user_id = auth.uid(), así
 * que un llamador anónimo o sin ese cliente no obtiene ningún pedido.
 */
export async function getMostRecentOrderByUserId(
  userId: string,
  supabaseOverride?: any,
): Promise<OrderWithItems | null> {
  try {
    const supabase = supabaseOverride ?? getSupabaseEcommerce();
    if (!supabase) {
      console.error("[Orders] Supabase no configurado");
      return null;
    }

    const orderResult = (await withTimeout(
      supabase
        .from(ECOMMERCE_TABLES.orders)
        .select("*")
        .eq("user_id", userId)
        .order("order_date", { ascending: false })
        .limit(1)
        .single(),
      15000,
      "getMostRecentOrderByUserId",
    )) as { data: any; error: any };

    // PGRST116 (ninguna fila) es el resultado esperado para un cliente sin
    // pedidos previos, no un error a registrar.
    if (orderResult.error && orderResult.error.code !== "PGRST116") {
      console.error("[Orders] Error al obtener el último pedido:", orderResult.error);
    }

    if (orderResult.error || !orderResult.data) {
      return null;
    }

    return await hydrateOrderGraph(supabase, applyPaymentCompatibility(orderResult.data));
  } catch (error: any) {
    console.error("[Orders] Error inesperado al obtener el último pedido:", error);
    return null;
  }
}

/**
 * Obtener el historial de pedidos de un usuario en la tienda actual (pantalla
 * "Mis pedidos" del storefront). El caller debe pasar el cliente con la sesión
 * del usuario: RLS (orders_owner_or_admin_read) solo expone filas con
 * user_id = auth.uid(), así que un llamador anónimo o sin ese cliente no
 * obtiene ningún pedido.
 *
 * store_id es obligatorio (D17): el cliente no sabe que detrás hay una
 * plataforma, así que su historial en esta tienda no puede mezclar compras
 * hechas en otra. Al ser obligatorio, ninguna pantalla puede olvidarlo.
 */
export async function getOrdersForUser(
  auth: StoreCustomerOrderAuth,
  supabaseOverride?: any,
): Promise<OrderWithItems[]> {
  try {
    const supabase = supabaseOverride ?? getSupabaseEcommerce();
    if (!supabase) {
      console.error("[Orders] Supabase no configurado");
      return [];
    }

    const ordersResult = (await withTimeout(
      supabase
        .from(ECOMMERCE_TABLES.orders)
        .select("*")
        .eq("user_id", auth.userId)
        .eq("store_id", auth.storeId)
        .order("order_date", { ascending: false })
        .limit(50),
      15000,
      "getOrdersForUser",
    )) as { data: any[] | null; error: any };

    if (ordersResult.error) {
      console.error("[Orders] Error al obtener los pedidos del usuario:", ordersResult.error);
      return [];
    }

    const orders = ((ordersResult.data || []) as Order[]).map((order) =>
      applyPaymentCompatibility(order),
    );

    return await Promise.all(orders.map((order) => hydrateOrderGraph(supabase, order)));
  } catch (error: any) {
    console.error("[Orders] Error inesperado al obtener los pedidos del usuario:", error);
    return [];
  }
}

/**
 * Actualizar el estado de un pedido (D29/D30): pasa por
 * ecommerce.transition_order_status (lib/orders/order-status-writer.ts), que
 * valida la transición contra el grafo congelado, revisa su propia
 * autorización/tenencia, y encola atómicamente el aviso de ciclo de vida
 * (D11) cuando el estado destino lo requiere.
 */
export async function updateOrderStatus(
  orderId: string,
  status: Order["status"],
  storeId: string,
  userId: string,
  supabaseOverride?: any,
): Promise<boolean> {
  try {
    const supabase = supabaseOverride ?? getSupabaseEcommerce();
    if (!supabase) {
      console.error("[Orders] Supabase no configurado");
      return false;
    }

    await transitionOrderStatusAtomically({
      supabase,
      orderId,
      storeId,
      userId,
      nextStatus: status,
    });

    return true;
  } catch (error: any) {
    console.error("[Orders] Error al actualizar estado del pedido:", error);
    return false;
  }
}
