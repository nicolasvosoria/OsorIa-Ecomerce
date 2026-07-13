import type { GuestCustomerData } from "@/components/checkout/guest-checkout-form";
import { getOrderByNumber, type OrderByNumberAuth } from "@/lib/supabase/orders-api";

export interface SuccessPageFallbackOrder {
  orderNumber: string | null;
  customerData: GuestCustomerData | null;
}

function mapOrderToGuestCustomerData(
  order: Awaited<ReturnType<typeof getOrderByNumber>>,
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

export async function loadSuccessPageFallbackOrder(
  orderNumber: string | null | undefined,
  auth: OrderByNumberAuth | null,
): Promise<SuccessPageFallbackOrder> {
  if (!orderNumber) {
    return {
      orderNumber: null,
      customerData: null,
    };
  }

  if (!auth) {
    return {
      orderNumber,
      customerData: null,
    };
  }

  const order = await getOrderByNumber(orderNumber, auth);

  return {
    orderNumber: order?.order_number || orderNumber,
    customerData: mapOrderToGuestCustomerData(order),
  };
}
