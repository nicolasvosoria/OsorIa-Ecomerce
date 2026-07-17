import { getSupabaseServiceClient } from "./admin-store"
import { ECOMMERCE_TABLES } from "./contract"
import { ADMIN_LIST_FETCH_LIMIT } from "@/lib/admin/constants"

export type StoreCustomer = {
  email: string
  name: string
  phone: string | null
  orderCount: number
  lastOrderAt: string | null
  isRegistered: boolean
}

type StoreOrderCustomerRow = {
  user_id: string | null
  customer_email: string
  customer_first_name: string | null
  customer_last_name: string | null
  customer_phone: string | null
  created_at: string | null
}

// The store's own customers, derived from the orders it owns (D8): no per-store
// signup column exists yet (slice 11 adds one for new users), so today a store's
// customer relationship is read from its orders. The query is scoped to storeId —
// the service client bypasses RLS, so that explicit filter is the tenant
// isolation, and a customer of another store can never surface here. Both
// registered buyers (user_id set) and guests (user_id null) count, grouped by
// email so a repeat buyer is a single customer. Contact fields come from the
// order snapshot the store already holds, never from a cross-tenant read of the
// global user table. The scan is bounded to the most recent orders like the rest
// of the admin's not-yet-paginated lists.
export async function listStoreCustomers(
  storeId: string,
  supabaseOverride?: any,
): Promise<StoreCustomer[]> {
  const service = supabaseOverride ?? getSupabaseServiceClient()
  if (!service) {
    return []
  }

  const { data, error } = await service
    .from(ECOMMERCE_TABLES.orders)
    .select(
      "user_id, customer_email, customer_first_name, customer_last_name, customer_phone, created_at",
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(ADMIN_LIST_FETCH_LIMIT)

  if (error) {
    throw new Error(`No se pudieron listar los clientes de la tienda: ${error.message}`)
  }

  return groupCustomersByEmail((data ?? []) as StoreOrderCustomerRow[])
}

// Rows arrive newest-first, so the first row seen for an email carries that
// customer's latest snapshot (name, phone) and most recent order date; later
// rows only add to the order count and can flip the customer to registered.
function groupCustomersByEmail(rows: StoreOrderCustomerRow[]): StoreCustomer[] {
  const byEmail = new Map<string, StoreCustomer>()

  for (const row of rows) {
    const email = row.customer_email.trim().toLowerCase()
    const existing = byEmail.get(email)
    if (existing) {
      existing.orderCount += 1
      existing.isRegistered ||= row.user_id !== null
      continue
    }

    byEmail.set(email, {
      email,
      name: formatCustomerName(row),
      phone: row.customer_phone,
      orderCount: 1,
      lastOrderAt: row.created_at,
      isRegistered: row.user_id !== null,
    })
  }

  return Array.from(byEmail.values())
}

function formatCustomerName(row: StoreOrderCustomerRow): string {
  const fullName = `${row.customer_first_name ?? ""} ${row.customer_last_name ?? ""}`.trim()
  return fullName || "Sin nombre"
}
