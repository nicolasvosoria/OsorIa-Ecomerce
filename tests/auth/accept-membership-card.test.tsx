import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { acceptMembershipInviteAction, toastError } = vi.hoisted(() => ({
  acceptMembershipInviteAction: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock("@/app/auth/accept-membership/actions", () => ({ acceptMembershipInviteAction }))
vi.mock("sonner", () => ({ toast: { error: toastError } }))

import { AcceptMembershipCard } from "@/app/auth/accept-membership/accept-membership-card"

function acceptButton(): HTMLElement {
  return screen.getByRole("button", { name: "Aceptar invitación" })
}

describe("AcceptMembershipCard (B5)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("accepts and shows the activated card on outcome 'accepted'", async () => {
    acceptMembershipInviteAction.mockResolvedValue({ outcome: "accepted" })
    const user = userEvent.setup()
    render(<AcceptMembershipCard token="token-1" />)

    await user.click(acceptButton())

    expect(await screen.findByRole("heading", { name: "Acceso activado" })).toBeInTheDocument()
  })

  // B8: outcome swaps the whole card -- the previous heading (and the button
  // it held) is destroyed, so the new one needs a live region and focus.
  it("announces each outcome swap as a live region and moves focus to its heading", async () => {
    acceptMembershipInviteAction.mockResolvedValue({ outcome: "accepted" })
    const user = userEvent.setup()
    render(<AcceptMembershipCard token="token-1" />)

    await user.click(acceptButton())

    const heading = await screen.findByRole("heading", { name: "Acceso activado" })
    expect(heading.closest('[role="status"]')).toBeTruthy()
    await waitFor(() => expect(heading).toHaveFocus())
  })

  // The core of B5: a transient failure (network timeout, RPC unreachable)
  // must NOT destroy the button -- membership is only ever granted by this
  // one click (D21), so losing the button loses the whole flow.
  it("keeps the accept button after a transport failure instead of showing the terminal invalid-link card", async () => {
    acceptMembershipInviteAction.mockResolvedValue({
      outcome: "unavailable",
      error: "No pudimos completar la solicitud. Intenta de nuevo.",
    })
    const user = userEvent.setup()
    render(<AcceptMembershipCard token="token-1" />)

    await user.click(acceptButton())

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("No pudimos completar la solicitud. Intenta de nuevo."))
    expect(screen.getByRole("heading", { name: "Tienes una invitación" })).toBeInTheDocument()
    expect(acceptButton()).toBeEnabled()
    expect(screen.queryByRole("heading", { name: "Enlace no válido" })).not.toBeInTheDocument()
  })

  // Only a genuine, confirmed rejection earns the terminal card -- and even
  // that branch keeps a way out instead of a dead end.
  it("shows the terminal invalid-link card, with an exit, only on a genuine 'invalid' outcome", async () => {
    acceptMembershipInviteAction.mockResolvedValue({
      outcome: "invalid",
      error: "Este enlace no es válido, ya se usó o ya expiró.",
    })
    const user = userEvent.setup()
    render(<AcceptMembershipCard token="token-1" />)

    await user.click(acceptButton())

    expect(await screen.findByRole("heading", { name: "Enlace no válido" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ir a administración" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Aceptar invitación" })).not.toBeInTheDocument()
  })
})
