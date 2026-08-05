import { describe, expect, it } from "vitest"

import { createVerificationToken, hashVerificationToken } from "@/lib/security/verification-token"

describe("createVerificationToken", () => {
  it("returns a plaintext token and its independently-reproducible sha256 hash", () => {
    const { token, tokenHash } = createVerificationToken()

    expect(token.length).toBeGreaterThan(20)
    expect(tokenHash).toBe(hashVerificationToken(token))
    // sha256 hex digest is always 64 characters.
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("never reuses a token across calls", () => {
    const first = createVerificationToken()
    const second = createVerificationToken()

    expect(first.token).not.toBe(second.token)
    expect(first.tokenHash).not.toBe(second.tokenHash)
  })
})

describe("hashVerificationToken", () => {
  it("is deterministic for the same input", () => {
    expect(hashVerificationToken("same-token")).toBe(hashVerificationToken("same-token"))
  })

  it("changes completely for a one-character difference (no partial match to guess)", () => {
    expect(hashVerificationToken("token-a")).not.toBe(hashVerificationToken("token-b"))
  })
})
