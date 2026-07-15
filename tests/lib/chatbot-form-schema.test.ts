import { describe, expect, it } from "vitest"

import { chatbotConfigSchema } from "@/lib/chatbot/schemas"

const validInput = {
  assistantGuide: "Sé cercano y no inventes precios ni stock.",
  tone: "friendly" as const,
  temperature: "0.7",
  maxTokens: "500",
}

function firstMessage(result: ReturnType<typeof chatbotConfigSchema.safeParse>): string | undefined {
  return result.success ? undefined : result.error.issues[0]?.message
}

describe("chatbot config form schema", () => {
  it("accepts a fully valid config", () => {
    expect(chatbotConfigSchema.safeParse(validInput).success).toBe(true)
  })

  it("allows an empty guide (falls back to the generic guide)", () => {
    expect(chatbotConfigSchema.safeParse({ ...validInput, assistantGuide: "" }).success).toBe(true)
  })

  it("rejects a guide longer than the max length", () => {
    const result = chatbotConfigSchema.safeParse({
      ...validInput,
      assistantGuide: "a".repeat(4001),
    })
    expect(firstMessage(result)).toBe("La guía no puede superar los 4000 caracteres")
  })

  it("rejects a tone outside the known set", () => {
    const result = chatbotConfigSchema.safeParse({ ...validInput, tone: "sarcastic" })
    expect(result.success).toBe(false)
  })

  it("rejects a temperature outside the 0-2 range", () => {
    for (const temperature of ["-0.1", "2.1", "abc"]) {
      const result = chatbotConfigSchema.safeParse({ ...validInput, temperature })
      expect(firstMessage(result)).toBe("La temperatura debe estar entre 0 y 2")
    }
  })

  it("accepts the temperature bounds", () => {
    expect(chatbotConfigSchema.safeParse({ ...validInput, temperature: "0" }).success).toBe(true)
    expect(chatbotConfigSchema.safeParse({ ...validInput, temperature: "2" }).success).toBe(true)
  })

  it("rejects a max tokens outside the 100-2000 range or non-integer", () => {
    for (const maxTokens of ["99", "2001", "150.5", "abc"]) {
      const result = chatbotConfigSchema.safeParse({ ...validInput, maxTokens })
      expect(firstMessage(result)).toBe(
        "El máximo de tokens debe ser un número entero entre 100 y 2000",
      )
    }
  })

  it("accepts the max tokens bounds", () => {
    expect(chatbotConfigSchema.safeParse({ ...validInput, maxTokens: "100" }).success).toBe(true)
    expect(chatbotConfigSchema.safeParse({ ...validInput, maxTokens: "2000" }).success).toBe(true)
  })
})
