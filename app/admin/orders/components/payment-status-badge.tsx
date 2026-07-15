import { Badge } from "@/components/ui/badge";
import type { Order } from "@/lib/supabase/orders-api";
import { PAYMENT_STATUS_LABELS } from "@/lib/orders/order-status";

const PAYMENT_STATUS_VARIANTS: Record<
  Order["payment_status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  paid: "default",
  failed: "destructive",
  refunded: "outline",
};

export function PaymentStatusBadge({ status }: { status: Order["payment_status"] }) {
  return (
    <Badge variant={PAYMENT_STATUS_VARIANTS[status]}>
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
