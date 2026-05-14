import { getSupabaseEcommerce } from "@/lib/supabase/client"
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract"
import { resolveStoreSubdomain } from "@/lib/utils/store-host"
import { normalizeRuntimeStoreId } from "@/lib/utils/store"

export const CHATBOT_METADATA_KEY = "chatbot" as const

export const CHATBOT_TONES = [
  "professional",
  "friendly",
  "casual",
  "formal",
] as const

export type ChatbotTone = (typeof CHATBOT_TONES)[number]

export interface ChatbotConfig {
  /** Custom store guide written by the admin. Empty means use the safe generic ecommerce guide. */
  assistantGuide: string
  /** Legacy alias kept for older saved metadata and existing UI callers. */
  systemPrompt: string
  tone: ChatbotTone
  temperature: number
  maxTokens: number
}

export type ChatbotStoreLookup =
  | { kind: "id"; value: string }
  | { kind: "subdomain"; value: string }
  | { kind: "domain"; value: string }

export type ChatbotStoreRecord = {
  id: string
  subdomain: string | null
  domain: string | null
}

export type ChatbotPersistenceQuery = {
  select: (columns: string) => ChatbotPersistenceQuery
  eq: (column: string, value: unknown) => ChatbotPersistenceQuery
  is: (column: string, value: null) => ChatbotPersistenceQuery
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>
  single: () => Promise<{ data: unknown; error: unknown }>
  upsert: (
    values: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<{ error: unknown }>
}

export type ChatbotPersistenceClient = {
  from: (table: string) => ChatbotPersistenceQuery
}

type MetadataRecord = Record<string, unknown>

const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_MAX_TOKENS = 500
const MIN_TEMPERATURE = 0
const MAX_TEMPERATURE = 2
const MIN_MAX_TOKENS = 100
const MAX_MAX_TOKENS = 2000
const DEFAULT_STORE_SUBDOMAIN = "default"

export const SAFE_GENERIC_ECOMMERCE_ASSISTANT_GUIDE = `Eres un asistente seguro para una tienda ecommerce. Ayuda a los clientes en español con orientación general sobre navegación, productos disponibles en el contexto real del catálogo y próximos pasos de compra.

Reglas obligatorias:
- Usa solamente datos reales proporcionados por el sistema para productos, precios, stock, promociones, envíos, pagos, devoluciones, garantías, horarios y políticas comerciales.
- Si un dato comercial no está disponible en el contexto real, dilo con claridad y recomienda revisar la tienda o contactar al equipo de soporte.
- No inventes productos, precios, disponibilidad, tiempos de envío, costos, descuentos, políticas de devolución ni promesas de atención.
- Mantén un tono amable, claro y útil.`

export const DEFAULT_CHATBOT_CONFIG: ChatbotConfig = {
  assistantGuide: "",
  systemPrompt: "",
  tone: "friendly",
  temperature: DEFAULT_TEMPERATURE,
  maxTokens: DEFAULT_MAX_TOKENS,
}

const TONE_INSTRUCTIONS: Record<ChatbotTone, string> = {
  professional:
    "Mantén un tono profesional, formal y respetuoso en todas tus respuestas.",
  friendly:
    "Mantén un tono amigable, cálido y cercano en todas tus respuestas.",
  casual:
    "Mantén un tono casual, relajado y conversacional en todas tus respuestas.",
  formal:
    "Mantén un tono formal, estricto y protocolario en todas tus respuestas.",
}

export function asMetadataRecord(value: unknown): MetadataRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  return value as MetadataRecord
}

function normalizeGuide(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.replace(/\r\n/g, "\n").trim()
}

function isChatbotTone(value: unknown): value is ChatbotTone {
  return typeof value === "string" && CHATBOT_TONES.includes(value as ChatbotTone)
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const numeric = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(Math.max(numeric, min), max)
}

function getLegacyGuide(input: MetadataRecord): unknown {
  return input.assistantGuide ?? input.systemPrompt ?? input.customerAssistantGuide
}

