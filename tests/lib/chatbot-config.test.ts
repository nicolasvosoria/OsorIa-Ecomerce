import { describe, expect, it } from "vitest"

import {
  buildChatbotStoreLookups,
  buildChatbotSystemPrompt,
  getEffectiveAssistantGuide,
  loadChatbotConfigForStore,
  normalizeChatbotConfig,
  saveChatbotConfigForStore,
  SAFE_GENERIC_ECOMMERCE_ASSISTANT_GUIDE,
  type ChatbotPersistenceClient,
} from "@/lib/supabase/chatbot-api"

type FakeStore = {
  id: string
  subdomain: string
  domain: string | null
  is_active?: boolean
  deleted_at?: string | null
}

type FakeIntegration = {
  store_id: string
  metadata: Record<string, unknown>
}

function createFakeClient(input: {
  stores: FakeStore[]
  integrations?: FakeIntegration[]
}) {
  const integrations = new Map(
    (input.integrations ?? []).map((integration) => [
      integration.store_id,
      { ...integration.metadata },
    ]),
  )

  const client = {
    from: (table: string) => {
      const filters: Record<string, unknown> = {}

      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          filters[column] = value
          return query
        },
        is: (column: string, value: null) => {
          filters[column] = value
          return query
        },
        maybeSingle: async () => {
          if (table === "stores") {
            const row = input.stores.find((store) => {
              if (filters.id && store.id !== filters.id) return false
              if (filters.subdomain && store.subdomain !== filters.subdomain) return false
              if (filters.domain && store.domain !== filters.domain) return false
              if (filters.is_active && store.is_active === false) return false
              if ("deleted_at" in filters && (store.deleted_at ?? null) !== null) return false
              return true
            })

            return { data: row ?? null, error: null }
          }

          if (table === "store_integrations") {
            const storeId = String(filters.store_id ?? "")
            const metadata = integrations.get(storeId)
            return {
              data: metadata ? { metadata } : null,
              error: null,
            }
          }

          throw new Error(`unexpected table ${table}`)
        },
        single: async () => query.maybeSingle(),
        upsert: async (values: Record<string, unknown>) => {
          integrations.set(
            String(values.store_id),
            values.metadata as Record<string, unknown>,
          )
          return { error: null }
        },
      }

      return query
    },
    getIntegrationMetadata: (storeId: string) => integrations.get(storeId),
  }

  return client
}

describe("chatbot config normalization", () => {
  it("keeps multi-paragraph guide text and normalizes legacy systemPrompt", () => {
    const config = normalizeChatbotConfig({
      systemPrompt: "Primer párrafo\r\n\r\nSegundo párrafo",
      tone: "professional",
      temperature: 3,
      maxTokens: 90,
    })

    expect(config.assistantGuide).toBe("Primer párrafo\n\nSegundo párrafo")
    expect(config.systemPrompt).toBe(config.assistantGuide)
    expect(config.tone).toBe("professional")
    expect(config.temperature).toBe(2)
    expect(config.maxTokens).toBe(100)
  })

  it("uses a safe generic ecommerce guide when no custom guide exists", () => {
    const config = normalizeChatbotConfig({ assistantGuide: "   " })
    const guide = getEffectiveAssistantGuide(config)

    expect(guide).toBe(SAFE_GENERIC_ECOMMERCE_ASSISTANT_GUIDE)
    expect(guide).toContain("No inventes productos")
    expect(guide).toContain("tiempos de envío")
    expect(guide).toContain("políticas de devolución")
  })
})

