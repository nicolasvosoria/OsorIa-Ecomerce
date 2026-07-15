import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store";
import { getOrders, type OrderWithItems } from "@/lib/supabase/orders-api";
import { OrdersExportButton } from "./components/orders-export-button";
import { OrdersTable } from "./components/orders-table";

const DEFAULT_PAGE_SIZE = 20;

type OrdersPageProps = {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

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
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">Gestión de Pedidos</h1>
            <p className="text-sm text-muted-foreground">
              Revisa y gestiona los pedidos de tu tienda
            </p>
          </div>
        </div>
        <OrdersExportButton />
      </header>

      <OrdersTable
        rows={list.state === "ready" ? list.orders : []}
        state={list.state}
        pagination={{ page, pageSize, total: list.total }}
      />
    </div>
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
