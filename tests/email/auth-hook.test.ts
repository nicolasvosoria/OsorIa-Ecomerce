import { describe, expect, it, vi } from "vitest"

import { processAuthEmailHookPayload, type AuthHookDeps, type AuthHookPayload } from "@/lib/email/auth-hook"
import type { TenantEmailBranding } from "@/lib/email/types"

const BRANDING: TenantEmailBranding = {
  displayName: "Cumbre Dorada Café",
  validatedSubdomain: "cumbre-dorada",
  primaryColor: "#5daba8",
  commercialAddress: "Bogotá, Colombia",
}

function buildDeps(overrides: Partial<AuthHookDeps> = {}): AuthHookDeps {
  return {
    peekAuthIntent: vi.fn().mockResolvedValue(null),
    loadStoreIdentity: vi.fn().mockResolvedValue(BRANDING),
    loadProfileHomeStore: vi.fn().mockResolvedValue(null),
    enqueueEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function signupPayload(overrides: Partial<AuthHookPayload["email_data"]> = {}): AuthHookPayload {
  return {
    user: { id: "user-1", email: "ana@example.com", user_metadata: { first_name: "Ana" } },
    email_data: {
      token_hash: "gotrue-token-hash",
      redirect_to: "https://cumbre-dorada.osoria.help/auth/callback?intent=raw-intent-token",
      email_action_type: "signup",
      ...overrides,
    },
  }
}

describe("processAuthEmailHookPayload", () => {
  // D15: never calls Resend -- the injected deps have no such capability at
  // all (enqueueEmail is the only side effect), so this is structurally
  // guaranteed, not just asserted after the fact.
  it("enqueues signup-confirmation, resolving the store from the intent embedded in redirect_to", async () => {
    const deps = buildDeps({ peekAuthIntent: vi.fn().mockResolvedValue({ storeId: "store-from-intent", purpose: "signup" }) })

    const outcome = await processAuthEmailHookPayload("webhook-id-1", signupPayload(), deps)

    expect(outcome).toEqual({ enqueued: true })
    expect(deps.peekAuthIntent).toHaveBeenCalledWith("raw-intent-token")
    expect(deps.loadStoreIdentity).toHaveBeenCalledWith("store-from-intent")
    expect(deps.enqueueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: "store-from-intent",
        templateKind: "signup-confirmation",
        recipientEmail: "ana@example.com",
        idempotencyKey: "auth-hook:webhook-id-1",
        fromAddress: "Osoria <auth@mail.osoria.help>",
      }),
    )
  })

  it("enqueues password-recovery the same way", async () => {
    const deps = buildDeps({ peekAuthIntent: vi.fn().mockResolvedValue({ storeId: "store-from-intent", purpose: "recovery" }) })

    const outcome = await processAuthEmailHookPayload(
      "webhook-id-2",
      signupPayload({ email_action_type: "recovery", redirect_to: "https://cumbre-dorada.osoria.help/auth/reset-password?intent=raw-intent-token" }),
      deps,
    )

    expect(outcome).toEqual({ enqueued: true })
    expect(deps.enqueueEmail).toHaveBeenCalledWith(expect.objectContaining({ templateKind: "password-recovery" }))
  })

  // password_changed_notification carries no redirect_to/intent at all
  // (confirmed empirically against a real local GoTrue -- see
  // lib/email/auth-hook.ts's header comment): the ONLY store resolution
  // path available is the user's own profile.
  it("resolves password-changed via the user's profile home store, not an intent", async () => {
    const deps = buildDeps({ loadProfileHomeStore: vi.fn().mockResolvedValue("profile-home-store") })

    const outcome = await processAuthEmailHookPayload(
      "webhook-id-3",
      signupPayload({ email_action_type: "password_changed_notification", redirect_to: "", token_hash: "" }),
      deps,
    )

    expect(outcome).toEqual({ enqueued: true })
    expect(deps.peekAuthIntent).not.toHaveBeenCalled()
    expect(deps.loadStoreIdentity).toHaveBeenCalledWith("profile-home-store")
    expect(deps.enqueueEmail).toHaveBeenCalledWith(expect.objectContaining({ templateKind: "password-changed" }))
  })

  it.each([
    ["owner_invite", "owner-invite"],
    ["new_user_invite", "new-user-invite"],
  ] as const)("maps an invite event with a %s intent purpose to %s", async (purpose, kind) => {
    const deps = buildDeps({ peekAuthIntent: vi.fn().mockResolvedValue({ storeId: "store-from-intent", purpose }) })

    const outcome = await processAuthEmailHookPayload(
      "webhook-id-4",
      signupPayload({ email_action_type: "invite" }),
      deps,
    )

    expect(outcome).toEqual({ enqueued: true })
    expect(deps.enqueueEmail).toHaveBeenCalledWith(expect.objectContaining({ templateKind: kind }))
  })

  // D15: never blocks a legitimate GoTrue action for a kind outside D11's
  // catalog -- a graceful no-op, not an error.
  it("skips an action type outside the D11 catalog without enqueueing anything", async () => {
    const deps = buildDeps()

    const outcome = await processAuthEmailHookPayload(
      "webhook-id-5",
      signupPayload({ email_action_type: "magiclink" }),
      deps,
    )

    expect(outcome).toEqual({ enqueued: false, reason: "unhandled_action_type" })
    expect(deps.enqueueEmail).not.toHaveBeenCalled()
  })

  // The "auth.users is a shared pool" case from this slice's brief: no
  // matching intent AND no ecommerce profile for this user at all.
  it("skips gracefully when neither an intent nor a profile can resolve a store", async () => {
    const deps = buildDeps({ peekAuthIntent: vi.fn().mockResolvedValue(null), loadProfileHomeStore: vi.fn().mockResolvedValue(null) })

    const outcome = await processAuthEmailHookPayload("webhook-id-6", signupPayload(), deps)

    expect(outcome).toEqual({ enqueued: false, reason: "store_unresolved" })
    expect(deps.enqueueEmail).not.toHaveBeenCalled()
  })

  it("returns well within the five-second budget (D15)", async () => {
    const deps = buildDeps()
    const startedAt = Date.now()

    await processAuthEmailHookPayload("webhook-id-7", signupPayload(), deps)

    expect(Date.now() - startedAt).toBeLessThan(5000)
  })

  it("keys idempotency on the Standard Webhooks webhook-id, not GoTrue's own token_hash", async () => {
    const deps = buildDeps({ peekAuthIntent: vi.fn().mockResolvedValue({ storeId: "store-from-intent", purpose: "signup" }) })

    await processAuthEmailHookPayload("stable-webhook-id", signupPayload({ token_hash: "one-otp" }), deps)
    await processAuthEmailHookPayload("stable-webhook-id", signupPayload({ token_hash: "a-different-otp" }), deps)

    expect(deps.enqueueEmail).toHaveBeenNthCalledWith(1, expect.objectContaining({ idempotencyKey: "auth-hook:stable-webhook-id" }))
    expect(deps.enqueueEmail).toHaveBeenNthCalledWith(2, expect.objectContaining({ idempotencyKey: "auth-hook:stable-webhook-id" }))
  })
})