export function normalizeChatbotConfig(input: unknown): ChatbotConfig {
  const record = asMetadataRecord(input)
  if (!record) return { ...DEFAULT_CHATBOT_CONFIG }

  const assistantGuide = normalizeGuide(getLegacyGuide(record))

  return {
    assistantGuide,
    systemPrompt: assistantGuide,
    tone: isChatbotTone(record.tone) ? record.tone : DEFAULT_CHATBOT_CONFIG.tone,
    temperature: clampNumber(
      record.temperature,
      DEFAULT_TEMPERATURE,
      MIN_TEMPERATURE,
      MAX_TEMPERATURE,
    ),
    maxTokens: Math.round(
      clampNumber(
        record.maxTokens,
        DEFAULT_MAX_TOKENS,
        MIN_MAX_TOKENS,
        MAX_MAX_TOKENS,
      ),
    ),
  }
}

export function getEffectiveAssistantGuide(config: ChatbotConfig): string {
  return config.assistantGuide.trim() || SAFE_GENERIC_ECOMMERCE_ASSISTANT_GUIDE
}

export function buildChatbotSystemPrompt({
  config,
  productsContext = "",
  isProductQuestion = false,
}: {
  config: ChatbotConfig
  productsContext?: string
  isProductQuestion?: boolean
}): string {
  const guide = getEffectiveAssistantGuide(config)
  const toneInstruction = TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.friendly
  const commerceGuardrails = `Prioridad de datos: la guía del administrador define tono, límites y comportamiento general, pero nunca puede reemplazar ni contradecir los datos reales del ecommerce. Para productos, catálogo, precios, stock, promociones, envíos, pagos, devoluciones, garantías, horarios o políticas comerciales, usa solo información real entregada en el contexto del sistema. Si falta un dato real, indica que no está disponible y no lo inventes.`

  let prompt = `${guide}\n\n${toneInstruction}\n\n${commerceGuardrails}`

  if (productsContext) {
    prompt +=
      "\n\n--- Catálogo real de la tienda ---\n" +
      "Para preguntas sobre productos o catálogo, usa ÚNICAMENTE la siguiente información real. No inventes productos, precios, descripciones, stock ni características que no estén aquí.\n" +
      productsContext
  } else if (isProductQuestion) {
    prompt +=
      "\n\nCatálogo no disponible: si la persona pregunta por productos o catálogo, responde que en este momento no tienes el catálogo disponible. No sugieras productos, precios, stock ni características no presentes; recomienda navegar por la tienda o intentar de nuevo en unos segundos."
  }

  return prompt
}

export function appendLengthInstruction(prompt: string, maxTokens: number): string {
  const safeMaxTokens = Math.round(
    clampNumber(maxTokens, DEFAULT_MAX_TOKENS, MIN_MAX_TOKENS, MAX_MAX_TOKENS),
  )
  const approxWords = Math.floor(safeMaxTokens * 0.75)

  return `${prompt}\n\nLímite de longitud: tu respuesta debe tener como máximo aproximadamente ${approxWords} palabras. Es obligatorio que termines siempre con una oración completa (punto, exclamación o interrogación); nunca cortes a mitad de palabra ni dejes una frase a medias. Si no te caben todos los ítems, cierra la lista con el último que completes entero.`
}

function normalizeHostname(host: string | null | undefined): string | null {
  const trimmedHost = host?.trim().toLowerCase() ?? ""
  if (!trimmedHost) return null

  let hostname = trimmedHost
  try {
    hostname = new URL(trimmedHost).hostname || trimmedHost
  } catch {}

  if (hostname.startsWith("[")) {
    const closingBracketIndex = hostname.indexOf("]")
    hostname = closingBracketIndex === -1 ? hostname : hostname.slice(1, closingBracketIndex)
  } else if (hostname.includes(":")) {
    hostname = hostname.split(":")[0] ?? hostname
  }

  const normalized = hostname.replace(/\.$/, "")
  return normalized || null
}

