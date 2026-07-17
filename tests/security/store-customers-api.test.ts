import { describe, expect, it, vi } from "vitest"

import { listStoreCustomers } from "@/lib/supabase/store-customers-api"

type OrderRow = {
  user_id: string | null
  customer_email: string
  customer_first_name: string | null
  customer_last_name: string | null
  customer_phone: string | null
  created_at: string | null
}

function order(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    user_id: null,
    customer_email: "cliente@correo.com",
    customer_first_name: "Cliente",
    customer_last_name: "Uno",
    customer_phone: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

// Resolves the orders query with the rows registered for whichever store_id the
// caller filtered on, so a test can prove one store never reads another's rows.
function serviceReturningByStore(rowsByStore: Record<string, OrderRow[]>) {
  const eqCalls: unknown[][] = []
  const from = vi.fn((table: string) => {
    if (table !== "orders") {
      throw new Error(`unexpected table ${table}`)
    }
    let storeId = ""
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn((column: string, value: string) => {
        eqCalls.push([column, value])
        if (column === "store_id") storeId = value
        return builder
      }),
      order: vi.fn(() => builder),
      limit: vi.fn(() => Promise.resolve({ data: rowsByStore[storeId] ?? [], error: null })),
    }
    return builder
  })

  return { service: { from }, eqCalls }
}

function serviceFailing(message: string) {
  const from = vi.fn(() => {
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => Promise.resolve({ data: null, error: { message } })),
    }
    return builder
  })
  return { from }
}

describe("listStoreCustomers tenant scoping (D8)", () => {
  it("filters orders to the passed storeId and never returns another store's customers", async () => {
    const { service, eqCalls } = serviceReturningByStore({
      "store-a": [order({ customer_email: "ana@tienda-a.com" })],
      "store-b": [order({ customer_email: "beto@tienda-b.com" })],
    })

    const storeA = await listStoreCustomers("store-a", service)
    const storeB = await listStoreCustomers("store-b", service)

    expect(eqCalls).toContainEqual(["store_id", "store-a"])
    expect(eqCalls).toContainEqual(["store_id", "store-b"])
    expect(storeA.map((customer) => customer.email)).toEqual(["ana@tienda-a.com"])
    expect(storeB.map((customer) => customer.email)).toEqual(["beto@tienda-b.com"])
    expect(storeA.some((customer) => customer.email === "beto@tienda-b.com")).toBe(false)
  })

  it("surfaces the query error instead of returning a blind empty list", async () => {
    await expect(listStoreCustomers("store-a", serviceFailing("permission denied"))).rejects.toThrow(
      "No se pudieron listar los clientes de la tienda: permission denied",
    )
  })
})

describe("listStoreCustomers derivation from orders", () => {
  it("groups a repeat buyer by email, counting orders and keeping the newest snapshot", async () => {
    const { service } = serviceReturningByStore({
      "store-a": [
        order({
          customer_email: "ANA@correo.com",
          customer_first_name: "Ana",
          customer_last_name: "Reciente",
          customer_phone: "300",
          created_at: "2026-03-01T00:00:00.000Z",
        }),
        order({
          customer_email: "ana@correo.com",
          customer_first_name: "Ana",
          customer_last_name: "Vieja",
          customer_phone: "100",
          created_at: "2026-01-01T00:00:00.000Z",
        }),
      ],
    })

    const customers = await listStoreCustomers("store-a", service)

    expect(customers).toEqual([
      {
        email: "ana@correo.com",
        name: "Ana Reciente",
        phone: "300",
        orderCount: 2,
        lastOrderAt: "2026-03-01T00:00:00.000Z",
        isRegistered: false,
      },
    ])
  })

  it("includes registered and guest buyers, flagging a customer registered if any order has a user", async () => {
    const { service } = serviceReturningByStore({
      "store-a": [
        order({ customer_email: "invitado@correo.com", user_id: null }),
        order({
          customer_email: "socio@correo.com",
          user_id: null,
          created_at: "2026-02-02T00:00:00.000Z",
        }),
        order({
          customer_email: "socio@correo.com",
          user_id: "user-1",
          created_at: "2026-01-01T00:00:00.000Z",
        }),
      ],
    })

    const customers = await listStoreCustomers("store-a", service)
    const byEmail = Object.fromEntries(customers.map((customer) => [customer.email, customer]))

    expect(byEmail["invitado@correo.com"].isRegistered).toBe(false)
    expect(byEmail["socio@correo.com"].isRegistered).toBe(true)
    expect(byEmail["socio@correo.com"].orderCount).toBe(2)
  })

  it("falls back to 'Sin nombre' when the order snapshot carries no name", async () => {
    const { service } = serviceReturningByStore({
      "store-a": [
        order({ customer_first_name: null, customer_last_name: null }),
      ],
    })

    const [customer] = await listStoreCustomers("store-a", service)

    expect(customer.name).toBe("Sin nombre")
  })
})
