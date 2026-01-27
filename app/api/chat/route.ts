import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

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

// Función para buscar productos relevantes según la pregunta del usuario
async function searchRelevantProducts(userMessage: string): Promise<string> {
  try {
    const supabase = await getSupabaseServerClient()
    if (!supabase) {
      return ""
    }

    const storeId = await getStoreIdFromServer()

    let query = supabase
      .from('store_items')
      .select('id, item_name, item_description, base_price, currency_code, metadata, item_slug')
      .eq('is_active', true)
      .eq('is_available_for_sale', true)
      .is('deleted_at', null)
      .limit(5) // Limitar a 5 productos más relevantes

    if (storeId && storeId !== 'default') {
      query = query.eq('store_id', storeId)
    } else {
      // Si es default, buscar por subdomain
      const { data: defaultStore } = await supabase
        .from('stores')
        .select('id')
        .eq('subdomain', 'default')
        .eq('is_active', true)
        .is('deleted_at', null)
        .single()
      
      if (defaultStore?.id) {
        query = query.eq('store_id', defaultStore.id)
      }
    }

    // Buscar productos que coincidan con la pregunta
    const normalizedMessage = userMessage.toLowerCase()
    const searchTerms = normalizedMessage.split(/\s+/).filter(term => term.length > 2)
    
    if (searchTerms.length > 0) {
      const searchPattern = searchTerms.map(term => `%${term}%`).join('|')
      query = query.or(`item_name.ilike.${searchPattern},item_description.ilike.${searchPattern}`)
    }

    const { data: products, error } = await query

    if (error || !products || products.length === 0) {
      return ""
    }

    // Construir información de productos para el contexto
    const productsInfo = products.map((product: any) => {
      const metadata = (product.metadata as Record<string, any>) || {}
      const aiDetails = metadata.ai_details || ""
      
      let productInfo = `- ${product.item_name}`
      if (product.base_price) {
        productInfo += ` (Precio: ${product.base_price} ${product.currency_code || 'COP'})`
      }
      if (product.item_description) {
        productInfo += `\n  Descripción: ${product.item_description.substring(0, 150)}${product.item_description.length > 150 ? '...' : ''}`
      }
      if (aiDetails) {
        productInfo += `\n  Detalles y características: ${aiDetails}`
      }
      return productInfo
    }).join('\n\n')

    return `\n\nInformación de productos relevantes encontrados:\n${productsInfo}\n\nUsa esta información para responder preguntas específicas sobre estos productos. Si el usuario pregunta sobre características, especificaciones, materiales, compatibilidad u otros detalles, utiliza la información de "Detalles y características" proporcionada.`
  } catch (error) {
    console.error("[Chat API] Error al buscar productos:", error)
    return ""
  }
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
    
    // Obtener el último mensaje del usuario para buscar productos relevantes
    const lastUserMessage = messages
      .filter((msg: { sender: string }) => msg.sender === "user")
      .pop()?.text || ""

    // Buscar productos relevantes si la pregunta parece ser sobre productos
    const productsContext = lastUserMessage 
      ? await searchRelevantProducts(lastUserMessage)
      : ""

    // Ajustar el prompt según el tono y agregar información de productos
    let systemPrompt = adjustPromptForTone(config.systemPrompt, config.tone)
    
    if (productsContext) {
      systemPrompt += productsContext
    }

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
        max_tokens: config.maxTokens,
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
    const assistantMessage = data.choices?.[0]?.message?.content

    if (!assistantMessage) {
      return NextResponse.json(
        { error: "No response from DeepSeek" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: assistantMessage })
  } catch (error) {
    console.error("[Chat API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
