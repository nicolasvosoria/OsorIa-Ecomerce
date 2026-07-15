import type React from "react";
import type { Metadata } from "next";

import { AdminAuthGuard } from "@/components/admin/admin-auth-guard";
import { AdminShell } from "@/components/admin/shell/admin-shell";
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store";
import { listStoresForUser, type StoreSummary } from "@/lib/supabase/memberships-api";

export const metadata: Metadata = {
  title: "Admin",
  description: "Panel de administración para gestionar estilos del sitio web",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { stores, activeStoreId } = await resolveAdminStoreContext();

  return (
    <AdminAuthGuard>
      <AdminShell stores={stores} activeStoreId={activeStoreId}>
        {children}
      </AdminShell>
    </AdminAuthGuard>
  );
}

// Denial here is not fatal: the client AdminAuthGuard redirects unauthorized
// users, so this only needs to avoid crashing the layout render. A 500 is not a
// denial though — without this log a broken Supabase config would be
// indistinguishable from an admin who simply has no stores.
async function resolveAdminStoreContext(): Promise<{
  stores: StoreSummary[];
  activeStoreId: string;
}> {
  const authorization = await authorizeActiveStoreAdmin();
  if ("error" in authorization) {
    if (authorization.status === 500) {
      console.error("[Admin Layout] No se pudo resolver la tienda activa:", authorization.error);
    }

    return { stores: [], activeStoreId: "" };
  }

  const stores = await listStoresForUser(authorization.userId);
  return { stores, activeStoreId: authorization.storeId };
}