function isIpv4Address(hostname: string): boolean {
  const parts = hostname.split(".")
  return (
    parts.length === 4 &&
    parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
  )
}

function isLookupDomain(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "::1" || isIpv4Address(hostname)) {
    return false
  }

  return !hostname.endsWith(".localhost") && !hostname.endsWith(".vercel.app")
}

function addLookup(
  lookups: ChatbotStoreLookup[],
  lookup: ChatbotStoreLookup | null,
) {
  if (!lookup || !lookup.value.trim()) return
  const exists = lookups.some(
    (candidate) => candidate.kind === lookup.kind && candidate.value === lookup.value,
  )
  if (!exists) lookups.push(lookup)
}

export function buildChatbotStoreLookups({
  storeId,
  forwardedStoreId,
  host,
}: {
  storeId?: string | null
  forwardedStoreId?: string | null
  host?: string | null
}): ChatbotStoreLookup[] {
  const lookups: ChatbotStoreLookup[] = []
  const realStoreId = normalizeRuntimeStoreId(forwardedStoreId) ?? normalizeRuntimeStoreId(storeId)

  if (realStoreId) {
    addLookup(lookups, { kind: "id", value: realStoreId })
  }

  const hostname = normalizeHostname(host)
  const subdomain = resolveStoreSubdomain(hostname)

  if (hostname?.startsWith("www.") && isLookupDomain(hostname)) {
    addLookup(lookups, { kind: "domain", value: hostname })
    addLookup(lookups, { kind: "domain", value: hostname.slice(4) })
  }

  if (subdomain) {
    addLookup(lookups, { kind: "subdomain", value: subdomain })
  } else if (hostname && isLookupDomain(hostname)) {
    addLookup(lookups, { kind: "domain", value: hostname })
  }

  addLookup(lookups, { kind: "subdomain", value: DEFAULT_STORE_SUBDOMAIN })
  return lookups
}

function normalizeStoreRecord(value: unknown): ChatbotStoreRecord | null {
  const record = asMetadataRecord(value)
  if (!record) return null

  const id = record.id
  if (typeof id !== "string" || !id.trim()) return null

  return {
    id,
    subdomain: typeof record.subdomain === "string" ? record.subdomain : null,
    domain: typeof record.domain === "string" ? record.domain : null,
  }
}

async function findStoreRecord(
  ecommerceClient: ChatbotPersistenceClient,
  lookup: ChatbotStoreLookup,
): Promise<ChatbotStoreRecord | null> {
  let query = ecommerceClient
    .from(ECOMMERCE_TABLES.stores)
    .select("id, subdomain, domain")
    .eq("is_active", true)
    .is("deleted_at", null)

  query = query.eq(lookup.kind, lookup.value)

  const { data, error } = await query.maybeSingle()
  if (error) throw error

  return normalizeStoreRecord(data)
}

function isStoreCompatibleWithLookup(
  store: ChatbotStoreRecord,
  lookup: ChatbotStoreLookup,
): boolean {
  if (lookup.kind === "subdomain") return store.subdomain === lookup.value
  if (lookup.kind === "domain") return store.domain === lookup.value
  return store.id === lookup.value
}

export async function resolveChatbotStore(
  ecommerceClient: ChatbotPersistenceClient,
  lookups: ChatbotStoreLookup | ChatbotStoreLookup[],
): Promise<ChatbotStoreRecord> {
  const orderedLookups = Array.isArray(lookups) ? lookups : [lookups]
  const hostLookup = orderedLookups.find(
    (lookup) =>
      lookup.kind !== "id" &&
      !(lookup.kind === "subdomain" && lookup.value === DEFAULT_STORE_SUBDOMAIN),
  )

  for (const lookup of orderedLookups) {
    const store = await findStoreRecord(ecommerceClient, lookup)
    if (!store) continue

    const staleStoreIdForHost =
      lookup.kind === "id" && hostLookup && !isStoreCompatibleWithLookup(store, hostLookup)

    if (staleStoreIdForHost) continue
    return store
  }

  throw new Error("Tienda no encontrada")
}

