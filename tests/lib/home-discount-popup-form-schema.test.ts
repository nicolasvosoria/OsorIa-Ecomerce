import { describe, expect, it } from "vitest"

import {
  homeDiscountPopupFormSchema,
  normalizeHomeDiscountPopupConfig,
} from "@/lib/home-discount-popup"

const validInput = normalizeHomeDiscountPopupConfig({
  active: true,
  title: "Promo home",
  text: "Texto",
  ctaText: "Copiar cupon",
  coupon: "HOME10",
  ctaMode: "copy_coupon",
})

function firstMessage(
  result: ReturnType<typeof homeDiscountPopupFormSchema.safeParse>,
): string | undefined {
  return result.success ? undefined : result.error.issues[0]?.message
}

describe("home discount popup form schema", () => {
  it("accepts a fully valid normalized config", () => {
    expect(homeDiscountPopupFormSchema.safeParse(validInput).success).toBe(true)
  })

  it("rejects a delay outside the 3-5 second range", () => {
    for (const delaySeconds of [2, 6, Number.NaN]) {
      const result = homeDiscountPopupFormSchema.safeParse({ ...validInput, delaySeconds })
      expect(firstMessage(result)).toBe("El delay debe estar entre 3 y 5 segundos")
    }
  })

  it("rejects a frequency outside the 1-720 hour range", () => {
    for (const frequencyHours of [0, 721, Number.NaN]) {
      const result = homeDiscountPopupFormSchema.safeParse({ ...validInput, frequencyHours })
      expect(firstMessage(result)).toBe("La frecuencia debe estar entre 1 y 720 horas")
    }
  })

  it("rejects a visible duration outside the 5-120 second range", () => {
    for (const visibleDurationSeconds of [4, 121, Number.NaN]) {
      const result = homeDiscountPopupFormSchema.safeParse({
        ...validInput,
        visibleDurationSeconds,
      })
      expect(firstMessage(result)).toBe("La duración visible debe estar entre 5 y 120 segundos")
    }
  })

  it("accepts the numeric bounds", () => {
    expect(
      homeDiscountPopupFormSchema.safeParse({
        ...validInput,
        delaySeconds: 3,
        frequencyHours: 1,
        visibleDurationSeconds: 5,
      }).success,
    ).toBe(true)
    expect(
      homeDiscountPopupFormSchema.safeParse({
        ...validInput,
        delaySeconds: 5,
        frequencyHours: 720,
        visibleDurationSeconds: 120,
      }).success,
    ).toBe(true)
  })

  it("does not require title, text or cta text (publishability is a separate warning)", () => {
    const result = homeDiscountPopupFormSchema.safeParse({
      ...validInput,
      active: false,
      title: "",
      text: "",
      ctaText: "",
    })
    expect(result.success).toBe(true)
  })
})

describe("homeDiscountPopupFormSchema CTA destination", () => {
  const redirectWithoutUrl = { ...validInput, ctaMode: "redirect" as const, ctaUrl: null }

  it("rejects the redirect mode with no URL", () => {
    const result = homeDiscountPopupFormSchema.safeParse(redirectWithoutUrl)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "ctaUrl")).toBe(true)
    }
  })

  it("rejects a URL that is not http(s)", () => {
    const result = homeDiscountPopupFormSchema.safeParse({
      ...redirectWithoutUrl,
      ctaUrl: "javascript:alert(1)",
    })

    expect(result.success).toBe(false)
  })

  it("accepts the redirect mode with a valid URL", () => {
    const result = homeDiscountPopupFormSchema.safeParse({
      ...redirectWithoutUrl,
      ctaUrl: "https://osoria.help/promos",
    })

    expect(result.success).toBe(true)
  })

  it("rejects the copy-coupon mode with no code", () => {
    const result = homeDiscountPopupFormSchema.safeParse({
      ...validInput,
      ctaMode: "copy_coupon" as const,
      coupon: "   ",
    })

    expect(result.success).toBe(false)
  })
})
