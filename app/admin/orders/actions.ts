"use server";

import { revalidatePath } from "next/cache";

import type { AdminActionResult } from "@/lib/admin/action-result";
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store";
import { updateOrderStatus, type Order } from "@/lib/supabase/orders-api";

export async function updateOrderStatusAction(
  orderId: string,
  status: Order["status"],
): Promise<AdminActionResult> {
  const authorization = await authorizeActiveStoreAdmin();
  if ("error" in authorization) {
    return { success: false, error: authorization.error };
  }

  const { supabase, storeId } = authorization;
  const updated = await updateOrderStatus(orderId, status, storeId, supabase);
  if (!updated) {
    return { success: false, error: "No se pudo actualizar el estado del pedido" };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}
