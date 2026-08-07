import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { searchParamsGet, verifyOtp, logout } = vi.hoisted(() => ({
  searchParamsGet: vi.fn(),
  verifyOtp: vi.fn(),
  logout: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: searchParamsGet }),
}))

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ logout }) }))

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({ auth: { verifyOtp } }),
}))

import AcceptInvitePage from "@/app/auth/accept-invite/page"

// B7 + B8: each phase this flow shows is a full view swap -- it must expose
// exactly one page heading, live in a role="status" region, and move focus
// there so a screen-reader user (who never sees the spinner disappear) knows
// the content changed.
describe("AcceptInvitePage phase transitions (B7/B8)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("moves focus to the single heading of the resolved phase, inside a role=status live region", async () => {
    searchParamsGet.mockReturnValue("token-hash-1")
    verifyOtp.mockResolvedValue({ error: null })

    render(<AcceptInvitePage />)

    const heading = await screen.findByRole("heading", { level: 1, name: "Elige tu contraseña" })
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(heading.closest('[role="status"]')).toBeTruthy()
    await waitFor(() => expect(heading).toHaveFocus())
  })

  it("does the same for the rejected phase", async () => {
    searchParamsGet.mockReturnValue(null)

    render(<AcceptInvitePage />)

    const heading = await screen.findByRole("heading", { level: 1, name: "Enlace no válido" })
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(heading.closest('[role="status"]')).toBeTruthy()
    await waitFor(() => expect(heading).toHaveFocus())
  })
})
