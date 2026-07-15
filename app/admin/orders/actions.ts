"use server";

import { revalidatePath } from "next/cache";

import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store";
import { updateOrderStatus, type Order } from "@/lib/supabase/orders-api";

export async function updateOrderStatusAction(
  orderId: string,
  status: Order["status"],
): Promise<void> {
  const authorization = await authorizeActiveStoreAdmin();
  if ("error" in authorization) {
    throw new Error(authorization.error);
  }

  const { supabase, storeId } = authorization;
  const updated = await updateOrderStatus(orderId, status, storeId, supabase);
  if (!updated) {
    throw new Error("No se pudo actualizar el estado del pedido");
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}
