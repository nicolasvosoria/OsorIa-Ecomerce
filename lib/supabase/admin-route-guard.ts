import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminUser, type AdminAuthDenial } from "./admin-route-auth";
import {
  getSupabaseServiceClient,
  resolveTrustedStoreId,
} from "./admin-store";

type StoreAdminGrant = {
  supabase: any;
  storeId: string;
  userId: string;
};

export type StoreAdminAuthorization = StoreAdminGrant | AdminAuthDenial;

// Shared admin preamble for per-store routes: resolves the trusted target store
// from the request host and gates on per-store admin. `providedClient` lets a
// route reuse a client it already built (config routes on their own service
// client); omit it to build the standard ecommerce service client.
export async function authorizeStoreAdmin(
  request: NextRequest,
  providedClient?: any,
): Promise<StoreAdminAuthorization> {
  const supabase = providedClient ?? getSupabaseServiceClient();
  if (!supabase) {
    return { error: "Supabase no configurado", status: 500 };
  }

  const storeId = await resolveTrustedStoreId(request, supabase);
  const adminCheck = await requireAdminUser(request, supabase, storeId);
  if ("error" in adminCheck) {
    return adminCheck;
  }

  return { supabase, storeId, userId: adminCheck.userId };
}

export function adminErrorResponse(denial: AdminAuthDenial): NextResponse {
  const responseBody = denial.diagnostics
    ? { error: denial.error, diagnostics: denial.diagnostics }
    : { error: denial.error };

  return NextResponse.json(responseBody, { status: denial.status });
}
