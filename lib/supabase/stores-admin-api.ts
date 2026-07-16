import { getSupabaseServiceClient } from "./admin-store";
import { ECOMMERCE_FUNCTIONS, ECOMMERCE_TABLES } from "./contract";
import { ensurePlatformUserByEmail } from "./memberships-api";
import type { CreateStoreFormValues } from "@/lib/stores/schemas";

export type TenantSummary = {
  id: string;
  store_name: string;
  subdomain: string;
  is_active: boolean;
  is_public: boolean;
  created_at: string | null;
};

export type TenantMetrics = {
  productCount: number;
  orderCount: number;
  revenue: number;
};

export const EMPTY_TENANT_METRICS: TenantMetrics = {
  productCount: 0,
  orderCount: 0,
  revenue: 0,
};

export type CreateTenantResult =
  | { success: true; storeId: string; tempPassword?: string }
  | { success: false; error: string };

const UNIQUE_VIOLATION_CODE = "23505";
const SUBDOMAIN_TAKEN_ERROR = "Ese subdominio ya está en uso. Elige otro.";
const PROVISION_FAILED_ERROR = "No se pudo crear la tienda";

// Provisions a brand-new tenant from the platform console. The owner's platform
// identity is resolved FIRST because provision_store writes store_users.user_id,
// whose FK to user_profiles(id) demands that identity already exist — inverting
// the order would fail the FK. Only then does the atomic provision_store create
// the store (born private), its 'owner' role, and the membership in one call.
// A freshly-minted owner carries the temporary password back for the operator.
export async function createTenant(
  input: CreateStoreFormValues,
  supabaseOverride?: any,
): Promise<CreateTenantResult> {
  const service = supabaseOverride ?? getSupabaseServiceClient();
  if (!service) {
    return { success: false, error: "Supabase no configurado" };
  }

  let owner;
  try {
    owner = await ensurePlatformUserByEmail(input.ownerEmail, service, {
      firstName: input.ownerFirstName,
      lastName: input.ownerLastName,
    });
  } catch (error) {
    return { success: false, error: toCreateTenantError(error) };
  }

  const { data, error } = await service.rpc(ECOMMERCE_FUNCTIONS.provisionStore, {
    p_subdomain: input.subdomain,
    p_store_name: input.storeName,
    p_owner_user_id: owner.userId,
    p_currency_code: input.currencyCode,
  });

  if (error || !data) {
    return { success: false, error: provisionErrorMessage(error) };
  }

  return owner.created
    ? { success: true, storeId: data as string, tempPassword: owner.tempPassword }
    : { success: true, storeId: data as string };
}

// The subdomain's uniqueness is the DB's job (stores_subdomain_key), so a race
// that loses to another provision surfaces here as a raw 23505; every other
// failure keeps its own message instead of being masked as a collision.
function provisionErrorMessage(error: any): string {
  const isSubdomainCollision =
    error?.code === UNIQUE_VIOLATION_CODE &&
    `${error.message ?? ""} ${error.details ?? ""}`.includes("stores_subdomain_key");

  return isSubdomainCollision ? SUBDOMAIN_TAKEN_ERROR : error?.message || PROVISION_FAILED_ERROR;
}

function toCreateTenantError(error: unknown): string {
  return error instanceof Error ? error.message : PROVISION_FAILED_ERROR;
}

// Every tenant on the platform: this console is the one place a super_admin
// legitimately sees across stores, so unlike listStoresForUser this is never
// scoped to the caller's memberships.
export async function listTenants(): Promise<TenantSummary[]> {
  const service = getSupabaseServiceClient();
  if (!service) {
    throw new Error("Supabase no configurado");
  }

  const { data, error } = await service
    .from(ECOMMERCE_TABLES.stores)
    .select("id, store_name, subdomain, is_active, is_public, created_at")
    .is("deleted_at", null)
    .order("store_name");

  if (error) {
    throw new Error(`No se pudieron listar las tiendas: ${error.message}`);
  }

  return (data ?? []).map(toTenantSummary);
}

function toTenantSummary(row: {
  id: string;
  store_name: string;
  subdomain: string;
  is_active: boolean | null;
  is_public: boolean | null;
  created_at: string | null;
}): TenantSummary {
  return {
    id: row.id,
    store_name: row.store_name,
    subdomain: row.subdomain,
    is_active: row.is_active ?? false,
    is_public: row.is_public ?? false,
    created_at: row.created_at,
  };
}

// Per-store product and order counts, keyed by store_id. Reads store_items and
// orders in full, one paged scan each, and groups them in memory instead of
// issuing one query per tenant.
export async function getTenantMetrics(): Promise<Record<string, TenantMetrics>> {
  const service = getSupabaseServiceClient();
  if (!service) {
    throw new Error("Supabase no configurado");
  }

  const [productCounts, orderTotals] = await Promise.all([
    countActiveProductsByStore(service),
    sumOrdersByStore(service),
  ]);

  const storeIds = new Set([...productCounts.keys(), ...orderTotals.keys()]);
  return Object.fromEntries(
    Array.from(storeIds, (storeId) => [
      storeId,
      {
        productCount: productCounts.get(storeId) ?? 0,
        orderCount: orderTotals.get(storeId)?.orderCount ?? 0,
        revenue: orderTotals.get(storeId)?.revenue ?? 0,
      },
    ]),
  );
}

async function countActiveProductsByStore(service: any): Promise<Map<string, number>> {
  const rows = await scanAllRows<{ store_id: string }>(
    () => service.from(ECOMMERCE_TABLES.storeItems).select("store_id").eq("is_active", true),
    "No se pudieron contar los productos",
  );

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.store_id, (counts.get(row.store_id) ?? 0) + 1);
  }

  return counts;
}

type OrderTotals = { orderCount: number; revenue: number };

async function sumOrdersByStore(service: any): Promise<Map<string, OrderTotals>> {
  const rows = await scanAllRows<{ store_id: string; total_amount: string | number | null }>(
    () => service.from(ECOMMERCE_TABLES.orders).select("store_id, total_amount"),
    "No se pudieron sumar los pedidos",
  );

  const totals = new Map<string, OrderTotals>();
  for (const row of rows) {
    const current = totals.get(row.store_id) ?? { orderCount: 0, revenue: 0 };
    totals.set(row.store_id, {
      orderCount: current.orderCount + 1,
      revenue: current.revenue + (Number(row.total_amount) || 0),
    });
  }

  return totals;
}

// PostgREST silently caps an unbounded select at max-rows (1000 by default), so
// a plain .select() would under-report every metric past that without erroring.
// Ordered by id to keep the pages disjoint while paging.
const METRICS_SCAN_PAGE_SIZE = 1000;

async function scanAllRows<Row>(
  buildQuery: () => any,
  failureMessage: string,
): Promise<Row[]> {
  const rows: Row[] = [];

  for (let offset = 0; ; offset += METRICS_SCAN_PAGE_SIZE) {
    const { data, error } = await buildQuery()
      .order("id")
      .range(offset, offset + METRICS_SCAN_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`${failureMessage}: ${error.message}`);
    }

    const page: Row[] = data ?? [];
    rows.push(...page);

    if (page.length < METRICS_SCAN_PAGE_SIZE) {
      return rows;
    }
  }
}
