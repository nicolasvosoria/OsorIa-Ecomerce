import { getOrdersForUser, type Order, type OrderWithItems } from "@/lib/supabase/orders-api";
import { resolveServerAuthSession } from "@/lib/supabase/server-auth-session";

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
  | { authenticated: false }
  | { authenticated: true; orders: OrdersListItem[] };

// El invitado nunca dispara una lectura de pedidos (sesión primero, query
// después): si no hay cliente de sesión o no hay user_id, la página muestra
// el estado de invitado sin haber tocado la base de datos.
export async function loadOrdersPageView(): Promise<OrdersPageView> {
  const session = await resolveServerAuthSession();
  if (!session) {
    return { authenticated: false };
  }

  const orders = await getOrdersForUser(session.userId, session.client);
  return { authenticated: true, orders: orders.map(toOrdersListItem) };
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
