import { type ComponentProps, type ReactElement } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ChatbotConfigForm } from "@/app/admin/chatbot/components/chatbot-config-form"

const { authorizeActiveStoreAdmin, loadChatbotConfigForStore, redirect } = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  loadChatbotConfigForStore: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/supabase/chatbot-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/chatbot-api")>()
  return { ...actual, loadChatbotConfigForStore }
})
vi.mock("next/navigation", () => ({ redirect }))

import ChatbotConfigPage from "@/app/admin/chatbot/page"
import { findElementOfType } from "./_helpers/find-element-of-type"

const SERVICE = { marker: "service-client" }
const GRANT = { supabase: SERVICE, storeId: "store-1", userId: "user-1" }

describe("ChatbotConfigPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeActiveStoreAdmin.mockResolvedValue(GRANT)
    loadChatbotConfigForStore.mockResolvedValue({
      storeId: "store-1",
      config: {
        assistantGuide: "Guía de la tienda activa",
        systemPrompt: "Guía de la tienda activa",
        tone: "casual",
        temperature: 0.9,
        maxTokens: 700,
      },
    })
  })

  it("reads the config from the active store, the same store the save action writes to", async () => {
    const page = await ChatbotConfigPage()

    expect(loadChatbotConfigForStore).toHaveBeenCalledWith(SERVICE, {
      kind: "id",
      value: "store-1",
    })

    const form = findElementOfType(page, ChatbotConfigForm) as ReactElement<
      ComponentProps<typeof ChatbotConfigForm>
    > | null

    expect(form?.props.defaultValues).toEqual({
      assistantGuide: "Guía de la tienda activa",
      tone: "casual",
      temperature: "0.9",
      maxTokens: "700",
    })
  })

  it("redirects instead of reading when the active store admin gate denies access", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })
    redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT")
    })

    await expect(ChatbotConfigPage()).rejects.toThrow("NEXT_REDIRECT")

    expect(redirect).toHaveBeenCalledWith("/")
    expect(loadChatbotConfigForStore).not.toHaveBeenCalled()
  })
})
