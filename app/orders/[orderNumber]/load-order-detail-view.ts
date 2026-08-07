import { resolveStoreCustomerOrdersSession } from "@/lib/orders/store-customer-session";
import {
  getStoreOrderByNumberForUser,
  type Order,
  type OrderItem,
  type OrderWithItems,
} from "@/lib/supabase/orders-api";
import type { ShippingResolutionStatus } from "@/lib/shipping/resolver";

export interface OrderDetailLine {
  id: string;
  productName: string;
  variantTitle: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderDetailShipping {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  notes: string | null;
}

export interface OrderDetail {
  orderNumber: string;
  orderDate: string;
  status: Order["status"];
  paymentStatus: Order["payment_status"];
  paymentMethod: string | null;
  currencyCode: string;
  subtotal: number;
  shippingCost: number;
  // D23: nullable -- a legacy order placed before shipping_status existed.
  // shippingStatusLabelKeyForBuyer (lib/shipping/status-label.ts) renders a
  // null the same way it always rendered: the amount.
  shippingStatus: ShippingResolutionStatus | null;
  totalAmount: number;
  lines: OrderDetailLine[];
  shipping: OrderDetailShipping;
}

export type OrderDetailView =
  | { status: "guest" }
  | { status: "storeUnresolved" }
  | { status: "notFound" }
  | { status: "detail"; order: OrderDetail };

// "No es tuyo" y "no existe" salen por la misma puerta a propósito: distinguirlos
// convertiría la ruta en un oráculo para adivinar números de pedido ajenos. La
// propiedad la impone la consulta (user_id), no esta pantalla.
export async function loadOrderDetailView(orderNumber: string): Promise<OrderDetailView> {
  const session = await resolveStoreCustomerOrdersSession();
  if (session.status !== "ready") {
    return session;
  }

  const order = await getStoreOrderByNumberForUser(
    orderNumber,
    session.auth,
    session.ecommerce,
  );

  return order ? { status: "detail", order: toOrderDetail(order) } : { status: "notFound" };
}

function toOrderDetail(order: OrderWithItems): OrderDetail {
  return {
    orderNumber: order.order_number,
    orderDate: order.order_date,
    status: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method ?? null,
    currencyCode: order.currency_code,
    subtotal: order.subtotal,
    shippingCost: order.shipping_cost,
    shippingStatus: order.shipping_status ?? null,
    totalAmount: order.total_amount,
    lines: order.items.map(toOrderDetailLine),
    shipping: {
      address: order.shipping_address,
      city: order.shipping_city,
      postalCode: order.shipping_postal_code,
      country: order.shipping_country,
      notes: order.shipping_notes ?? null,
    },
  };
}

function toOrderDetailLine(item: OrderItem): OrderDetailLine {
  return {
    id: item.id,
    productName: item.product_name,
    variantTitle: item.variant_title ?? null,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
  };
}
