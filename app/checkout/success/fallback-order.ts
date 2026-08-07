import type { GuestCustomerData } from "@/components/checkout/guest-checkout-form";
import {
  getOrderByNumber,
  getOrderByNumberForUser,
  type OrderByNumberAuth,
  type OrderWithItems,
} from "@/lib/supabase/orders-api";
import {
  ecommerceForSession,
  resolveServerAuthSession,
} from "@/lib/supabase/server-auth-session";
import { getServiceEcommerceClient } from "@/lib/supabase/service-client";
import type { ShippingResolutionStatus } from "@/lib/shipping/schemas";

export interface SuccessPageOrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currencyCode: string;
}

export interface SuccessPageOrderSummary {
  items: SuccessPageOrderItem[];
  subtotal: number;
  shippingCost: number;
  // D23: nullable -- a legacy order placed before this column existed. See
  // shippingStatusLabelKeyForBuyer (lib/shipping/status-label.ts) for how a
  // null renders (the amount, same as it always did).
  shippingStatus: ShippingResolutionStatus | null;
  totalAmount: number;
  currencyCode: string;
  paymentMethod: string | null;
}

export interface SuccessPageFallbackOrder {
  orderNumber: string | null;
  customerData: GuestCustomerData | null;
  orderSummary: SuccessPageOrderSummary | null;
}

export async function loadSuccessPageFallbackOrder(
  orderNumber: string | null | undefined,
  guestAuth: OrderByNumberAuth | null,
): Promise<SuccessPageFallbackOrder> {
  if (!orderNumber) {
    return { orderNumber: null, customerData: null, orderSummary: null };
  }

  const order =
    (await loadOrderForSessionUser(orderNumber)) ??
    (await loadOrderForGuest(orderNumber, guestAuth));

  return {
    orderNumber: order?.order_number || orderNumber,
    customerData: mapOrderToGuestCustomerData(order),
    orderSummary: mapOrderToOrderSummary(order),
  };
}

// Un cliente logueado consulta su propio pedido con el cliente de su sesión:
// RLS (orders_owner_or_admin_read) lo acota a user_id = auth.uid(), así que
// esta rama no depende de un email en la URL como la de invitado.
async function loadOrderForSessionUser(
  orderNumber: string,
): Promise<OrderWithItems | null> {
  const session = await resolveServerAuthSession();
  if (!session) {
    return null;
  }

  return getOrderByNumberForUser(
    orderNumber,
    session.userId,
    ecommerceForSession(session.client),
  );
}

// Un invitado no tiene sesión: el filtro store_id + email es toda la prueba de
// propiedad (order_number es adivinable). El service client bypasea RLS, así
// que esos dos filtros cargan toda la seguridad de esta lectura.
async function loadOrderForGuest(
  orderNumber: string,
  guestAuth: OrderByNumberAuth | null,
): Promise<OrderWithItems | null> {
  if (!guestAuth) {
    return null;
  }

  const serviceClient = getServiceEcommerceClient();
  if (!serviceClient) {
    return null;
  }

  return getOrderByNumber(orderNumber, guestAuth, serviceClient);
}

function mapOrderToGuestCustomerData(
  order: OrderWithItems | null,
): GuestCustomerData | null {
  if (!order) {
    return null;
  }

  return {
    firstName: order.customer_first_name || "",
    lastName: order.customer_last_name || "",
    email: order.customer_email || "",
    phone: order.customer_phone || "",
    address: order.shipping_address || "",
    city: order.shipping_city || "",
    postalCode: order.shipping_postal_code || "",
    country: order.shipping_country || "Colombia",
    notes: order.shipping_notes || "",
  };
}

function mapOrderToOrderSummary(
  order: OrderWithItems | null,
): SuccessPageOrderSummary | null {
  if (!order) {
    return null;
  }

  return {
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      currencyCode: item.currency_code,
    })),
    subtotal: order.subtotal,
    shippingCost: order.shipping_cost,
    shippingStatus: order.shipping_status ?? null,
    totalAmount: order.total_amount,
    currencyCode: order.currency_code,
    paymentMethod: order.payment_method ?? null,
  };
}
