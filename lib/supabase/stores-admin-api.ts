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
  currency_code: string;
};

export type TenantMetrics = {
  productCount: number;
  orderCount: number;
  revenue: number;
  lastOrderAt: string | null;
  memberCount: number;
};

export const EMPTY_TENANT_METRICS: TenantMetrics = {
  productCount: 0,
  orderCount: 0,
  revenue: 0,
  lastOrderAt: null,
  memberCount: 0,
};

export type CreateTenantResult =
  | { success: true; storeId: string; tempPassword?: string }
  | { success: false; error: string };

// D6's exact enumerations, kept local to the platform console instead of
// reusing lib/orders/order-status.ts: that module's payment-status labels
// don't cover 'cancelled' and its Order type is the store-facing orders
// domain, not this console's own read-only aggregate contract.
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "returned"
  | "cancelled";
const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
];

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "cancelled";
const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed", "refunded", "cancelled"];

export type CartStatus = "active" | "abandoned" | "expired";
const CART_STATUSES: CartStatus[] = ["active", "abandoned", "expired"];

export type TenantDetail = {
  ordersByStatus: Record<OrderStatus, number>;
  ordersByPaymentStatus: Record<PaymentStatus, number>;
  revenue: number;
  lastOrderAt: string | null;
  totalItemCount: number;
  activeItemCount: number;
  cartsByStatus: Record<CartStatus, number>;
  memberCount: number;
  themeName: string | null;
  isThemeCustom: boolean;
  hasBranding: boolean;
};

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

  const storeId = data as string;
  if (owner.created) {
    await recordSignupStore(service, owner.userId, storeId);
  }

  return owner.created
    ? { success: true, storeId, tempPassword: owner.tempPassword }
    : { success: true, storeId };
}

// The owner's platform identity was minted specifically to found this store
// (D8), so its signup_store_id records that as the truest origin. Only runs
// for a freshly-minted owner: an existing identity added as owner keeps
// whatever origin it already carries. provision_store already committed the
// store, role and membership by this point, so a failure here must not undo
// a successful provisioning — it only logs.
async function recordSignupStore(service: any, userId: string, storeId: string): Promise<void> {
  const { error } = await service
    .from(ECOMMERCE_TABLES.userProfiles)
    .update({ signup_store_id: storeId })
    .eq("id", userId);

  if (error) {
    console.error(`[Stores] No se pudo registrar la tienda de origen del dueño: ${error.message}`);
  }
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

// Every column the console shows for a tenant, list or detail alike (D6): no
// PII, only the identity/status fields TenantSummary carries.
const TENANT_SUMMARY_COLUMNS =
  "id, store_name, subdomain, is_active, is_public, created_at, currency_code";

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
    .select(TENANT_SUMMARY_COLUMNS)
    .is("deleted_at", null)
    .order("store_name");

  if (error) {
    throw new Error(`No se pudieron listar las tiendas: ${error.message}`);
  }

  return (data ?? []).map(toTenantSummary);
}

