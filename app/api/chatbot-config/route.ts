import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

import {
  loadChatbotConfigForStore,
  saveChatbotConfigForStore,
  type ChatbotPersistenceClient,
} from "@/lib/supabase/chatbot-api"
import { authorizeStoreAdmin } from "@/lib/supabase/admin-route-guard"
import { ECOMMERCE_SCHEMA } from "@/lib/supabase/contract"

function getChatbotServiceClient(): ChatbotPersistenceClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).schema(ECOMMERCE_SCHEMA) as unknown as ChatbotPersistenceClient
}

async function getAuthorizedContext(
  request: NextRequest,
): Promise<
  | { ecommerceClient: ChatbotPersistenceClient; storeId: string }
  | { error: string; status: 401 | 403 | 500 }
> {
  const ecommerceClient = getChatbotServiceClient()
  if (!ecommerceClient) {
    return { error: "Supabase no configurado", status: 500 }
  }

  const auth = await authorizeStoreAdmin(request, ecommerceClient)
  if ("error" in auth) {
    return { error: auth.error, status: auth.status }
  }

  return { ecommerceClient, storeId: auth.storeId }
}

function asNotFoundResponse(error: unknown) {
  if (error instanceof Error && error.message === "Tienda no encontrada") {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return null
}

// GET - Obtener configuración del chatbot para la tienda actual
export async function GET(request: NextRequest) {
  try {
    const authorized = await getAuthorizedContext(request)
    if (!("ecommerceClient" in authorized)) {
      return NextResponse.json(
        { error: authorized.error },
        { status: authorized.status },
      )
    }

    const { storeId, config } = await loadChatbotConfigForStore(
      authorized.ecommerceClient,
      { kind: "id", value: authorized.storeId },
    )

    return NextResponse.json({ config, storeId })
  } catch (error) {
    const notFoundResponse = asNotFoundResponse(error)
    if (notFoundResponse) return notFoundResponse

    console.error("[Chatbot Config API] Error al obtener configuración:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    )
  }
}

// POST - Guardar configuración del chatbot para la tienda actual
export async function POST(request: NextRequest) {
  try {
    const authorized = await getAuthorizedContext(request)
    if (!("ecommerceClient" in authorized)) {
      return NextResponse.json(
        { error: authorized.error },
        { status: authorized.status },
      )
    }

    const body = await request.json()
    const { storeId, config } = await saveChatbotConfigForStore(
      authorized.ecommerceClient,
      { kind: "id", value: authorized.storeId },
      body?.config,
    )

    return NextResponse.json({ success: true, config, storeId })
  } catch (error) {
    const notFoundResponse = asNotFoundResponse(error)
    if (notFoundResponse) return notFoundResponse

    console.error("[Chatbot Config API] Error al guardar configuración:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    )
  }
}
