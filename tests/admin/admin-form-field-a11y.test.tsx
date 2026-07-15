import { createElement, type ReactNode } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ChatbotConfigForm } from "@/app/admin/chatbot/components/chatbot-config-form"
import { AddMemberForm } from "@/app/admin/users/components/add-member-form"
import type { ChatbotConfigFormValues } from "@/lib/chatbot/schemas"

const saveChatbotConfigAction = vi.fn()
const addStoreMemberAction = vi.fn()

vi.mock("@/app/admin/chatbot/actions", () => ({
  saveChatbotConfigAction: (...args: unknown[]) => saveChatbotConfigAction(...args),
}))

vi.mock("@/app/admin/users/actions", () => ({
  addStoreMemberAction: (...args: unknown[]) => addStoreMemberAction(...args),
}))

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) =>
    createElement("a", { href }, children),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const CHATBOT_DEFAULTS: ChatbotConfigFormValues = {
  assistantGuide: "Guía",
  tone: "casual",
  temperature: "0.9",
  maxTokens: "700",
}

function describedByText(control: HTMLElement): string[] {
  const ids = control.getAttribute("aria-describedby")?.split(" ") ?? []
  return ids.map((id) => document.getElementById(id)?.textContent ?? "")
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("chatbot config form field wiring", () => {
  it("points every label at its control and describes it with its hint", () => {
    render(<ChatbotConfigForm defaultValues={CHATBOT_DEFAULTS} />)

    expect(describedByText(screen.getByLabelText("Temperatura (Creatividad)"))).toContain(
      "Valores más altos = más creativo (0.0 - 2.0)",
    )
    expect(describedByText(screen.getByLabelText("Máximo de Tokens"))).toContain(
      "Longitud máxima de las respuestas",
    )
    expect(screen.getByLabelText("Guía del asistente para clientes")).toBeInTheDocument()
  })

  it("keeps the temperature tooltip trigger outside the label, since a button inside one is invalid HTML", () => {
    const { container } = render(<ChatbotConfigForm defaultValues={CHATBOT_DEFAULTS} />)

    const label = container.querySelector('label[for="temperature"]')

    expect(label).not.toBeNull()
    expect(label?.querySelector("button")).toBeNull()
    expect(
      screen.getByRole("button", { name: "Información sobre temperatura" }),
    ).toBeInTheDocument()
  })

  it("marks an out-of-range temperature invalid and describes it with the error", async () => {
    const { container } = render(<ChatbotConfigForm defaultValues={CHATBOT_DEFAULTS} />)
    const temperature = screen.getByLabelText("Temperatura (Creatividad)")

    fireEvent.change(temperature, { target: { value: "9" } })
    fireEvent.submit(container.querySelector("form")!)

    await waitFor(() => expect(temperature).toHaveAttribute("aria-invalid", "true"))
    expect(describedByText(temperature)).toContain("La temperatura debe estar entre 0 y 2")
    expect(saveChatbotConfigAction).not.toHaveBeenCalled()
  })
})

describe("add member form field wiring", () => {
  it("points the email and role labels at their controls and describes the email hint", () => {
    render(<AddMemberForm />)

    expect(describedByText(screen.getByLabelText("Correo del usuario"))).toContain(
      "El usuario debe tener una cuenta registrada en la plataforma.",
    )
    expect(screen.getByLabelText("Rol en la tienda")).toBeInTheDocument()
  })

  it("marks an invalid email invalid and describes it with the error", async () => {
    const { container } = render(<AddMemberForm />)
    const email = screen.getByLabelText("Correo del usuario")

    fireEvent.change(email, { target: { value: "no-es-un-correo" } })
    fireEvent.submit(container.querySelector("form")!)

    await waitFor(() => expect(email).toHaveAttribute("aria-invalid", "true"))
    expect(describedByText(email)).toContain("Ingresa un correo válido")
    expect(addStoreMemberAction).not.toHaveBeenCalled()
  })
})
