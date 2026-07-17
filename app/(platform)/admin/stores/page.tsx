import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { AdminPageContainer } from "@/components/admin/page-container";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { authorizeSuperAdmin } from "@/lib/supabase/active-store";
import { listStoresForUser } from "@/lib/supabase/memberships-api";
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

  // "Entrar a tienda" exige membresía gestora incluso al super_admin (D3): la
  // tabla recibe sus tiendas gestionadas y en el resto ofrece "Obtener acceso".
  const [list, managedStores] = await Promise.all([
    loadTenants(),
    listStoresForUser(authorization.userId),
  ]);

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Tiendas"
        subtitle="Consola global de tiendas: métricas rápidas y acceso directo a cada tienda"
        actions={
          <Button asChild>
            <Link href="/admin/stores/create">
              <Plus className="mr-2 h-4 w-4" />
              Crear tienda
            </Link>
          </Button>
        }
      />

      <TenantsTable
        rows={list.state === "ready" ? list.tenants : []}
        state={list.state}
        managedStoreIds={managedStores.map((store) => store.id)}
      />
    </AdminPageContainer>
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
