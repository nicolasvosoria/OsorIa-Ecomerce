import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// En Vercel: dar más tiempo a la función (DeepSeek + Supabase pueden tardar). Plan Hobby máx 10s; Pro hasta 300s.
export const maxDuration = 30

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
const DEEPSEEK_MODEL = "deepseek-chat"

// Prompt por defecto del sistema para el chatbot
const DEFAULT_SYSTEM_PROMPT = `Eres un asistente virtual amigable y profesional de una tienda en línea. Tu objetivo es ayudar a los clientes con:

1. Información sobre productos y catálogo
2. Proceso de compra y carrito de compras
3. Métodos de pago disponibles
4. Información sobre envíos y entregas
5. Horarios de atención
6. Registro de cuenta y login
7. Personalización de temas y fuentes
8. Cualquier otra consulta relacionada con la tienda

Sé conciso, amigable y profesional. Responde en español. Si no sabes algo específico, ofrece contactar con el equipo de soporte.`

/** Cliente con service_role para leer catálogo (evita RLS). Usar solo para consultas de productos en el chat. */
function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null
  return createClient(supabaseUrl, serviceKey)
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
        } catch (error) {
          // Las cookies pueden fallar durante el renderizado estático
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // Las cookies pueden fallar durante el renderizado estático
        }
      },
    },
  })
}

async function getStoreIdFromServer(): Promise<string | null> {
  const disableMultiTenant = process.env.DISABLE_SUBDOMAIN_MULTI_TENANT === 'true'
  if (disableMultiTenant) {
    return process.env.DEFAULT_STORE_ID || 'default'
  }

  try {
    const cookieStore = await cookies()
    const storeIdCookie = cookieStore.get('store_id')
    if (storeIdCookie) return storeIdCookie.value
  } catch (error) {
    return 'default'
  }
  
  return 'default'
}

