import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import {
  appendLengthInstruction,
  buildChatbotStoreLookups,
  buildChatbotSystemPrompt,
  DEFAULT_CHATBOT_CONFIG,
  loadChatbotConfigForStore,
  resolveChatbotStore,
  type ChatbotConfig,
  type ChatbotPersistenceClient,
  type ChatbotStoreLookup,
} from "@/lib/supabase/chatbot-api"
import { ECOMMERCE_SCHEMA, ECOMMERCE_TABLES } from "@/lib/supabase/contract"
import { buildProductsContextFromList } from "@/lib/products/chat-product-context"

// En Vercel: dar más tiempo a la función (DeepSeek + Supabase pueden tardar). Plan Hobby máx 10s; Pro hasta 300s.
export const maxDuration = 30

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
const DEEPSEEK_MODEL = "deepseek-chat"

/** Cliente con service_role para leer catálogo (evita RLS). Usar solo para consultas de productos en el chat. */
function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null
  return createClient(supabaseUrl, serviceKey).schema(ECOMMERCE_SCHEMA)
}

async function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  const cookieStore = await cookies()
  
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // Las cookies pueden fallar durante el renderizado estático
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // Las cookies pueden fallar durante el renderizado estático
        }
      },
    },
  }).schema(ECOMMERCE_SCHEMA)
}

async function getRequestStoreLookups(request: NextRequest): Promise<ChatbotStoreLookup[]> {
  if (process.env.DISABLE_SUBDOMAIN_MULTI_TENANT === "true") {
    return buildChatbotStoreLookups({
      storeId: process.env.DEFAULT_STORE_ID || "default",
      host: request.headers.get("host"),
    })
  }

  try {
    const cookieStore = await cookies()

    return buildChatbotStoreLookups({
      forwardedStoreId: request.headers.get("x-store-id"),
      storeId: cookieStore.get("store_id")?.value ?? null,
      host: request.headers.get("host"),
    })
  } catch {
    return buildChatbotStoreLookups({
      forwardedStoreId: request.headers.get("x-store-id"),
      host: request.headers.get("host"),
    })
  }
}

// Función para obtener la configuración del chatbot
async function getChatbotConfig(
  request: NextRequest,
): Promise<{ config: ChatbotConfig; storeId: string | null }> {
  try {
    const supabase = getSupabaseServiceClient() ?? (await getSupabaseServerClient())
    if (!supabase) {
      return { config: { ...DEFAULT_CHATBOT_CONFIG }, storeId: null }
    }

    const { storeId, config } = await loadChatbotConfigForStore(
      supabase as unknown as ChatbotPersistenceClient,
      await getRequestStoreLookups(request),
    )

    return { config, storeId }
  } catch (error) {
    console.error("[Chat API] Error al obtener configuración:", error)
    return { config: { ...DEFAULT_CHATBOT_CONFIG }, storeId: null }
  }
}

// Palabras que indican que el usuario pregunta por el catálogo/productos de la tienda
const PRODUCT_QUESTION_KEYWORDS = [
  "productos", "producto", "catálogo", "catalogo", "qué tienen", "que tienen",
  "qué venden", "que venden", "listado", "oferta", "ofertas", "recomiéndame",
  "recomienda", "recomendación", "recomendaciones", "qué hay", "que hay",
  "cuáles tienen", "cuales tienen", "qué ofrecen", "que ofrecen", "artículos",
  "articulos", "mercancía", "mercancias", "ítems", "items", "inventario",
  "cuéntame", "cuentame", "cuénta", "cuenta", "información de", "informacion de",
  "sobre el", "sobre la", "sobre los", "sobre las", "qué es", "que es", "detalles",
  "características", "caracteristicas", "precio", "precios",
]

function isProductRelatedQuestion(message: string): boolean {
  const normalized = message.toLowerCase().trim()
  if (PRODUCT_QUESTION_KEYWORDS.some((keyword) => normalized.includes(keyword))) return true
  // Mensaje corto con 2+ palabras (ej. "Audífonos Alámbricos Clásicos") = probable nombre de producto
  const words = normalized.split(/\s+/).filter((w) => w.length >= 2)
  if (words.length >= 2 && message.length < 120) return true
  return false
}

// Normalizar texto para búsqueda: quitar acentos para que ilike encuentre "Audífonos" con "audifonos"
function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

