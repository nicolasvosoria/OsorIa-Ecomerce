import { redirect } from "next/navigation"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { loadChatbotConfigForStore } from "@/lib/supabase/chatbot-api"
import { ChatbotConfigForm } from "./components/chatbot-config-form"

// La guía se lee aquí y no en el formulario: un fetch desde el navegador no
// puede leer la cookie firmada de tienda activa, así que resolvía la tienda del
// host y mostraba la guía de una tienda mientras saveChatbotConfigAction
// escribía en otra.
export default async function ChatbotConfigPage() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const { supabase, storeId } = authorization
  const { config } = await loadChatbotConfigForStore(supabase, { kind: "id", value: storeId })

  return (
    <AdminPageContainer maxWidth="4xl">
      <AdminPageHeader
        title="Chat / Asistente IA"
        subtitle="Configura la guía que usará el asistente para clientes de esta tienda"
      />
      <ChatbotConfigForm
        defaultValues={{
          assistantGuide: config.assistantGuide,
          tone: config.tone,
          temperature: String(config.temperature),
          maxTokens: String(config.maxTokens),
        }}
      />
    </AdminPageContainer>
  )
}
