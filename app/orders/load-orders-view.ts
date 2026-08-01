import { resolveStoreCustomerOrdersSession } from "@/lib/orders/store-customer-session";
import { getOrdersForUser, type Order, type OrderWithItems } from "@/lib/supabase/orders-api";

export interface OrdersListItem {
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  currencyCode: string;
  status: Order["status"];
  paymentStatus: Order["payment_status"];
  itemCount: number;
}

export type OrdersPageView =
  | { status: "guest" }
  | { status: "storeUnresolved" }
  | { status: "history"; orders: OrdersListItem[] };

// El invitado nunca dispara una lectura de pedidos (sesión primero, query
// después): si no hay cliente de sesión o no hay user_id, la página muestra
// el estado de invitado sin haber tocado la base de datos. Y si la tienda del
// host no se resuelve, la página lo dice en vez de fingir un historial vacío.
export async function loadOrdersPageView(): Promise<OrdersPageView> {
  const session = await resolveStoreCustomerOrdersSession();
  if (session.status !== "ready") {
    return session;
  }

  const orders = await getOrdersForUser(session.auth, session.ecommerce);
  return { status: "history", orders: orders.map(toOrdersListItem) };
}

function toOrdersListItem(order: OrderWithItems): OrdersListItem {
  return {
    orderNumber: order.order_number,
    orderDate: order.order_date,
    totalAmount: order.total_amount,
    currencyCode: order.currency_code,
    status: order.status,
    paymentStatus: order.payment_status,
    itemCount: order.items.length,
  };
}
