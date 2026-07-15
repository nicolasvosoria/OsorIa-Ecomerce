import { redirect } from "next/navigation";

import { AdminPageContainer } from "@/components/admin/page-container";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DEFAULT_PAGE_SIZE, parsePositiveInt } from "@/lib/admin/pagination";
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store";
import { getOrders, type OrderWithItems } from "@/lib/supabase/orders-api";
import { OrdersExportButton } from "./components/orders-export-button";
import { OrdersTable } from "./components/orders-table";

type OrdersPageProps = {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const authorization = await authorizeActiveStoreAdmin();
  if ("error" in authorization) {
    redirect("/");
  }

  const { page: pageParam, pageSize: pageSizeParam } = await searchParams;
  const page = parsePositiveInt(pageParam, 1);
  const pageSize = parsePositiveInt(pageSizeParam, DEFAULT_PAGE_SIZE);

  const list = await loadOrders(authorization.storeId, page, pageSize);

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Gestión de Pedidos"
        subtitle="Revisa y gestiona los pedidos de tu tienda"
        actions={<OrdersExportButton />}
      />

      <OrdersTable
        rows={list.state === "ready" ? list.orders : []}
        state={list.state}
        pagination={{ page, pageSize, total: list.total }}
      />
    </AdminPageContainer>
  );
}

type OrdersList =
  | { state: "ready"; orders: OrderWithItems[]; total: number }
  | { state: "empty"; total: number }
  | { state: "error"; total: number };

async function loadOrders(
  storeId: string,
  page: number,
  pageSize: number,
): Promise<OrdersList> {
  try {
    const { orders, total } = await getOrders({
      storeId,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order_by: "created_at",
      order_direction: "desc",
    });

    if (orders.length === 0) {
      return { state: "empty", total };
    }

    return { state: "ready", orders, total };
  } catch (error) {
    console.error("[Admin Orders] Error al cargar pedidos:", error);
    return { state: "error", total: 0 };
  }
}
