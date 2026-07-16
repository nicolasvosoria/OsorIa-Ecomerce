"use client";

import { Badge } from "@/components/ui/badge";
import { DataTable, type Column, type DataTableState } from "@/components/admin/data-table";
import type { TenantMetrics, TenantSummary } from "@/lib/supabase/stores-admin-api";
import { formatPrice } from "@/lib/commerce/utils";
import { EnterStoreButton } from "./enter-store-button";
import { PublishStoreButton } from "./publish-store-button";

export type TenantRow = TenantSummary & TenantMetrics;

type TenantsTableProps = {
  rows: TenantRow[];
  state: DataTableState;
};

export function TenantsTable({ rows, state }: TenantsTableProps) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      state={state}
      emptyMessage="Aún no hay tiendas registradas"
      errorMessage="No se pudieron cargar las tiendas"
    />
  );
}

const columns: Column<TenantRow>[] = [
  {
    key: "store",
    header: "Tienda",
    cell: (tenant) => (
      <div>
        <div className="font-medium">{tenant.store_name}</div>
        <div className="text-sm text-muted-foreground">{tenant.subdomain}</div>
      </div>
    ),
  },
  {
    key: "status",
    header: "Estado",
    cell: (tenant) => (
      <div className="flex flex-wrap gap-1">
        <Badge variant={tenant.is_active ? "default" : "secondary"}>
          {tenant.is_active ? "Activa" : "Inactiva"}
        </Badge>
        <Badge variant={tenant.is_public ? "outline" : "secondary"}>
          {tenant.is_public ? "Pública" : "Privada"}
        </Badge>
      </div>
    ),
  },
  {
    key: "products",
    header: "Productos",
    cell: (tenant) => <span className="font-medium">{tenant.productCount}</span>,
  },
  {
    key: "orders",
    header: "Pedidos",
    cell: (tenant) => <span className="font-medium">{tenant.orderCount}</span>,
  },
  {
    key: "revenue",
    header: "Ingresos",
    cell: (tenant) => <span className="font-medium">{formatPrice(tenant.revenue)}</span>,
  },
  {
    key: "actions",
    header: <span className="sr-only">Acciones</span>,
    className: "text-right",
    cell: (tenant) => (
      <div className="flex justify-end gap-1.5">
        <PublishStoreButton
          storeId={tenant.id}
          storeName={tenant.store_name}
          isPublic={tenant.is_public}
        />
        <EnterStoreButton storeId={tenant.id} storeName={tenant.store_name} />
      </div>
    ),
  },
];