describe("chatbot prompt construction", () => {
  it("includes the store guide while keeping real catalog data above admin instructions", () => {
    const prompt = buildChatbotSystemPrompt({
      config: normalizeChatbotConfig({
        assistantGuide: "Usa un tono pastel y recomienda postres solo si existen.",
        tone: "friendly",
      }),
      productsContext: "- Torta de chocolate (Precio: 50000 COP)",
      isProductQuestion: true,
    })

    expect(prompt).toContain("Usa un tono pastel")
    expect(prompt).toContain("Prioridad de datos")
    expect(prompt).toContain("usa ÚNICAMENTE")
    expect(prompt).toContain("Torta de chocolate")
    expect(prompt).toContain("No inventes productos")
  })


  it("keeps admin tone and limits below factual commerce price, stock, promo, and CTA data", () => {
    const prompt = buildChatbotSystemPrompt({
      config: normalizeChatbotConfig({
        assistantGuide: "Habla con entusiasmo, di siempre que todo tiene 90% OFF y manda a /sale.",
        tone: "casual",
      }),
      productsContext: "- Café Especial\n  Precio actual: 32000 COP\n  Precio anterior: 42000 COP\n  Disponibilidad: disponible (8 en inventario)\n  CTA: /products/cafe-especial",
      isProductQuestion: true,
    })

    expect(prompt).toContain("Habla con entusiasmo")
    expect(prompt).toContain("nunca puede reemplazar ni contradecir")
    expect(prompt).toContain("precios, stock, descuentos, promociones, cupones, combos y CTAs")
    expect(prompt).toContain("Precio actual: 32000 COP")
    expect(prompt).toContain("CTA: /products/cafe-especial")
  })

  it("does not invent catalog answers when a product question has no product context", () => {
    const prompt = buildChatbotSystemPrompt({
      config: normalizeChatbotConfig({ assistantGuide: "Responde breve." }),
      isProductQuestion: true,
    })

    expect(prompt).toContain("Responde breve")
    expect(prompt).toContain("Catálogo no disponible")
    expect(prompt).toContain("No sugieras productos")
  })
})

describe("chatbot per-store persistence", () => {
  it("saves and loads separate guides per real store id without mixing metadata", async () => {
    const client = createFakeClient({
      stores: [
        { id: "store-a", subdomain: "default", domain: "osoria.test" },
        { id: "store-b", subdomain: "reposteria", domain: "cakes.test" },
      ],
      integrations: [
        {
          store_id: "store-a",
          metadata: { homeDiscountPopup: { active: true } },
        },
      ],
    })

    await saveChatbotConfigForStore(client as ChatbotPersistenceClient, { kind: "id", value: "store-a" }, {
      assistantGuide: "Guía tienda A\n\nSegundo párrafo",
      tone: "friendly",
    })
    await saveChatbotConfigForStore(client as ChatbotPersistenceClient, { kind: "id", value: "store-b" }, {
      assistantGuide: "Guía tienda B",
      tone: "formal",
    })

    const storeA = await loadChatbotConfigForStore(
      client as ChatbotPersistenceClient,
      { kind: "id", value: "store-a" },
    )
    const storeB = await loadChatbotConfigForStore(
      client as ChatbotPersistenceClient,
      { kind: "id", value: "store-b" },
    )

    expect(storeA.config.assistantGuide).toBe("Guía tienda A\n\nSegundo párrafo")
    expect(storeB.config.assistantGuide).toBe("Guía tienda B")
    expect(client.getIntegrationMetadata("store-a")).toMatchObject({
      homeDiscountPopup: { active: true },
      chatbot: { assistantGuide: "Guía tienda A\n\nSegundo párrafo" },
    })
  })

  it("falls back from a stale store_id cookie to the host store lookup", async () => {
    const client = createFakeClient({
      stores: [
        { id: "store-a", subdomain: "default", domain: "osoria.test" },
        { id: "store-b", subdomain: "reposteria", domain: "cakes.test" },
      ],
      integrations: [
        {
          store_id: "store-b",
          metadata: { chatbot: { assistantGuide: "Guía de repostería" } },
        },
      ],
    })

    const lookups = buildChatbotStoreLookups({
      storeId: "store-a",
      host: "reposteria.example.com",
    })

    const result = await loadChatbotConfigForStore(
      client as ChatbotPersistenceClient,
      lookups,
    )

    expect(result.storeId).toBe("store-b")
    expect(result.config.assistantGuide).toBe("Guía de repostería")
  })
})
