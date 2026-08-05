import { beforeEach, describe, expect, it, vi } from "vitest"

const { authorizeActiveStoreAdmin, revalidatePath, loadStoreIdentity, renderEmail, createVerificationToken } = vi.hoisted(
  () => ({
    authorizeActiveStoreAdmin: vi.fn(),
    revalidatePath: vi.fn(),
    loadStoreIdentity: vi.fn(),
    renderEmail: vi.fn(),
    createVerificationToken: vi.fn(),
  }),
)

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("@/lib/supabase/store-identity-api", () => ({ loadStoreIdentity }))
vi.mock("@/lib/email/render", () => ({ renderEmail }))
vi.mock("@/lib/security/verification-token", () => ({ createVerificationToken }))

import { requestMailboxVerification, updateStoreIdentityFields } from "@/app/admin/actions/store-identity"

const ACTIVE_STORE_ID = "store-active-1"
const DENIAL = { error: "Acceso denegado", status: 403 as const }

function createSupabaseMock(options: { upsertError?: unknown; updateError?: unknown; rpcResult?: unknown } = {}) {
  const eq = vi.fn().mockResolvedValue({ error: options.updateError ?? null })
  const update = vi.fn(() => ({ eq }))
  const upsert = vi.fn().mockResolvedValue({ error: options.upsertError ?? null })
  const rpc = vi.fn().mockResolvedValue(options.rpcResult ?? { data: { ok: true }, error: null })
  const from = vi.fn(() => ({ update, upsert }))
  return { from, update, eq, upsert, rpc }
}

describe("updateStoreIdentityFields", () => {
  let supabase: ReturnType<typeof createSupabaseMock>

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = createSupabaseMock()
    authorizeActiveStoreAdmin.mockResolvedValue({ supabase, storeId: ACTIVE_STORE_ID, userId: "owner-1" })
  })

  it("rejects input that fails schema validation before ever calling the gate", async () => {
    const result = await updateStoreIdentityFields({ legalName: "", phone: "3000000000", commercialAddress: "Bogotá" })

    expect(result).toEqual({ success: false, error: "Los datos no son válidos. Revisa el formulario e intenta de nuevo." })
    expect(authorizeActiveStoreAdmin).not.toHaveBeenCalled()
  })

  it("writes legal_name on stores and phone/address on store_contact for the ACTIVE store only", async () => {
    const result = await updateStoreIdentityFields({
      legalName: "Cumbre Dorada S.A.S.",
      phone: "3000000000",
      commercialAddress: "Bogotá, Colombia",
    })

    expect(result).toEqual({ success: true })
    expect(supabase.from).toHaveBeenCalledWith("stores")
    expect(supabase.update).toHaveBeenCalledWith({ legal_name: "Cumbre Dorada S.A.S." })
    expect(supabase.eq).toHaveBeenCalledWith("id", ACTIVE_STORE_ID)
    expect(supabase.from).toHaveBeenCalledWith("store_contact")
    expect(supabase.upsert).toHaveBeenCalledWith(
      { store_id: ACTIVE_STORE_ID, contact_phone: "3000000000", address: "Bogotá, Colombia" },
      { onConflict: "store_id" },
    )
    expect(revalidatePath).toHaveBeenCalledWith("/admin/settings")
  })

  it("refuses when the caller does not manage the active store", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue(DENIAL)

    const result = await updateStoreIdentityFields({
      legalName: "x",
      phone: "1",
      commercialAddress: "y",
    })

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(supabase.from).not.toHaveBeenCalled()
  })
})

describe("requestMailboxVerification", () => {
  const identity = {
    displayName: "Cumbre Dorada Café",
    subdomain: "cumbre-dorada",
    primaryColor: "#5daba8",
    commercialAddress: "Bogotá, Colombia",
    contactEmail: "hola@cumbre.example",
  }

  let supabase: ReturnType<typeof createSupabaseMock>

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = createSupabaseMock()
    authorizeActiveStoreAdmin.mockResolvedValue({ supabase, storeId: ACTIVE_STORE_ID, userId: "owner-1" })
    loadStoreIdentity.mockResolvedValue(identity)
    renderEmail.mockResolvedValue({ subject: "Confirma un correo", html: "<p>h</p>", text: "t" })
    createVerificationToken.mockReturnValue({ token: "plaintext-token", tokenHash: "hashed-token" })
  })

  it("rejects an invalid field or malformed email before calling the gate", async () => {
    const result = await requestMailboxVerification({ field: "billing", email: "not-an-email" })

    expect(result.success).toBe(false)
    expect(authorizeActiveStoreAdmin).not.toHaveBeenCalled()
  })

  it("renders the verification email and calls the RPC with the hashed token, never the plaintext", async () => {
    const result = await requestMailboxVerification({ field: "reply_to", email: "pedidos@cumbre.example" })

    expect(result).toEqual({ success: true })
    expect(renderEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "store-mailbox-verification",
        data: { purpose: "reply_to", actionPath: "/auth/mailbox-verification?token=plaintext-token" },
      }),
    )
    expect(supabase.rpc).toHaveBeenCalledWith(
      "request_store_mailbox_verification",
      expect.objectContaining({
        p_actor_user_id: "owner-1",
        p_store_id: ACTIVE_STORE_ID,
        p_field: "reply_to",
        p_new_email: "pedidos@cumbre.example",
        p_token_hash: "hashed-token",
        p_email_subject: "Confirma un correo",
        p_email_html: "<p>h</p>",
        p_email_text: "t",
      }),
    )
    const [, args] = supabase.rpc.mock.calls[0]
    expect(args.p_idempotency_key).not.toContain("plaintext-token")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/settings")
  })

  it("surfaces the rate-limit reason as a friendly Spanish message and skips revalidation", async () => {
    supabase = createSupabaseMock({ rpcResult: { data: { ok: false, reason: "rate_limited" }, error: null } })
    authorizeActiveStoreAdmin.mockResolvedValue({ supabase, storeId: ACTIVE_STORE_ID, userId: "owner-1" })

    const result = await requestMailboxVerification({ field: "order_mailbox", email: "pedidos@cumbre.example" })

    expect(result).toEqual({
      success: false,
      error: "Ya enviamos un enlace hace poco. Espera un momento antes de volver a intentarlo.",
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("refuses when the caller does not manage the active store, and never renders or calls the RPC", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue(DENIAL)

    const result = await requestMailboxVerification({ field: "reply_to", email: "pedidos@cumbre.example" })

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(renderEmail).not.toHaveBeenCalled()
  })
})
