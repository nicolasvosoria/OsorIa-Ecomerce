import { getSupabaseEcommerce } from "./client";
import { getStoreId } from "@/lib/utils/store";

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
  address_line_1?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  created_at?: string;
  updated_at?: string;
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

export interface CreateOrderData {
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
      .from("payment_transactions")
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
  metadata?: Record<string, any>,
): Promise<void> {
  const providerPayload = extractProviderPaymentPayload(metadata);
  if (!providerPayload) {
    return;
  }

  await withTimeout(
    supabase.from("payment_transactions").insert({
      id: generateUuid(),
      order_id: order.id,
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
      metadata: providerPayload,
    }),
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
      .from("order_items")
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
      .from("order_addresses")
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

  return (addressesResult.data || []) as OrderAddress[];
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

async function resolveOrderStoreId(
  supabase: any,
  items: CreateOrderData["items"],
): Promise<string | null> {
  for (const item of items) {
    if (item.product_id) {
      const productStoreResult = (await withTimeout(
        supabase
          .from("store_items")
          .select("store_id")
          .eq("id", item.product_id)
          .single(),
        10000,
        "resolveStoreFromProduct",
      )) as { data: { store_id?: string | null } | null; error: any };

      if (!productStoreResult.error && productStoreResult.data?.store_id) {
        return productStoreResult.data.store_id;
      }
    }

    if (item.variant_id) {
      const variantStoreItemResult = (await withTimeout(
        supabase
          .from("item_variants")
          .select("store_item_id")
          .eq("id", item.variant_id)
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
            .from("store_items")
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
  }

  const contextStoreId = await getStoreId();
  if (contextStoreId) {
    return contextStoreId;
  }

  const defaultStoreResult = (await withTimeout(
    supabase.from("stores").select("id").eq("is_default", true).limit(1),
    10000,
    "resolveDefaultStore",
  )) as { data: Array<{ id: string }> | null; error: any };

  if (defaultStoreResult.error) {
    return null;
  }

  return defaultStoreResult.data?.[0]?.id || null;
}

/**
 * Validar inventario antes de crear una orden
 * Verifica que todos los productos tengan suficiente stock disponible
 */
async function validateInventoryBeforeOrder(
  items: CreateOrderData["items"],
): Promise<InventoryValidationResult> {
  const result: InventoryValidationResult = {
    isValid: true,
    errors: [],
  };

  try {
    const supabase = getSupabaseEcommerce();
    if (!supabase) {
      // Si no hay supabase, permitir la orden (para productos externos como Shopify)
      return result;
    }

    // Validar cada item
    for (const item of items) {
      try {
        // Si hay variant_id, validar inventario de la variante
        if (item.variant_id) {
          const variantResult = (await withTimeout(
            supabase
              .from("item_variants")
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
              .from("store_items")
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
 * Actualizar el inventario después de crear una orden
 * Resta las cantidades vendidas del stock disponible
 */
async function updateInventoryAfterOrder(items: OrderItem[]): Promise<void> {
  try {
    const supabase = getSupabaseEcommerce();
    if (!supabase) {
      console.error(
        "[Orders] Supabase no configurado para actualizar inventario",
      );
      return;
    }

    // Procesar cada item de la orden
    for (const item of items) {
      try {
        // Si hay variant_id, actualizar inventario de la variante
        if (item.variant_id) {
          // Obtener la variante actual
          const variantResult = (await withTimeout(
            supabase
              .from("item_variants")
              .select("track_inventory, inventory_quantity")
              .eq("id", item.variant_id)
              .single(),
            10000,
            "getVariantForInventory",
          )) as { data: any; error: any };

          if (variantResult.error || !variantResult.data) {
            console.warn(
              `[Orders] No se pudo obtener variante ${item.variant_id} para actualizar inventario`,
            );
            continue;
          }

          const variant = variantResult.data;

          // Solo actualizar si track_inventory es true
          if (variant.track_inventory) {
            const currentQuantity = variant.inventory_quantity || 0;
            const newQuantity = Math.max(0, currentQuantity - item.quantity);

            const updateResult = (await withTimeout(
              supabase
                .from("item_variants")
                .update({ inventory_quantity: newQuantity })
                .eq("id", item.variant_id),
              10000,
              "updateVariantInventory",
            )) as { error: any };

            if (updateResult.error) {
              console.error(
                `[Orders] Error al actualizar inventario de variante ${item.variant_id}:`,
                updateResult.error,
              );
            } else {
              console.log(
                `[Orders] Inventario de variante ${item.variant_id} actualizado: ${currentQuantity} -> ${newQuantity}`,
              );
            }
          }
        }
        // Si hay product_id pero no variant_id, actualizar inventario del producto
        else if (item.product_id) {
          // Obtener el producto actual
          const productResult = (await withTimeout(
            supabase
              .from("store_items")
              .select("track_inventory, inventory_quantity")
              .eq("id", item.product_id)
              .single(),
            10000,
            "getProductForInventory",
          )) as { data: any; error: any };

          if (productResult.error || !productResult.data) {
            console.warn(
              `[Orders] No se pudo obtener producto ${item.product_id} para actualizar inventario`,
            );
            continue;
          }

          const product = productResult.data;

          // Solo actualizar si track_inventory es true
          if (product.track_inventory) {
            const currentQuantity = product.inventory_quantity || 0;
            const newQuantity = Math.max(0, currentQuantity - item.quantity);

            const updateResult = (await withTimeout(
              supabase
                .from("store_items")
                .update({ inventory_quantity: newQuantity })
                .eq("id", item.product_id),
              10000,
              "updateProductInventory",
            )) as { error: any };

            if (updateResult.error) {
              console.error(
                `[Orders] Error al actualizar inventario de producto ${item.product_id}:`,
                updateResult.error,
              );
            } else {
              console.log(
                `[Orders] Inventario de producto ${item.product_id} actualizado: ${currentQuantity} -> ${newQuantity}`,
              );
            }
          }
        }
      } catch (error: any) {
        // Continuar con el siguiente item si hay un error
        console.error(
          `[Orders] Error al procesar inventario para item ${item.id}:`,
          error,
        );
      }
    }
  } catch (error: any) {
    // No lanzar error, solo registrar para no interrumpir el flujo de creación de orden
    console.error("[Orders] Error inesperado al actualizar inventario:", error);
  }
}

/**
 * Crear un nuevo pedido con sus items
 * @throws {Error} Si el inventario no es suficiente, lanza un error con los detalles
 */
export async function createOrder(
  orderData: CreateOrderData,
): Promise<OrderWithItems | null> {
  try {
    const supabase = getSupabaseEcommerce();
    if (!supabase) {
      console.error("[Orders] Supabase no configurado");
      return null;
    }

    // Validar inventario antes de crear la orden
    const validationResult = await validateInventoryBeforeOrder(
      orderData.items,
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
      orderData.items,
    );

    // Crear el pedido
    const orderResult = (await withTimeout(
      supabase
        .from("orders")
        .insert({
          store_id: resolvedStoreId,
          customer_type: orderData.customer_type,
          user_id: orderData.user_id || null,
          customer_email: orderData.customer_email,
          customer_first_name: orderData.customer_first_name,
          customer_last_name: orderData.customer_last_name,
          customer_phone: orderData.customer_phone || null,
          shipping_address: orderData.shipping_address,
          shipping_city: orderData.shipping_city,
          shipping_postal_code: orderData.shipping_postal_code,
          shipping_country: orderData.shipping_country || "Colombia",
          shipping_notes: orderData.shipping_notes || null,
          payment_method: orderData.payment_method || null,
          payment_status: orderData.payment_status || "pending",
          payment_reference: orderData.payment_reference || null,
          subtotal: orderData.subtotal,
          shipping_cost: orderData.shipping_cost || 0,
          tax_amount: orderData.tax_amount || 0,
          discount_amount: orderData.discount_amount || 0,
          total_amount: orderData.total_amount,
          currency_code: orderData.currency_code || "COP",
          notes: orderData.notes || null,
          metadata: orderData.metadata || {},
        })
        .select()
        .single(),
      20000,
      "createOrder",
    )) as { data: any; error: any };

    if (orderResult.error) {
      console.error("[Orders] Error al crear pedido:", orderResult.error);
      return null;
    }

    const order = orderResult.data as Order;

    // Crear los items del pedido
    const itemsToInsert = orderData.items.map((item) => ({
      id: generateUuid(),
      order_id: order.id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      product_sku: item.product_sku || null,
      variant_id: item.variant_id || null,
      variant_title: item.variant_title || null,
      unit_price: item.unit_price,
      quantity: item.quantity,
      total_price: item.total_price,
      currency_code: item.currency_code || "COP",
      product_image_url: item.product_image_url || null,
      product_slug: item.product_slug || null,
      selected_options: item.selected_options || {},
      metadata: item.metadata || {},
    }));

    const itemsResult = (await withTimeout(
      supabase.from("order_items").insert(itemsToInsert).select(),
      20000,
      "createOrderItems",
    )) as { data: any; error: any };

    if (itemsResult.error) {
      console.error(
        "[Orders] Error al crear items del pedido:",
        itemsResult.error,
      );
      // El pedido ya fue creado, pero los items fallaron
      // Podríamos eliminar el pedido o dejarlo sin items
      return { ...order, items: [] } as OrderWithItems;
    }

    const orderItems = itemsResult.data as OrderItem[];

    await withTimeout(
      supabase.from("order_addresses").insert({
        id: generateUuid(),
        order_id: order.id,
        address_type: "shipping",
        address_line_1: orderData.shipping_address,
        city: orderData.shipping_city,
        postal_code: orderData.shipping_postal_code,
        country: orderData.shipping_country || "Colombia",
      }),
      15000,
      "createOrderAddress",
    ).catch((addressError) => {
      console.warn(
        "[Orders] No se pudo persistir order_addresses:",
        addressError,
      );
    });

    await maybeInsertPaymentTransaction(supabase, order, orderData.metadata);

    // Actualizar inventario después de crear la orden exitosamente
    // Ejecutamos de forma síncrona para asegurar consistencia de datos
    try {
      await updateInventoryAfterOrder(orderItems);
    } catch (error: any) {
      // Si falla la actualización del inventario, registramos el error pero no fallamos la orden
      // Esto permite que la orden se cree exitosamente y se pueda corregir el inventario manualmente después
      console.error(
        "[Orders] Error al actualizar inventario después de crear orden:",
        error,
      );
      console.warn(
        "[Orders] ⚠️ La orden fue creada exitosamente, pero el inventario no se actualizó. Revisar manualmente.",
      );
    }

    return {
      ...applyPaymentCompatibility(order),
      items: orderItems,
    };
  } catch (error: any) {
    console.error("[Orders] Error inesperado al crear pedido:", error);
    return null;
  }
}

/**
 * Obtener un pedido por ID con sus items
 */
export async function getOrderById(
  orderId: string,
): Promise<OrderWithItems | null> {
  try {
    const supabase = getSupabaseEcommerce();
    if (!supabase) {
      console.error("[Orders] Supabase no configurado");
      return null;
    }

    const orderResult = (await withTimeout(
      supabase.from("orders").select("*").eq("id", orderId).single(),
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

/**
 * Obtener un pedido por número de pedido
 */
export async function getOrderByNumber(
  orderNumber: string,
): Promise<OrderWithItems | null> {
  try {
    const supabase = getSupabaseEcommerce();
    if (!supabase) {
      console.error("[Orders] Supabase no configurado");
      return null;
    }

    const orderResult = (await withTimeout(
      supabase
        .from("orders")
        .select("*")
        .eq("order_number", orderNumber)
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
 * Obtener lista de pedidos
 */
export interface GetOrdersParams {
  limit?: number;
  offset?: number;
  order_by?: "created_at" | "order_date" | "total_amount";
  order_direction?: "asc" | "desc";
  status?: Order["status"];
  payment_status?: Order["payment_status"];
}

export interface GetOrdersResult {
  orders: Order[];
  total: number;
}

export async function getOrders(
  params: GetOrdersParams = {},
): Promise<GetOrdersResult> {
  try {
    const supabase = getSupabaseEcommerce();
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
    } = params;

    let query = supabase.from("orders").select("*", { count: "exact" });

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

    return {
      orders: ((result.data || []) as Order[]).map((order) =>
        applyPaymentCompatibility(order),
      ),
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
): Promise<OrderWithItems[]> {
  try {
    const supabase = getSupabaseEcommerce();
    if (!supabase) {
      console.error("[Orders] Supabase no configurado");
      return [];
    }

    const ordersResult = (await withTimeout(
      supabase
        .from("orders")
        .select("*")
        .eq("customer_email", email)
        .order("order_date", { ascending: false })
        .limit(limit),
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
 * Actualizar el estado de un pedido
 */
export async function updateOrderStatus(
  orderId: string,
  status: Order["status"],
  additionalData?: {
    payment_status?: Order["payment_status"];
    shipped_at?: string;
    delivered_at?: string;
    cancelled_at?: string;
  },
): Promise<boolean> {
  try {
    const supabase = getSupabaseEcommerce();
    if (!supabase) {
      console.error("[Orders] Supabase no configurado");
      return false;
    }

    const updateData: any = { status };

    if (status === "confirmed" && !additionalData?.shipped_at) {
      updateData.confirmed_at = new Date().toISOString();
    }
    if (status === "shipped") {
      updateData.shipped_at =
        additionalData?.shipped_at || new Date().toISOString();
    }
    if (status === "delivered") {
      updateData.delivered_at =
        additionalData?.delivered_at || new Date().toISOString();
    }
    if (status === "cancelled") {
      updateData.cancelled_at =
        additionalData?.cancelled_at || new Date().toISOString();
    }

    if (additionalData?.payment_status) {
      updateData.payment_status = additionalData.payment_status;
    }

    const result = (await withTimeout(
      supabase.from("orders").update(updateData).eq("id", orderId),
      10000,
      "updateOrderStatus",
    )) as { error: any };

    if (result.error) {
      console.error(
        "[Orders] Error al actualizar estado del pedido:",
        result.error,
      );
      return false;
    }

    return true;
  } catch (error: any) {
    console.error("[Orders] Error inesperado al actualizar estado:", error);
    return false;
  }
}