// Cliente para leer productos: preferir service_role (evita RLS), si no hay, usar anon.
async function getSupabaseForProducts() {
  const service = getSupabaseServiceClient()
  if (service) return service
  return getSupabaseServerClient()
}

// Resolver el UUID de la tienda actual (para consultas). Supabase debe ser no null al llamar.
async function getEffectiveStoreUuid(
  supabase: ChatbotPersistenceClient,
  lookups: ChatbotStoreLookup[],
): Promise<string | null> {
  try {
    const store = await resolveChatbotStore(
      supabase,
      lookups,
    )
    return store.id
  } catch (error) {
    console.error("[Chat API] Error al resolver tienda para catálogo:", error)
    return null
  }
}

// Obtener productos de la tienda sin filtro de búsqueda, siempre acotados a la tienda resuelta.
async function getStoreProductsContext(storeUuid: string | null): Promise<string> {
  try {
    const supabase = await getSupabaseForProducts()
    if (!supabase) return ""

    if (!storeUuid) return ""

    const query = supabase
      .from(ECOMMERCE_TABLES.storeItems)
      .select("id, item_name, item_description, base_price, currency_code, metadata, item_slug")
      .eq("is_active", true)
      .eq("is_available_for_sale", true)
      .eq("store_id", storeUuid)
      .order("display_order", { ascending: true })
      .limit(30)

    const { data: products, error } = await query
    if (error || !products || products.length === 0) return ""

    return buildProductsContextFromList(products, true)
  } catch (error) {
    console.error("[Chat API] Error al obtener productos de la tienda:", error)
    return ""
  }
}

// Función para buscar productos relevantes según la pregunta del usuario (términos sin acentos para mejor coincidencia)
async function searchRelevantProducts(
  userMessage: string,
  storeUuid: string | null,
): Promise<string> {
  try {
    const supabase = await getSupabaseForProducts()
    if (!supabase) return ""

    if (!storeUuid) return ""

    let query = supabase
      .from(ECOMMERCE_TABLES.storeItems)
      .select("id, item_name, item_description, base_price, currency_code, metadata, item_slug")
      .eq("is_active", true)
      .eq("is_available_for_sale", true)
      .eq("store_id", storeUuid)
      .limit(15)

    const originalWords = userMessage.trim().split(/\s+/).filter((w) => w.length > 2)
    const normalizedMessage = normalizeForSearch(userMessage)
    const normalizedWords = normalizedMessage.split(/\s+/).filter((w) => w.length > 2)
    const allTerms = Array.from(new Set([...originalWords.map((w) => w.toLowerCase()), ...normalizedWords]))

    if (allTerms.length > 0) {
      const orConditions = allTerms.flatMap((term) => [
        `item_name.ilike.%${term}%`,
        `item_description.ilike.%${term}%`,
      ]).join(",")
      query = query.or(orConditions)
    }

    const { data: products, error } = await query
    if (error || !products || products.length === 0) return ""

    return buildProductsContextFromList(products, true)
  } catch (error) {
    console.error("[Chat API] Error al buscar productos:", error)
    return ""
  }
}

/** Asegura que la respuesta termine en oración completa: si está cortada, recorta al último . ! ? */
function trimToLastCompleteSentence(text: string, maxTokens: number): string {
  const t = text.trim()
  if (!t) return text

  const lastChar = t.slice(-1)
  const endsWell = lastChar === "." || lastChar === "!" || lastChar === "?" || lastChar === '"' || lastChar === "\n"
  if (endsWell) return text

  // La API cortó por límite de tokens: buscar el último final de oración y quedarnos hasta ahí
  const lastPeriod = t.lastIndexOf(".")
  const lastExcl = t.lastIndexOf("!")
  const lastQuestion = t.lastIndexOf("?")
  const lastEnd = Math.max(lastPeriod, lastExcl, lastQuestion)
  if (lastEnd > 0) return t.slice(0, lastEnd + 1).trim()

  // Si no hay ningún . ! ?, recortar por longitud aproximada para no mostrar texto claramente cortado
  const maxChars = Math.floor(maxTokens * 3)
  if (t.length > maxChars) return t.slice(0, maxChars).trim()
  return text
}

