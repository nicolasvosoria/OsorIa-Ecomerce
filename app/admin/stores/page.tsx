import { redirect } from "next/navigation";

import { authorizeSuperAdmin } from "@/lib/supabase/active-store";
import {
  EMPTY_TENANT_METRICS,
  getTenantMetrics,
  listTenants,
} from "@/lib/supabase/stores-admin-api";
import { TenantsTable, type TenantRow } from "./components/tenants-table";

export default async function AdminStoresPage() {
  const authorization = await authorizeSuperAdmin();
  if ("error" in authorization) {
    redirect("/admin");
  }

  const list = await loadTenants();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Tiendas</h1>
        <p className="text-sm text-muted-foreground">
          Consola global de tiendas: métricas rápidas y acceso directo a cada tienda
        </p>
      </header>

      <TenantsTable rows={list.state === "ready" ? list.tenants : []} state={list.state} />
    </div>
  );
}

type TenantsList =
  | { state: "ready"; tenants: TenantRow[] }
  | { state: "empty" }
  | { state: "error" };

async function loadTenants(): Promise<TenantsList> {
  try {
    const [tenants, metrics] = await Promise.all([listTenants(), getTenantMetrics()]);

    if (tenants.length === 0) {
      return { state: "empty" };
    }

    const tenantRows = tenants.map((tenant) => ({
      ...tenant,
      ...(metrics[tenant.id] ?? EMPTY_TENANT_METRICS),
    }));

    return { state: "ready", tenants: tenantRows };
  } catch (error) {
    console.error("[Admin Stores] Error al cargar tiendas:", error);
    return { state: "error" };
  }
}
