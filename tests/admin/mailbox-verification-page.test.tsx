import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { getSupabaseServiceClient, confirmStoreMailboxVerification } = vi.hoisted(() => ({
  getSupabaseServiceClient: vi.fn(),
  confirmStoreMailboxVerification: vi.fn(),
}))

vi.mock("@/lib/supabase/admin-store", () => ({ getSupabaseServiceClient }))
vi.mock("@/lib/supabase/store-identity-api", () => ({ confirmStoreMailboxVerification }))

import MailboxVerificationPage from "@/app/auth/mailbox-verification/page"

describe("MailboxVerificationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("confirms the token and names the field that was verified", async () => {
    getSupabaseServiceClient.mockReturnValue({})
    confirmStoreMailboxVerification.mockResolvedValue({ ok: true, field: "order_mailbox" })

    const page = await MailboxVerificationPage({ searchParams: Promise.resolve({ token: "plaintext-token" }) })
    render(page)

    expect(confirmStoreMailboxVerification).toHaveBeenCalledWith({}, "plaintext-token")
    expect(screen.getByText("Correo confirmado")).toBeInTheDocument()
    expect(screen.getByText(/buzón de pedidos/)).toBeInTheDocument()
  })

  it("shows a generic invalid-link message without saying WHY (no enumeration), matching D24's posture", async () => {
    getSupabaseServiceClient.mockReturnValue({})
    confirmStoreMailboxVerification.mockResolvedValue({ ok: false })

    const page = await MailboxVerificationPage({ searchParams: Promise.resolve({ token: "expired-or-reused" }) })
    render(page)

    expect(screen.getByText("Enlace no válido")).toBeInTheDocument()
  })

  it("never calls the confirmation RPC when the URL has no token", async () => {
    getSupabaseServiceClient.mockReturnValue({})

    const page = await MailboxVerificationPage({ searchParams: Promise.resolve({}) })
    render(page)

    expect(confirmStoreMailboxVerification).not.toHaveBeenCalled()
    expect(screen.getByText("Enlace no válido")).toBeInTheDocument()
  })
})