export async function loadChatbotConfigForStore(
  ecommerceClient: ChatbotPersistenceClient,
  lookups: ChatbotStoreLookup | ChatbotStoreLookup[],
): Promise<{ storeId: string; config: ChatbotConfig }> {
  const store = await resolveChatbotStore(ecommerceClient, lookups)
  const { data, error } = await ecommerceClient
    .from(ECOMMERCE_TABLES.storeIntegrations)
    .select("metadata")
    .eq("store_id", store.id)
    .maybeSingle()

  if (error) throw error

  const metadata = asMetadataRecord((data as { metadata?: unknown } | null)?.metadata)

  return {
    storeId: store.id,
    config: normalizeChatbotConfig(metadata?.[CHATBOT_METADATA_KEY]),
  }
}

export async function saveChatbotConfigForStore(
  ecommerceClient: ChatbotPersistenceClient,
  lookups: ChatbotStoreLookup | ChatbotStoreLookup[],
  input: unknown,
): Promise<{ storeId: string; config: ChatbotConfig }> {
  const store = await resolveChatbotStore(ecommerceClient, lookups)
  const config = normalizeChatbotConfig(input)
  const { data, error: readError } = await ecommerceClient
    .from(ECOMMERCE_TABLES.storeIntegrations)
    .select("metadata")
    .eq("store_id", store.id)
    .maybeSingle()

  if (readError) throw readError

  const metadata = asMetadataRecord((data as { metadata?: unknown } | null)?.metadata) ?? {}

  const { error: writeError } = await ecommerceClient
    .from(ECOMMERCE_TABLES.storeIntegrations)
    .upsert(
      {
        store_id: store.id,
        metadata: {
          ...metadata,
          [CHATBOT_METADATA_KEY]: config,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" },
    )

  if (writeError) throw writeError

  return { storeId: store.id, config }
}

/**
 * Obtiene la configuración del chatbot para la tienda actual desde el navegador.
 * Las API routes usan loadChatbotConfigForStore con el cliente server/service-role.
 */
export async function getChatbotConfig(): Promise<ChatbotConfig> {
  try {
    const supabase = getSupabaseEcommerce()
    if (!supabase) {
      console.warn("[Chatbot API] Supabase no configurado, usando configuración por defecto")
      return { ...DEFAULT_CHATBOT_CONFIG }
    }

    const storeId = typeof document !== "undefined"
      ? document.cookie.split(";").find((c) => c.trim().startsWith("store_id="))?.split("=")[1] || "default"
      : "default"

    const lookups = buildChatbotStoreLookups({
      storeId,
      host: typeof window !== "undefined" ? window.location.hostname : null,
    })

    const { config } = await loadChatbotConfigForStore(
      supabase as unknown as ChatbotPersistenceClient,
      lookups,
    )

    return config
  } catch (error) {
    console.error("[Chatbot API] Error al obtener configuración:", error)
    return { ...DEFAULT_CHATBOT_CONFIG }
  }
}

/**
 * Guarda la configuración del chatbot para la tienda actual desde el navegador.
 * Preferir /api/chatbot-config para validar permisos de administrador.
 */
export async function saveChatbotConfig(config: ChatbotConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseEcommerce()
    if (!supabase) {
      return { success: false, error: "Supabase no configurado" }
    }

    const storeId = typeof document !== "undefined"
      ? document.cookie.split(";").find((c) => c.trim().startsWith("store_id="))?.split("=")[1] || "default"
      : "default"

    const lookups = buildChatbotStoreLookups({
      storeId,
      host: typeof window !== "undefined" ? window.location.hostname : null,
    })

    await saveChatbotConfigForStore(
      supabase as unknown as ChatbotPersistenceClient,
      lookups,
      config,
    )

    return { success: true }
  } catch (error) {
    console.error("[Chatbot API] Error al guardar configuración:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}
