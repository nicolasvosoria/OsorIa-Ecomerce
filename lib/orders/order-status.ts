import type { Order } from "@/lib/supabase/orders-api";

export const ORDER_STATUSES: Order["status"][] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
];

export const ORDER_STATUS_LABELS: Record<Order["status"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  processing: "Procesando",
  shipped: "Enviado",
  delivered: "Entregado",
  returned: "Devuelto",
  cancelled: "Cancelado",
};

export const PAYMENT_STATUS_LABELS: Record<Order["payment_status"], string> = {
  pending: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  refunded: "Reembolsado",
};