/** GET: comprobar si el servidor tiene configuradas las variables del chat (útil en Vercel). */
export async function GET() {
  const serviceRolePresent = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const deepSeekPresent = !!process.env.DEEPSEEK_API_KEY
  const ok = serviceRolePresent && deepSeekPresent

  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({
      ok,
      serviceRolePresent,
      deepSeekPresent,
      hint: !ok ? "En Vercel: Settings → Environment Variables. Añade SUPABASE_SERVICE_ROLE_KEY y DEEPSEEK_API_KEY para Production." : undefined,
    })
  }

  const supabase = getSupabaseServiceClient()
  if (!supabase) {
    return NextResponse.json({
      ok: false,
      serviceRolePresent,
      deepSeekPresent,
      productCount: 0,
      hint: "Revisa NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local",
    })
  }
  try {
    const { data: products, error } = await supabase
      .from(ECOMMERCE_TABLES.storeItems)
      .select("id, item_name")
      .eq("is_active", true)
      .eq("is_available_for_sale", true)
      .limit(50)
    if (error) {
      return NextResponse.json({
        ok: false,
        serviceRolePresent: true,
        deepSeekPresent,
        productCount: 0,
        error: error.message,
      })
    }
    const count = products?.length ?? 0
    return NextResponse.json({
      ok: true,
      serviceRolePresent: true,
      deepSeekPresent: true,
      productCount: count,
      productNames: products?.map((p: { item_name: string }) => p.item_name) ?? [],
    })
  } catch (e) {
    return NextResponse.json({
      ok: false,
      serviceRolePresent: true,
      deepSeekPresent,
      productCount: 0,
      error: e instanceof Error ? e.message : String(e),
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.DEEPSEEK_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "DeepSeek API key not configured" },
        { status: 500 }
      )
    }

    // Obtener configuración del chatbot y tienda resuelta
    const storeLookups = await getRequestStoreLookups(request)
    const { config, storeId } = await getChatbotConfig(request)
    
    // Obtener el último mensaje del usuario
    const lastUserMessage = messages
      .filter((msg: { sender: string }) => msg.sender === "user")
      .pop()?.text || ""

    // Cuando preguntan por productos/catálogo, SIEMPRE usar solo los productos reales de la tienda resuelta.
    const productSupabase = await getSupabaseForProducts()
    const storeUuid = productSupabase
      ? storeId ?? (await getEffectiveStoreUuid(
          productSupabase as unknown as ChatbotPersistenceClient,
          storeLookups,
        ))
      : null

    const isProductQuestion = lastUserMessage ? isProductRelatedQuestion(lastUserMessage) : false
    let productsContext = ""
    if (lastUserMessage) {
      productsContext = await searchRelevantProducts(lastUserMessage, storeUuid)
      if (!productsContext) productsContext = await getStoreProductsContext(storeUuid)
    }

    // Combinar la guía de la tienda con el catálogo real cuando exista. La guía nunca reemplaza datos reales.
    let systemPrompt = buildChatbotSystemPrompt({
      config,
      productsContext,
      isProductQuestion,
    })

    // Límite de tokens: pedir al modelo que no supere el tope y que siempre cierre con oración completa
    const maxTokens = config.maxTokens ?? 500
    systemPrompt = appendLengthInstruction(systemPrompt, maxTokens)

    // Pequeño margen extra de tokens para que la última oración pueda completarse (luego recortamos si hace falta)
    const maxTokensForApi = maxTokens + 80

    // Preparar mensajes para DeepSeek
    // Agregar mensaje del sistema al inicio
    const deepseekMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages.map((msg: { text: string; sender: string }) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text,
      })),
    ]

    // Llamar a la API de DeepSeek
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: deepseekMessages,
        temperature: config.temperature,
        max_tokens: maxTokensForApi,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[Chat API] DeepSeek error:", errorData)
      return NextResponse.json(
        { error: "Failed to get response from DeepSeek", details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extraer la respuesta del asistente
    let assistantMessage = data.choices?.[0]?.message?.content

    if (!assistantMessage) {
      return NextResponse.json(
        { error: "No response from DeepSeek" },
        { status: 500 }
      )
    }

    // Si la API cortó por límite de tokens, recortar en el último final de oración para no dejar la frase a medias
    const trimmed = trimToLastCompleteSentence(assistantMessage, maxTokens)
    if (trimmed !== assistantMessage) assistantMessage = trimmed

    // Quitar marcado Markdown de negrita (**) de la respuesta
    assistantMessage = assistantMessage.replace(/\*\*/g, "")

    return NextResponse.json({ message: assistantMessage })
  } catch (error) {
    console.error("[Chat API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
