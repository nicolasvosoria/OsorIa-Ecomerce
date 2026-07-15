"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Order } from "@/lib/supabase/orders-api";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/orders/order-status";
import { updateOrderStatusAction } from "../actions";

export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: Order["status"];
}) {
  const [current, setCurrent] = useState(status);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    const nextStatus = value as Order["status"];
    const previousStatus = current;
    setCurrent(nextStatus);

    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, nextStatus);
      if (!result.success) {
        setCurrent(previousStatus);
        toast.error(result.error ?? "No se pudo actualizar el estado del pedido");
        return;
      }

      toast.success("Estado del pedido actualizado");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={current} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="editor-chrome">
          {ORDER_STATUSES.map((orderStatus) => (
            <SelectItem key={orderStatus} value={orderStatus}>
              {ORDER_STATUS_LABELS[orderStatus]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
