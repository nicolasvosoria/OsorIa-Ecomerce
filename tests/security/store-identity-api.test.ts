import { describe, expect, it, vi } from "vitest"

import { confirmStoreMailboxVerification } from "@/lib/supabase/store-identity-api"

function serviceWith(rpcResult: { data: unknown; error: unknown }) {
  return { rpc: vi.fn().mockResolvedValue(rpcResult) }
}

// C1: an RPC transport/permission failure and a genuine business rejection
// (expired/reused/unknown token) must never collapse into the identical
// {ok:false} -- a broken deploy has to read differently from a bad link, or
// there's nothing to chase. assertQuerySucceeded (used elsewhere in this
// same file, e.g. loadStoreIdentity) is the established way to make that
// distinction: throw with { cause } instead of swallowing.
describe("confirmStoreMailboxVerification", () => {
  it("confirms the field the RPC reports on a real ok response", async () => {
    const supabase = serviceWith({ data: { ok: true, field: "order_mailbox" }, error: null })

    await expect(confirmStoreMailboxVerification(supabase, "plaintext-token")).resolves.toEqual({
      ok: true,
      field: "order_mailbox",
    })
  })

  it("returns the generic rejection for an expired/reused/unknown token (no RPC error)", async () => {
    const supabase = serviceWith({ data: { ok: false }, error: null })

    await expect(confirmStoreMailboxVerification(supabase, "expired-or-reused")).resolves.toEqual({ ok: false })
  })

  it("throws with the RPC error as cause instead of reporting the same generic rejection", async () => {
    const rpcError = { message: "permission denied for function confirm_store_mailbox_verification" }
    const supabase = serviceWith({ data: null, error: rpcError })

    await expect(confirmStoreMailboxVerification(supabase, "any-token")).rejects.toMatchObject({
      message: expect.stringContaining("No se pudo leer"),
      cause: rpcError,
    })
  })
})
