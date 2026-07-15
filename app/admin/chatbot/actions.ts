"use server"

import { revalidatePath } from "next/cache"

import type { AdminActionResult } from "@/lib/admin/action-result"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { saveChatbotConfigForStore } from "@/lib/supabase/chatbot-api"
import type { ChatbotConfigFormValues } from "@/lib/chatbot/schemas"

const CHATBOT_CONFIG_PATH = "/admin/chatbot"
const SAVE_ERROR_MESSAGE = "Error al guardar la configuración"

export async function saveChatbotConfigAction(
  input: ChatbotConfigFormValues,
): Promise<AdminActionResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization

  try {
    await saveChatbotConfigForStore(supabase, { kind: "id", value: storeId }, {
      assistantGuide: input.assistantGuide,
      tone: input.tone,
      temperature: Number.parseFloat(input.temperature),
      maxTokens: Number.parseInt(input.maxTokens, 10),
    })
  } catch (error) {
    console.error("[Chatbot Config Action] Error al guardar:", error)
    return { success: false, error: SAVE_ERROR_MESSAGE }
  }

  revalidatePath(CHATBOT_CONFIG_PATH)
  return { success: true }
}
