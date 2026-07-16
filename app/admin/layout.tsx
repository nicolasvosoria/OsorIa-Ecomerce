import type React from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { AdminAuthGuard } from "@/components/admin/admin-auth-guard";
import { AdminShell } from "@/components/admin/shell/admin-shell";
import { AdminActiveStoreProvider } from "@/contexts/admin-active-store-context";
import { FORCE_PASSWORD_CHANGE_PATH } from "@/lib/auth-return-intent";
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store";
import { SIDEBAR_PIN_COOKIE, isSidebarPinned } from "@/lib/admin/sidebar-pin-cookie";
import {
  listStoresForUser,
  requiresPasswordChange,
  type StoreSummary,
} from "@/lib/supabase/memberships-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin",
  description: "Panel de administración para gestionar estilos del sitio web",
};

type AdminStoreContext =
  | { forbidden: true }
  | { forbidden: false; stores: StoreSummary[]; activeStoreId: string };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await resolveAdminStoreContext();

  if (context.forbidden) {
    return (
      <AdminAuthGuard>
        <AdminStoreAccessDenied />
      </AdminAuthGuard>
    );
  }

  const cookieStore = await cookies();
  const sidebarPinned = isSidebarPinned(cookieStore.get(SIDEBAR_PIN_COOKIE)?.value);

  return (
    <AdminAuthGuard>
      <AdminActiveStoreProvider storeId={context.activeStoreId}>
        <AdminShell
          stores={context.stores}
          activeStoreId={context.activeStoreId}
          defaultPinned={sidebarPinned}
        >
          {children}
        </AdminShell>
      </AdminActiveStoreProvider>
    </AdminAuthGuard>
  );
}

// A minted owner (D21) still on the temporary password is forced to the change
// screen (FORCE_PASSWORD_CHANGE_PATH) before any admin use. That screen lives
// outside /admin, so this layout never wraps it — otherwise the guard would
// redirect it onto itself in a loop.
//
// A 403 means the session is authenticated but does not manage this host's store
// (D6: el host manda, sin fallback). Surfacing it as a clear message is D14 — a
// silent empty shell left such an admin with no explanation. A 500 is a broken
// config, not a denial, so it is logged and rendered as an empty shell whose
// client AdminAuthGuard resolves access; a 401 is handled by that same guard.
async function resolveAdminStoreContext(): Promise<AdminStoreContext> {
  const authorization = await authorizeActiveStoreAdmin();
  if ("error" in authorization) {
    if (authorization.status === 403) {
      return { forbidden: true };
    }

    if (authorization.status === 500) {
      console.error("[Admin Layout] No se pudo resolver la tienda activa:", authorization.error);
    }

    return { forbidden: false, stores: [], activeStoreId: "" };
  }

  if (await requiresPasswordChange(authorization.userId, authorization.supabase)) {
    redirect(FORCE_PASSWORD_CHANGE_PATH);
  }

  const stores = await listStoresForUser(authorization.userId);
  return { forbidden: false, stores, activeStoreId: authorization.storeId };
}

function AdminStoreAccessDenied() {
  return (
    <div className="editor-chrome flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">No administras esta tienda</CardTitle>
          <CardDescription>
            Tu cuenta no tiene permisos para gestionar la tienda de este dominio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            Si crees que esto es un error, contacta al propietario de la tienda o
            ingresa desde el dominio de una tienda que administres.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
