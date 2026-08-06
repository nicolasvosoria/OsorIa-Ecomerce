import { beforeEach, describe, expect, it, vi } from "vitest"

// D41: this file proves the TS WIRING onto ecommerce.transition_order_status
// -- which template kind (or none) attaches to which target status, and how
// each of the RPC's {ok:false, reason} outcomes is interpreted. It cannot
// prove the frozen D29 graph itself, real transactional atomicity, or a
// database-enforced rejection -- that belongs to (and is proven by)
// supabase/checks/verify-email-platform-contract.sql against real Postgres.
const { loadStoreIdentity, renderEmail } = vi.hoisted(() => ({
  loadStoreIdentity: vi.fn(),
  renderEmail: vi.fn(),
}))

vi.mock("@/lib/supabase/store-identity-api", () => ({ loadStoreIdentity }))
vi.mock("@/lib/email/render", () => ({ renderEmail }))

import {
  InvalidOrderStatusTransitionError,
  OrderNotFoundError,
  OrderStatusNotAuthorizedError,
  transitionOrderStatusAtomically,
} from "@/lib/orders/order-status-writer"
import { updateOrderStatus, type Order } from "@/lib/supabase/orders-api"

const ORDER_ID = "order-1"
const STORE_ID = "store-1"
const USER_ID = "user-1"

const ORDER_SUMMARY_ROW = {
  order_number: "A-1001",
  customer_first_name: "Ada",
  customer_last_name: "Lovelace",
  customer_email: "buyer@example.com",
}

const IDENTITY = {
  displayName: "Tienda de prueba",
  legalName: "Tienda de Prueba SAS",
  phone: "3000000000",
  commercialAddress: "Calle 1",
  subdomain: "tienda-de-prueba",
  logoUrl: null,
  primaryColor: "#5daba8",
  contactEmail: "tienda@example.com",
  replyToEmail: "responde@example.com",
  replyToPendingEmail: null,
  replyToVerifiedAt: "2026-01-01T00:00:00.000Z",
  orderMailboxEmail: "pedidos@example.com",
  orderMailboxPendingEmail: null,
  orderMailboxVerifiedAt: "2026-01-01T00:00:00.000Z",
}

const RENDERED_EMAIL = { subject: "Actualización de tu pedido", html: "<p>h</p>", text: "t" }

function makeSupabase(options: { orderRow?: any; rpcResult?: { data?: any; error?: any } } = {}) {
  const rpc = vi.fn().mockResolvedValue(
    options.rpcResult ?? { data: { ok: true, order: { id: ORDER_ID } }, error: null },
  )
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({
      data: "orderRow" in options ? options.orderRow : ORDER_SUMMARY_ROW,
      error: null,
    })),
  }
  const from = vi.fn(() => builder)
  return { from, rpc }
}