// Función para obtener la configuración del chatbot
async function getChatbotConfig() {
  try {
    const supabase = await getSupabaseServerClient()
    if (!supabase) {
      return {
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        tone: "friendly",
        temperature: 0.7,
        maxTokens: 500,
      }
    }

    const storeId = await getStoreIdFromServer()

    let query = supabase
      .from('stores')
      .select('metadata')
      .eq('is_active', true)
      .is('deleted_at', null)

    if (storeId === 'default') {
      query = query.eq('subdomain', 'default')
    } else {
      query = query.eq('id', storeId)
    }

    const { data, error } = await query.single()

    if (error || !data) {
      return {
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        tone: "friendly",
        temperature: 0.7,
        maxTokens: 500,
      }
    }

    const metadata = (data.metadata as Record<string, any>) || {}
    const chatbotConfig = metadata.chatbot

    if (!chatbotConfig) {
      return {
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        tone: "friendly",
        temperature: 0.7,
        maxTokens: 500,
      }
    }

    // Combinar con valores por defecto
    return {
      systemPrompt: chatbotConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      tone: chatbotConfig.tone || "friendly",
      temperature: chatbotConfig.temperature ?? 0.7,
      maxTokens: chatbotConfig.maxTokens ?? 500,
    }
  } catch (error) {
    console.error("[Chat API] Error al obtener configuración:", error)
    return {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      tone: "friendly",
      temperature: 0.7,
      maxTokens: 500,
    }
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

// Construir el texto de contexto a partir de una lista de productos
function buildProductsContextFromList(products: any[], strictCatalog: boolean): string {
  if (!products || products.length === 0) return ""

  const productsInfo = products.map((product: any) => {
    const metadata = (product.metadata as Record<string, any>) || {}
    const aiDetails = metadata.ai_details || ""

    let productInfo = `- ${product.item_name}`
    if (product.base_price) {
      productInfo += ` (Precio: ${product.base_price} ${product.currency_code || "COP"})`
    }
    if (product.item_description) {
      productInfo += `\n  Descripción: ${product.item_description.substring(0, 200)}${product.item_description.length > 200 ? "..." : ""}`
    }
    if (aiDetails) {
      productInfo += `\n  Detalles y características: ${aiDetails}`
    }
    return productInfo
  }).join("\n\n")

  const strictInstruction = strictCatalog
    ? "\n\nREGLA OBLIGATORIA para preguntas sobre productos: Responde SOLO con la información de la lista anterior (nombre, precio, descripción, Detalles y características). No inventes características, no uses textos de otra marca ni descripciones genéricas. Si un producto tiene 'Detalles y características', copia o parafrasea exactamente esa información al hablar de ese producto."
    : ""

  return `\n\nInformación de productos de la tienda (usa SOLO esta información):\n${productsInfo}\n\nInstrucciones: Responde usando únicamente los productos listados. Para características, especificaciones, materiales o detalles, usa la sección "Detalles y características" cuando exista; si no, usa la descripción y el nombre.${strictInstruction}`
}

// Cliente para leer productos: preferir service_role (evita RLS), si no hay, usar anon.
async function getSupabaseForProducts() {
  const service = getSupabaseServiceClient()
  if (service) return service
  return getSupabaseServerClient()
}

// Resolver el UUID de la tienda actual (para consultas). Supabase debe ser no null al llamar.
async function getEffectiveStoreUuid(supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>): Promise<string | null> {
  const storeId = await getStoreIdFromServer()
  if (storeId && storeId !== "default") return storeId
  const { data: defaultStore } = await supabase
    .from("stores")
    .select("id")
    .eq("subdomain", "default")
    .eq("is_active", true)
    .is("deleted_at", null)
    .single()
  return defaultStore?.id ?? null
}

// Obtener productos de la tienda sin filtro de búsqueda. Si la tienda no tiene productos, intenta con cualquier tienda (fallback).
async function getStoreProductsContext(): Promise<string> {
  try {
    const supabase = await getSupabaseForProducts()
    if (!supabase) return ""

    const storeUuid = await getEffectiveStoreUuid(supabase)

    let query = supabase
      .from("store_items")
      .select("id, item_name, item_description, base_price, currency_code, metadata, item_slug")
      .eq("is_active", true)
      .eq("is_available_for_sale", true)
      .order("display_order", { ascending: true })
      .limit(30)

    if (storeUuid) query = query.eq("store_id", storeUuid)

    let { data: products, error } = await query
    // Si no hay productos en la tienda actual, fallback: obtener de cualquier tienda (para no devolver prompt genérico)
    if ((error || !products || products.length === 0) && storeUuid) {
      const fallback = await supabase
        .from("store_items")
        .select("id, item_name, item_description, base_price, currency_code, metadata, item_slug")
        .eq("is_active", true)
        .eq("is_available_for_sale", true)
        .order("display_order", { ascending: true })
        .limit(30)
      products = fallback.data
      error = fallback.error
    }
    if (error || !products || products.length === 0) return ""

    return buildProductsContextFromList(products, true)
  } catch (error) {
    console.error("[Chat API] Error al obtener productos de la tienda:", error)
    return ""
  }
}

/** Último recurso: obtener productos con service_role sin filtro de tienda (para evitar "catálogo no disponible"). */
async function getAnyProductsContext(): Promise<string> {
  const supabase = getSupabaseServiceClient()
  if (!supabase) return ""
  try {
    const { data: products, error } = await supabase
      .from("store_items")
      .select("id, item_name, item_description, base_price, currency_code, metadata, item_slug")
      .eq("is_active", true)
      .eq("is_available_for_sale", true)
      .order("display_order", { ascending: true })
      .limit(30)
    if (error || !products || products.length === 0) return ""
    return buildProductsContextFromList(products, true)
  } catch (error) {
    console.error("[Chat API] Error en getAnyProductsContext:", error)
    return ""
  }
}

// Función para buscar productos relevantes según la pregunta del usuario (términos sin acentos para mejor coincidencia)
async function searchRelevantProducts(userMessage: string): Promise<string> {
  try {
    const supabase = await getSupabaseForProducts()
    if (!supabase) return ""

    const storeUuid = await getEffectiveStoreUuid(supabase)

    let query = supabase
      .from("store_items")
      .select("id, item_name, item_description, base_price, currency_code, metadata, item_slug")
      .eq("is_active", true)
      .eq("is_available_for_sale", true)
      .limit(15)

    if (storeUuid) query = query.eq("store_id", storeUuid)

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

// Función para ajustar el prompt según el tono
function adjustPromptForTone(prompt: string, tone: string): string {
  const toneInstructions: Record<string, string> = {
    professional: "Mantén un tono profesional, formal y respetuoso en todas tus respuestas.",
    friendly: "Mantén un tono amigable, cálido y cercano en todas tus respuestas.",
    casual: "Mantén un tono casual, relajado y conversacional en todas tus respuestas.",
    formal: "Mantén un tono formal, estricto y protocolario en todas tus respuestas.",
  }

  const toneInstruction = toneInstructions[tone] || toneInstructions.friendly
  return `${prompt}\n\n${toneInstruction}`
}

/** GET: diagnóstico para comprobar que el chat puede leer el catálogo (solo en desarrollo). */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Solo en desarrollo" }, { status: 404 })
  }
  const supabase = getSupabaseServiceClient()
  const serviceRolePresent = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  if (!supabase) {
    return NextResponse.json({
      ok: false,
      serviceRolePresent,
      productCount: 0,
      hint: "Revisa NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local",
    })
  }
  try {
    const { data: products, error } = await supabase
      .from("store_items")
      .select("id, item_name")
      .eq("is_active", true)
      .eq("is_available_for_sale", true)
      .limit(50)
    if (error) {
      return NextResponse.json({
        ok: false,
        serviceRolePresent: true,
        productCount: 0,
        error: error.message,
      })
    }
    const count = products?.length ?? 0
    return NextResponse.json({
      ok: true,
      serviceRolePresent: true,
      productCount: count,
      productNames: products?.map((p: { item_name: string }) => p.item_name) ?? [],
    })
  } catch (e) {
    return NextResponse.json({
      ok: false,
      serviceRolePresent: true,
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

    // Obtener configuración del chatbot
    const config = await getChatbotConfig()
    
    // Obtener el último mensaje del usuario
    const lastUserMessage = messages
      .filter((msg: { sender: string }) => msg.sender === "user")
      .pop()?.text || ""

    // Cuando preguntan por productos/catálogo, SIEMPRE usar solo los productos de la tienda (BD)
    let productsContext = ""
    if (lastUserMessage) {
      if (isProductRelatedQuestion(lastUserMessage)) {
        productsContext = await searchRelevantProducts(lastUserMessage)
        if (!productsContext) productsContext = await getStoreProductsContext()
        // Último recurso: service_role sin filtro de tienda (por si RLS o cookie deja la tienda sin productos)
        if (!productsContext) productsContext = await getAnyProductsContext()
      } else {
        productsContext = await searchRelevantProducts(lastUserMessage)
        if (!productsContext) productsContext = await getStoreProductsContext()
      }
    }

    // Combinar instrucciones del sistema de la tienda (tono, estilo, temas) con el catálogo real cuando exista.
    const isProductQuestion = lastUserMessage ? isProductRelatedQuestion(lastUserMessage) : false
    let systemPrompt: string
    if (productsContext) {
      // Instrucciones de la tienda (cómo responder, tono, qué temas cubrir) + catálogo real
      const storeInstructions = adjustPromptForTone(config.systemPrompt, config.tone)
      systemPrompt =
        storeInstructions +
        "\n\n--- Catálogo de la tienda (usa SOLO esta información para productos) ---\n" +
        "Para preguntas sobre productos o catálogo, usa ÚNICAMENTE la siguiente lista. No inventes productos ni descripciones que no estén aquí. Responde con nombre, precio y 'Detalles y características' cuando existan.\n" +
        productsContext
    } else if (isProductQuestion) {
      systemPrompt =
        DEFAULT_SYSTEM_PROMPT +
        "\n\nSi te preguntan por productos o catálogo, responde que en este momento no tienes el catálogo disponible y que pueden navegar por la tienda o intentar de nuevo en unos segundos."
    } else {
      systemPrompt = adjustPromptForTone(config.systemPrompt, config.tone)
    }

    // Límite de tokens: pedir al modelo que no supere el tope y que siempre cierre con oración completa
    const maxTokens = config.maxTokens ?? 500
    const approxWords = Math.floor(maxTokens * 0.75)
    const lengthInstruction = `\n\nLímite de longitud: tu respuesta debe tener como máximo aproximadamente ${approxWords} palabras. Es obligatorio que termines siempre con una oración completa (punto, exclamación o interrogación); nunca cortes a mitad de palabra ni dejes una frase a medias. Si no te caben todos los ítems, cierra la lista con el último que completes entero.`
    systemPrompt = systemPrompt + lengthInstruction

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
