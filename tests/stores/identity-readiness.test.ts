import { describe, expect, it } from "vitest"

import { getStoreIdentityReadiness, type StoreIdentitySnapshot } from "@/lib/stores/identity-readiness"

const COMPLETE: StoreIdentitySnapshot = {
  displayName: "Cumbre Dorada Café",
  legalName: "Cumbre Dorada S.A.S.",
  phone: "3000000000",
  commercialAddress: "Bogotá, Colombia",
  replyToVerifiedAt: "2026-08-01T00:00:00.000Z",
  orderMailboxVerifiedAt: "2026-08-01T00:00:00.000Z",
}

describe("getStoreIdentityReadiness", () => {
  it("is ready when every A8 field is present and both mailboxes are verified", () => {
    expect(getStoreIdentityReadiness(COMPLETE)).toEqual({ ready: true, missingFields: [] })
  })

  it("reports every missing field, not just the first one found", () => {
    const readiness = getStoreIdentityReadiness({
      ...COMPLETE,
      legalName: null,
      phone: "   ",
      replyToVerifiedAt: null,
    })

    expect(readiness.ready).toBe(false)
    expect(readiness.missingFields).toEqual(["legalName", "phone", "replyTo"])
  })

  it("treats a pending (unverified) mailbox as not ready even once an address exists", () => {
    // A pending email alone never satisfies D6 -- only reply_to_verified_at /
    // order_mailbox_verified_at do, and this snapshot never carries the
    // pending value at all (readiness only reads the verified state).
    const readiness = getStoreIdentityReadiness({ ...COMPLETE, orderMailboxVerifiedAt: null })

    expect(readiness.ready).toBe(false)
    expect(readiness.missingFields).toEqual(["orderMailbox"])
  })
})
