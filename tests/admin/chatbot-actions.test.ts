import { beforeEach, describe, expect, it, vi } from "vitest"

const { authorizeActiveStoreAdmin, saveChatbotConfigForStore, revalidatePath } = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  saveChatbotConfigForStore: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/supabase/chatbot-api", () => ({ saveChatbotConfigForStore }))
vi.mock("next/cache", () => ({ revalidatePath }))

import { saveChatbotConfigAction } from "@/app/admin/chatbot/actions"
import type { ChatbotConfigFormValues } from "@/lib/chatbot/schemas"

const SERVICE = { marker: "service-client" }
const GRANT = { supabase: SERVICE, storeId: "store-1", userId: "user-1" }

const baseInput: ChatbotConfigFormValues = {
  assistantGuide: "Sé cercano y no inventes precios ni stock.",
  tone: "friendly",
  temperature: "0.8",
  maxTokens: "600",
}

describe("chatbot config server action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeActiveStoreAdmin.mockResolvedValue(GRANT)
    saveChatbotConfigForStore.mockResolvedValue({ storeId: "store-1", config: {} })
  })

  it("saves the config scoped to the active store with parsed numeric fields", async () => {
    const result = await saveChatbotConfigAction(baseInput)

    expect(result).toEqual({ success: true })
    expect(saveChatbotConfigForStore).toHaveBeenCalledWith(
      SERVICE,
      { kind: "id", value: "store-1" },
      {
        assistantGuide: baseInput.assistantGuide,
        tone: "friendly",
        temperature: 0.8,
        maxTokens: 600,
      },
    )
    expect(revalidatePath).toHaveBeenCalledWith("/admin/chatbot")
  })

  it("refuses to save when authorization is denied", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })

    const result = await saveChatbotConfigAction(baseInput)

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(saveChatbotConfigForStore).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("returns a generic error and does not revalidate when persistence throws", async () => {
    saveChatbotConfigForStore.mockRejectedValue(new Error("Tienda no encontrada"))

    const result = await saveChatbotConfigAction(baseInput)

    expect(result).toEqual({ success: false, error: "Error al guardar la configuración" })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
