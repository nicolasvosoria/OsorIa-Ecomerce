"use client";

import Link from "next/link";

import { DataTable, type Column, type DataTableState } from "@/components/admin/data-table";
import type { TenantMetrics, TenantSummary } from "@/lib/supabase/stores-admin-api";
import { formatPrice } from "@/lib/commerce/utils";
import { EnterStoreButton } from "./enter-store-button";
import { PublishStoreButton } from "./publish-store-button";
import { SupportAccessButton } from "./support-access-button";
import { TenantStatusBadges } from "./tenant-status-badges";

export type TenantRow = TenantSummary & TenantMetrics;

type TenantsTableProps = {
  rows: TenantRow[];
  state: DataTableState;
  managedStoreIds: string[];
};

export function TenantsTable({ rows, state, managedStoreIds }: TenantsTableProps) {
  return (
    <DataTable
      columns={buildColumns(managedStoreIds)}
      rows={rows}
      state={state}
      emptyMessage="Aún no hay tiendas registradas"
      errorMessage="No se pudieron cargar las tiendas"
    />
  );
}

function buildColumns(managedStoreIds: string[]): Column<TenantRow>[] {
  return [
    {
      key: "store",
      header: "Tienda",
      cell: (tenant) => (
        <Link href={`/admin/stores/${tenant.id}`} className="block hover:underline">
          <div className="font-medium">{tenant.store_name}</div>
          <div className="text-sm text-muted-foreground">{tenant.subdomain}</div>
        </Link>
      ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (tenant) => (
        <TenantStatusBadges isActive={tenant.is_active} isPublic={tenant.is_public} />
      ),
    },
    {
      key: "createdAt",
      header: "Creación",
      cell: (tenant) => <span className="text-sm">{formatTenantDate(tenant.created_at)}</span>,
    },
    {
      key: "currency",
      header: "Moneda",
      cell: (tenant) => <span className="text-sm">{tenant.currency_code}</span>,
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
      cell: (tenant) => (
        <span className="font-medium">{formatPrice(tenant.revenue, tenant.currency_code)}</span>
      ),
    },
    {
      key: "lastOrder",
      header: "Último pedido",
      cell: (tenant) => <span className="text-sm">{formatTenantDate(tenant.lastOrderAt)}</span>,
    },
    {
      key: "members",
      header: "Miembros",
      cell: (tenant) => <span className="font-medium">{tenant.memberCount}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Acciones</span>,
      className: "text-right",
      // Entrar exige membresía gestora incluso al super_admin; el no-miembro ve
      // el paso previo explícito de obtenerla (D2/D3), nunca un atajo directo.
      cell: (tenant) => (
        <div className="flex justify-end gap-1.5">
          <PublishStoreButton
            storeId={tenant.id}
            storeName={tenant.store_name}
            isPublic={tenant.is_public}
          />
          {managedStoreIds.includes(tenant.id) ? (
            <EnterStoreButton
              storeId={tenant.id}
              storeName={tenant.store_name}
              subdomain={tenant.subdomain}
            />
          ) : (
            <SupportAccessButton storeId={tenant.id} storeName={tenant.store_name} />
          )}
        </div>
      ),
    },
  ];
}

function formatTenantDate(value: string | null): string {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
