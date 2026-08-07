import { describe, expect, it, vi } from "vitest"

import { hashVerificationToken } from "@/lib/security/verification-token"
import { mintAuthIntent } from "@/lib/auth/auth-intents"

describe("mintAuthIntent", () => {
  it("inserts a hashed, one-hour-lived row bound to the server-resolved store, and returns the plaintext token", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const supabase = { from: vi.fn().mockReturnValue({ insert }) }

    const token = await mintAuthIntent(supabase, { storeId: "store-1", purpose: "signup", email: "Ana@Example.com" })

    expect(token.length).toBeGreaterThan(20)
    expect(supabase.from).toHaveBeenCalledWith("auth_intents")
    const insertedRow = insert.mock.calls[0][0]
    expect(insertedRow.store_id).toBe("store-1")
    expect(insertedRow.purpose).toBe("signup")
    expect(insertedRow.email).toBe("ana@example.com")
    expect(insertedRow.token_hash).toBe(hashVerificationToken(token))
    const lifetimeMs = new Date(insertedRow.expires_at).getTime() - Date.now()
    expect(lifetimeMs).toBeGreaterThan(59 * 60 * 1000)
    expect(lifetimeMs).toBeLessThan(61 * 60 * 1000)
  })

  it("throws (never silently drops the failure) when the insert itself fails", async () => {
    const supabase = { from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: { message: "boom" } }) }) }

    await expect(mintAuthIntent(supabase, { storeId: "store-1", purpose: "signup", email: "a@example.com" })).rejects.toThrow(/boom/)
  })
})