// The detail page's header, and its notFound() guard: a deleted store reads
// as "doesn't exist" here too, mirroring listTenants.
export async function getTenantById(storeId: string): Promise<TenantSummary | null> {
  const service = getSupabaseServiceClient();
  if (!service) {
    throw new Error("Supabase no configurado");
  }

  const { data, error } = await service
    .from(ECOMMERCE_TABLES.stores)
    .select(TENANT_SUMMARY_COLUMNS)
    .eq("id", storeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer la tienda: ${error.message}`);
  }

  return data ? toTenantSummary(data) : null;
}

function toTenantSummary(row: {
  id: string;
  store_name: string;
  subdomain: string;
  is_active: boolean | null;
  is_public: boolean | null;
  created_at: string | null;
  currency_code: string;
}): TenantSummary {
  return {
    id: row.id,
    store_name: row.store_name,
    subdomain: row.subdomain,
    is_active: row.is_active ?? false,
    is_public: row.is_public ?? false,
    created_at: row.created_at,
    currency_code: row.currency_code,
  };
}

// Per-store product, order and team-size metrics, keyed by store_id. Reads
// store_items, orders and store_users in full, one paged scan each, and groups
// them in memory instead of issuing one query per tenant.
export async function getTenantMetrics(): Promise<Record<string, TenantMetrics>> {
  const service = getSupabaseServiceClient();
  if (!service) {
    throw new Error("Supabase no configurado");
  }

  const [productCounts, orderTotals, memberCounts] = await Promise.all([
    countActiveProductsByStore(service),
    sumOrdersByStore(service),
    countMembersByStore(service),
  ]);

  const storeIds = new Set([
    ...productCounts.keys(),
    ...orderTotals.keys(),
    ...memberCounts.keys(),
  ]);
  return Object.fromEntries(
    Array.from(storeIds, (storeId) => [
      storeId,
      {
        productCount: productCounts.get(storeId) ?? 0,
        orderCount: orderTotals.get(storeId)?.orderCount ?? 0,
        revenue: orderTotals.get(storeId)?.revenue ?? 0,
        lastOrderAt: orderTotals.get(storeId)?.lastOrderAt ?? null,
        memberCount: memberCounts.get(storeId) ?? 0,
      },
    ]),
  );
}

async function countActiveProductsByStore(service: any): Promise<Map<string, number>> {
  const rows = await scanAllRows<{ store_id: string }>(
    () => service.from(ECOMMERCE_TABLES.storeItems).select("store_id").eq("is_active", true),
    "No se pudieron contar los productos",
  );

  return groupCountByStoreId(rows);
}

async function countMembersByStore(service: any): Promise<Map<string, number>> {
  const rows = await scanAllRows<{ store_id: string }>(
    () => service.from(ECOMMERCE_TABLES.storeUsers).select("store_id"),
    "No se pudieron contar los miembros",
  );

  return groupCountByStoreId(rows);
}

function groupCountByStoreId(rows: { store_id: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.store_id, (counts.get(row.store_id) ?? 0) + 1);
  }

  return counts;
}

type OrderTotals = { orderCount: number; revenue: number; lastOrderAt: string | null };

// Shared with getOrderBreakdown below: pending, failed and cancelled orders
// never billed the store, so only 'paid' counts toward revenue anywhere in
// this file.
const PAID_PAYMENT_STATUS: PaymentStatus = "paid";

function isPaidOrder(paymentStatus: string | null): boolean {
  return paymentStatus === PAID_PAYMENT_STATUS;
}

// Revenue counts only orders with payment_status 'paid'; lastOrderAt tracks
// every order regardless of payment status instead — it's a signal of recent
// activity, not billing, so a store with only pending orders still shows life
// rather than "—".
async function sumOrdersByStore(service: any): Promise<Map<string, OrderTotals>> {
  const rows = await scanAllRows<{
    store_id: string;
    total_amount: string | number | null;
    payment_status: string | null;
    created_at: string | null;
  }>(
    () =>
      service
        .from(ECOMMERCE_TABLES.orders)
        .select("store_id, total_amount, payment_status, created_at"),
    "No se pudieron sumar los pedidos",
  );

  const totals = new Map<string, OrderTotals>();
  for (const row of rows) {
    const current = totals.get(row.store_id) ?? { orderCount: 0, revenue: 0, lastOrderAt: null };
    const paidAmount = isPaidOrder(row.payment_status) ? Number(row.total_amount) || 0 : 0;
    totals.set(row.store_id, {
      orderCount: current.orderCount + 1,
      revenue: current.revenue + paidAmount,
      lastOrderAt: laterTimestamp(current.lastOrderAt, row.created_at),
    });
  }

  return totals;
}

function laterTimestamp(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return b > a ? b : a;
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

// The tenant detail page's health view: every column read is an aggregate
// count, a date, or a boolean derived from one non-PII column — no
// customer_*, user_id, email, name, address, shipping_*, notes,
// payment_reference or metadata ever leaves this function (D6).
export async function getTenantDetail(storeId: string): Promise<TenantDetail> {
  const service = getSupabaseServiceClient();
  if (!service) {
    throw new Error("Supabase no configurado");
  }

  const [orders, catalog, cartsByStatus, memberCount, theme, hasBranding] = await Promise.all([
    getOrderBreakdown(service, storeId),
    getCatalogCounts(service, storeId),
    getCartCounts(service, storeId),
    countStoreMembers(service, storeId),
    getCurrentTheme(service, storeId),
    hasStoreBranding(service, storeId),
  ]);

  return { ...orders, ...catalog, cartsByStatus, memberCount, ...theme, hasBranding };
}

// A store's orders never exceed a few thousand rows, but revenue and
// lastOrderAt need the actual amounts and dates (not just counts), so this
// scans the store's own rows instead of issuing 12 separate head/count
// queries — the same strategy sumOrdersByStore already uses, just filtered
// to one store.
async function getOrderBreakdown(
  service: any,
  storeId: string,
): Promise<{
  ordersByStatus: Record<OrderStatus, number>;
  ordersByPaymentStatus: Record<PaymentStatus, number>;
  revenue: number;
  lastOrderAt: string | null;
}> {
  const rows = await scanAllRows<{
    status: string | null;
    payment_status: string | null;
    total_amount: string | number | null;
    created_at: string | null;
  }>(
    () =>
      service
        .from(ECOMMERCE_TABLES.orders)
        .select("status, payment_status, total_amount, created_at")
        .eq("store_id", storeId),
    "No se pudieron leer los pedidos de la tienda",
  );

  return {
    ordersByStatus: countByKnownValue(
      ORDER_STATUSES,
      rows.map((row) => row.status),
    ),
    ordersByPaymentStatus: countByKnownValue(
      PAYMENT_STATUSES,
      rows.map((row) => row.payment_status),
    ),
    revenue: rows.reduce(
      (sum, row) => sum + (isPaidOrder(row.payment_status) ? Number(row.total_amount) || 0 : 0),
      0,
    ),
    lastOrderAt: rows.reduce<string | null>(
      (latest, row) => laterTimestamp(latest, row.created_at),
      null,
    ),
  };
}

// Zero-filled counts keyed by every known value in `values`, in that order —
// an absent status still renders as 0 instead of a missing row. Shared by the
// order-status and payment-status breakdowns above.
function countByKnownValue<T extends string>(
  values: readonly T[],
  rawValues: Array<string | null>,
): Record<T, number> {
  const counts = Object.fromEntries(values.map((value) => [value, 0])) as Record<T, number>;
  const known = new Set<string>(values);

  for (const raw of rawValues) {
    if (raw !== null && known.has(raw)) {
      counts[raw as T] += 1;
    }
  }

  return counts;
}

// Row counts only: no product, cart or member data is PII, so a head-only
// count query (zero rows transferred) is both the safest and the cheapest
// shape for these.
async function getCatalogCounts(
  service: any,
  storeId: string,
): Promise<{ totalItemCount: number; activeItemCount: number }> {
  const [total, active] = await Promise.all([
    service
      .from(ECOMMERCE_TABLES.storeItems)
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId),
    service
      .from(ECOMMERCE_TABLES.storeItems)
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("is_active", true),
  ]);

  assertQuerySucceeded("el catálogo de la tienda", total.error);
  assertQuerySucceeded("los productos activos", active.error);

  return { totalItemCount: total.count ?? 0, activeItemCount: active.count ?? 0 };
}

async function getCartCounts(service: any, storeId: string): Promise<Record<CartStatus, number>> {
  const results = await Promise.all(
    CART_STATUSES.map((status) =>
      service
        .from(ECOMMERCE_TABLES.carts)
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("status", status),
    ),
  );

  results.forEach((result, index) =>
    assertQuerySucceeded(`los carritos ${CART_STATUSES[index]}`, result.error),
  );

  return Object.fromEntries(
    CART_STATUSES.map((status, index) => [status, results[index].count ?? 0]),
  ) as Record<CartStatus, number>;
}

async function countStoreMembers(service: any, storeId: string): Promise<number> {
  const { count, error } = await service
    .from(ECOMMERCE_TABLES.storeUsers)
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  assertQuerySucceeded("el equipo de la tienda", error);
  return count ?? 0;
}

// Two-step lookup (version, then its preset) rather than an embedded join:
// mirrors how getActiveTheme already reads app_theme_versions/app_themes.
async function getCurrentTheme(
  service: any,
  storeId: string,
): Promise<{ themeName: string | null; isThemeCustom: boolean }> {
  const { data: version, error: versionError } = await service
    .from(ECOMMERCE_TABLES.appThemeVersions)
    .select("theme_id, is_custom")
    .eq("store_id", storeId)
    .eq("is_current", true)
    .maybeSingle();

  assertQuerySucceeded("el tema activo de la tienda", versionError);
  if (!version) {
    return { themeName: null, isThemeCustom: false };
  }

  const { data: theme, error: themeError } = await service
    .from(ECOMMERCE_TABLES.appThemes)
    .select("theme_name")
    .eq("id", version.theme_id)
    .maybeSingle();

  assertQuerySucceeded("el nombre del tema", themeError);
  return { themeName: theme?.theme_name ?? null, isThemeCustom: version.is_custom ?? false };
}

// store_branding.logo_url IS NOT NULL, nothing else: store_contact (email,
// phone, address) is never selected here or anywhere in this file.
async function hasStoreBranding(service: any, storeId: string): Promise<boolean> {
  const { data, error } = await service
    .from(ECOMMERCE_TABLES.storeBranding)
    .select("logo_url")
    .eq("store_id", storeId)
    .maybeSingle();

  assertQuerySucceeded("la marca de la tienda", error);
  return Boolean(data?.logo_url);
}

// A Supabase query resolves with `.error` on failure instead of throwing, so
// every aggregate above funnels through this to surface it instead of
// silently reporting zero.
function assertQuerySucceeded(label: string, error: unknown): void {
  if (!error) return;
  throw new Error(`No se pudo leer ${label}`, { cause: error });
}