describe("transitionOrderStatusAtomically", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadStoreIdentity.mockResolvedValue(IDENTITY)
    renderEmail.mockResolvedValue(RENDERED_EMAIL)
  })

  // D11/D41: every target status the frozen graph can land on, enumerated --
  // confirmed/processing enqueue nothing, the other four enqueue exactly the
  // one message the catalog assigns them. The FROM half of each transition
  // (whether pending/confirmed/processing may reach it at all) is the
  // database's own decision, proven against real Postgres in
  // verify-email-platform-contract.sql, not re-decided in TS.
  it.each([
    ["confirmed", null],
    ["processing", null],
    ["shipped", "order-shipped"],
    ["delivered", "order-delivered"],
    ["cancelled", "order-cancelled"],
    ["returned", "order-returned"],
  ] as const)("transition into %s enqueues %s", async (nextStatus, expectedKind) => {
    const supabase = makeSupabase()

    await transitionOrderStatusAtomically({
      supabase,
      orderId: ORDER_ID,
      storeId: STORE_ID,
      userId: USER_ID,
      nextStatus,
    })

    const [, params] = supabase.rpc.mock.calls[0]
    expect(params).toEqual({
      p_order_id: ORDER_ID,
      p_store_id: STORE_ID,
      p_user_id: USER_ID,
      p_next_status: nextStatus,
      p_notification: expectedKind === null ? null : expect.objectContaining({ templateKind: expectedKind }),
    })

    if (expectedKind === null) {
      expect(loadStoreIdentity).not.toHaveBeenCalled()
      expect(renderEmail).not.toHaveBeenCalled()
    } else {
      expect(renderEmail).toHaveBeenCalledWith(
        expect.objectContaining({ kind: expectedKind, data: expect.objectContaining({ orderNumber: "A-1001" }) }),
      )
      expect(params.p_notification.recipientEmail).toBe("buyer@example.com")
      expect(params.p_notification.idempotencyKey).toBe(`order-status:${ORDER_ID}:${nextStatus}`)
    }
  })

  it("never enqueues a notification when the target order cannot be found in this store, and still calls the RPC (which surfaces not_found)", async () => {
    const supabase = makeSupabase({
      orderRow: null,
      rpcResult: { data: { ok: false, reason: "not_found" }, error: null },
    })

    await expect(
      transitionOrderStatusAtomically({
        supabase,
        orderId: ORDER_ID,
        storeId: STORE_ID,
        userId: USER_ID,
        nextStatus: "shipped",
      }),
    ).rejects.toThrow(OrderNotFoundError)

    expect(renderEmail).not.toHaveBeenCalled()
    const [, params] = supabase.rpc.mock.calls[0]
    expect(params.p_notification).toBeNull()
  })

  it("throws OrderStatusNotAuthorizedError when the RPC reports not_authorized", async () => {
    const supabase = makeSupabase({ rpcResult: { data: { ok: false, reason: "not_authorized" }, error: null } })

    await expect(
      transitionOrderStatusAtomically({
        supabase,
        orderId: ORDER_ID,
        storeId: STORE_ID,
        userId: USER_ID,
        nextStatus: "confirmed",
      }),
    ).rejects.toThrow(OrderStatusNotAuthorizedError)
  })

  it("throws OrderNotFoundError when the RPC reports not_found (cross-tenant order)", async () => {
    const supabase = makeSupabase({ rpcResult: { data: { ok: false, reason: "not_found" }, error: null } })

    await expect(
      transitionOrderStatusAtomically({
        supabase,
        orderId: ORDER_ID,
        storeId: STORE_ID,
        userId: USER_ID,
        nextStatus: "confirmed",
      }),
    ).rejects.toThrow(OrderNotFoundError)
  })

  it("throws InvalidOrderStatusTransitionError when the RPC reports invalid_transition", async () => {
    const supabase = makeSupabase({ rpcResult: { data: { ok: false, reason: "invalid_transition" }, error: null } })

    await expect(
      transitionOrderStatusAtomically({
        supabase,
        orderId: ORDER_ID,
        storeId: STORE_ID,
        userId: USER_ID,
        nextStatus: "delivered",
      }),
    ).rejects.toThrow(InvalidOrderStatusTransitionError)
  })

  it("surfaces an RPC transport error instead of swallowing it", async () => {
    const supabase = makeSupabase({ rpcResult: { data: null, error: { message: "connection reset" } } })

    await expect(
      transitionOrderStatusAtomically({
        supabase,
        orderId: ORDER_ID,
        storeId: STORE_ID,
        userId: USER_ID,
        nextStatus: "confirmed",
      }),
    ).rejects.toThrow(/connection reset/)
  })
})

describe("updateOrderStatus (orders-api)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadStoreIdentity.mockResolvedValue(IDENTITY)
    renderEmail.mockResolvedValue(RENDERED_EMAIL)
  })

  it("returns true and forwards store_id/user_id on a successful transition", async () => {
    const supabase = makeSupabase()

    const ok = await updateOrderStatus(ORDER_ID, "confirmed" as Order["status"], STORE_ID, USER_ID, supabase)

    expect(ok).toBe(true)
    expect(supabase.rpc).toHaveBeenCalledWith(
      "transition_order_status",
      expect.objectContaining({ p_store_id: STORE_ID, p_user_id: USER_ID }),
    )
  })

  it.each(["not_authorized", "not_found", "invalid_transition"] as const)(
    "collapses a %s rejection to false instead of throwing",
    async (reason) => {
      const supabase = makeSupabase({ rpcResult: { data: { ok: false, reason }, error: null } })

      const ok = await updateOrderStatus(ORDER_ID, "confirmed" as Order["status"], STORE_ID, USER_ID, supabase)

      expect(ok).toBe(false)
    },
  )
})
