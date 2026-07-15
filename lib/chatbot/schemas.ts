import { z } from "zod"

import {
  CHATBOT_TONES,
  MAX_MAX_TOKENS,
  MAX_TEMPERATURE,
  MIN_MAX_TOKENS,
  MIN_TEMPERATURE,
} from "@/lib/supabase/chatbot-api"

const MAX_ASSISTANT_GUIDE_LENGTH = 4000

const GUIDE_TOO_LONG_MESSAGE = `La guía no puede superar los ${MAX_ASSISTANT_GUIDE_LENGTH} caracteres`
const INVALID_TEMPERATURE_MESSAGE = `La temperatura debe estar entre ${MIN_TEMPERATURE} y ${MAX_TEMPERATURE}`
const INVALID_MAX_TOKENS_MESSAGE = `El máximo de tokens debe ser un número entero entre ${MIN_MAX_TOKENS} y ${MAX_MAX_TOKENS}`

function isNumberInRange(value: string, min: number, max: number): boolean {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
}

function isIntegerInRange(value: string, min: number, max: number): boolean {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= min && parsed <= max
}

export const chatbotConfigSchema = z.object({
  assistantGuide: z.string().max(MAX_ASSISTANT_GUIDE_LENGTH, GUIDE_TOO_LONG_MESSAGE),
  tone: z.enum(CHATBOT_TONES),
  temperature: z
    .string()
    .refine(
      (value) => isNumberInRange(value, MIN_TEMPERATURE, MAX_TEMPERATURE),
      INVALID_TEMPERATURE_MESSAGE,
    ),
  maxTokens: z
    .string()
    .refine(
      (value) => isIntegerInRange(value, MIN_MAX_TOKENS, MAX_MAX_TOKENS),
      INVALID_MAX_TOKENS_MESSAGE,
    ),
})

export type ChatbotConfigFormValues = z.infer<typeof chatbotConfigSchema>
