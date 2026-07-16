import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACTIVE_STORE_COOKIE } from "@/lib/admin/active-store-cookie";
import { resolveActiveStoreId } from "./active-store";
import { authorizeAnyCandidate, type AdminAuthDenial } from "./admin-route-auth";
import { getSupabaseServiceClient } from "./admin-store";

type StoreAdminGrant = {
  supabase: any;
  storeId: string;
  userId: string;
};

export type StoreAdminAuthorization = StoreAdminGrant | AdminAuthDenial;

// Shared admin preamble for per-store routes: grants to the first authenticated
// identity (cookie session or preview bearer) that can manage its active store,
// resolved with the same rule as the RSC gate. Each identity is resolved on its
// own, so a preview bearer never inherits the session's store. `providedClient`
// lets a route reuse a client it already built (e.g. the home-discount-popup
// upload route at app/api/admin/home-discount-popup/upload/route.ts reuses its
// own ecommerce client); omit it to build the standard ecommerce service client.
export async function authorizeStoreAdmin(
  request: NextRequest,
  providedClient?: any,
): Promise<StoreAdminAuthorization> {
  const supabase = providedClient ?? getSupabaseServiceClient();
  if (!supabase) {
    return { error: "Supabase no configurado", status: 500 };
  }

  const activeStoreCookie = request.cookies.get(ACTIVE_STORE_COOKIE)?.value;
  const hostHeader = request.headers.get("host");

  const candidate = await authorizeAnyCandidate<string>(request, async (userId) => {
    const resolution = await resolveActiveStoreId({
      service: supabase,
      userId,
      activeStoreCookie,
      hostHeader,
    });

    if ("error" in resolution) {
      return resolution;
    }
    if ("unauthorized" in resolution) {
      return { authorized: false };
    }

    return { authorized: true, grant: resolution.storeId };
  });

  if ("error" in candidate) {
    return candidate;
  }

  return { supabase, storeId: candidate.grant, userId: candidate.userId };
}

export function adminErrorResponse(denial: AdminAuthDenial): NextResponse {
  const responseBody = denial.diagnostics
    ? { error: denial.error, diagnostics: denial.diagnostics }
    : { error: denial.error };

  return NextResponse.json(responseBody, { status: denial.status });
}
