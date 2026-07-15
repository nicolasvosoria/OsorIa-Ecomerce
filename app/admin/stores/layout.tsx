import type React from "react";
import { redirect } from "next/navigation";

import { authorizeSuperAdmin } from "@/lib/supabase/active-store";

// The only access gate for the whole /admin/stores/** subtree: every route
// under it renders through this layout, so a non-super_admin is redirected
// before any tenant data is fetched, regardless of which page they hit.
export default async function StoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authorization = await authorizeSuperAdmin();
  if ("error" in authorization) {
    redirect("/admin");
  }

  return <>{children}</>;
}
