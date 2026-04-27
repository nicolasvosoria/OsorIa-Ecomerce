import { getSupabaseEcommerce } from "@/lib/supabase/client"
import { ECOMMERCE_TABLES, ECOMMERCE_VIEWS } from "@/lib/supabase/contract"

export interface ChatbotConfig {
  systemPrompt: string
  tone: "professional" | "friendly" | "casual" | "formal"
  temperature?: number
  maxTokens?: number
}

const DEFAULT_CONFIG: ChatbotConfig = {
  systemPrompt: `Eres un asistente virtual amigable y profesional de una tienda en línea. Tu objetivo es ayudar a los clientes con:

1. Información sobre productos y catálogo
2. Proceso de compra y carrito de compras
3. Métodos de pago disponibles
4. Información sobre envíos y entregas
5. Horarios de atención
6. Registro de cuenta y login
7. Personalización de temas y fuentes
8. Cualquier otra consulta relacionada con la tienda

Sé conciso, amigable y profesional. Responde en español. Si no sabes algo específico, ofrece contactar con el equipo de soporte.`,
  tone: "friendly",
  temperature: 0.7,
  maxTokens: 500,
}

/**
 * Obtiene la configuración del chatbot para la tienda actual
 */
export async function getChatbotConfig(): Promise<ChatbotConfig> {
  try {
    const supabase = getSupabaseEcommerce()
    if (!supabase) {
      console.warn("[Chatbot API] Supabase no configurado, usando configuración por defecto")
      return DEFAULT_CONFIG
    }

    const storeId = typeof document !== 'undefined'
      ? document.cookie.split(';').find(c => c.trim().startsWith('store_id='))?.split('=')[1] || 'default'
      : 'default'

    let query = supabase
      .from(ECOMMERCE_VIEWS.storesLegacy)
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
      console.warn("[Chatbot API] No se encontró la tienda, usando configuración por defecto")
      return DEFAULT_CONFIG
    }

    // Extraer configuración del chatbot del metadata
    const metadata = data.metadata as Record<string, any> || {}
    const chatbotConfig = metadata.chatbot as ChatbotConfig | undefined

    if (!chatbotConfig) {
      return DEFAULT_CONFIG
    }

    // Combinar con valores por defecto para asegurar que todos los campos estén presentes
    return {
      ...DEFAULT_CONFIG,
      ...chatbotConfig,
    }
  } catch (error) {
    console.error("[Chatbot API] Error al obtener configuración:", error)
    return DEFAULT_CONFIG
  }
}

/**
 * Guarda la configuración del chatbot para la tienda actual
 */
export async function saveChatbotConfig(config: ChatbotConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseEcommerce()
    if (!supabase) {
      return { success: false, error: "Supabase no configurado" }
    }

    const storeId = typeof document !== 'undefined'
      ? document.cookie.split(';').find(c => c.trim().startsWith('store_id='))?.split('=')[1] || 'default'
      : 'default'

    let query = supabase
      .from(ECOMMERCE_VIEWS.storesLegacy)
      .select('id, metadata')
      .eq('is_active', true)
      .is('deleted_at', null)

    if (storeId === 'default') {
      query = query.eq('subdomain', 'default')
    } else {
      query = query.eq('id', storeId)
    }

    const { data: storeData, error: fetchError } = await query.single()

    if (fetchError || !storeData) {
      return { success: false, error: "No se encontró la tienda" }
    }

    // Actualizar el metadata con la nueva configuración
    const metadata = (storeData.metadata as Record<string, any>) || {}
    metadata.chatbot = config

    const { error: updateError } = await supabase
      .from(ECOMMERCE_TABLES.stores)
      .update({ 
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', storeData.id)

    if (updateError) {
      console.error("[Chatbot API] Error al guardar configuración:", updateError)
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[Chatbot API] Error al guardar configuración:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error desconocido" 
    }
  }
}
