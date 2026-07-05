import { describe, expect, it } from "vitest"

import {
  SECTION_STYLE_KEYS,
  stripSectionStyleKeys,
} from "@/lib/theme/section-style-keys"

describe("SECTION_STYLE_KEYS", () => {
  it("registers cardBgColor, cornerRadius, bgColor, textColor and priceColor as the products style keys", () => {
    expect(SECTION_STYLE_KEYS.products).toEqual([
      "cardBgColor",
      "cornerRadius",
      "bgColor",
      "textColor",
      "priceColor",
    ])
  })

  it("registers bgColor, cardBgColor, productBgColor and textColor as the featured style keys", () => {
    expect(SECTION_STYLE_KEYS.featured).toEqual([
      "bgColor",
      "cardBgColor",
      "productBgColor",
      "textColor",
    ])
  })

  it("registers bgColor, accentColor, productBgColor and textColor as the specialOffer style keys", () => {
    expect(SECTION_STYLE_KEYS.specialOffer).toEqual([
      "bgColor",
      "accentColor",
      "productBgColor",
      "textColor",
    ])
  })

  it("registers buttonColor as the newsletter style keys", () => {
    expect(SECTION_STYLE_KEYS.newsletter).toEqual(["buttonColor"])
  })

  it("registers buttonColor as the hero style keys", () => {
    expect(SECTION_STYLE_KEYS.hero).toEqual(["buttonColor"])
  })

  it("registers buttonColor as the popular style keys", () => {
    expect(SECTION_STYLE_KEYS.popular).toEqual(["buttonColor"])
  })

  it("registers backgroundColor, backgroundPosition and type as the site_background style keys", () => {
    expect(SECTION_STYLE_KEYS.site_background).toEqual([
      "backgroundColor",
      "backgroundPosition",
      "type",
    ])
  })

  it("registers the whyus color style keys", () => {
    expect(SECTION_STYLE_KEYS.whyus).toEqual([
      "sectionBgColor",
      "cardBgColor",
      "iconBgColor",
      "iconColor",
      "titleColor",
      "subtitleColor",
    ])
  })
})

describe("stripSectionStyleKeys", () => {
  it("removes the products style keys while keeping its content", () => {
    const variables = {
      title: "Productos populares",
      eyebrow: "Electrónica",
      cardBgColor: "#f2f2f2",
      cornerRadius: "xl",
      bgColor: "#ffffff",
      textColor: "#1e354e",
      priceColor: "#1e354e",
    }

    const result = stripSectionStyleKeys("products", variables)

    expect(result).toEqual({
      title: "Productos populares",
      eyebrow: "Electrónica",
    })
  })

  it("returns the same variables object for a section with no registered style keys", () => {
    const variables = { title: "Hola", bgColor: "#ffffff" }

    const result = stripSectionStyleKeys("footer", variables)

    expect(result).toBe(variables)
  })

  it("removes the featured style keys while keeping its content", () => {
    const variables = {
      title: "¡Por favor, no detengas la música!",
      productId: "item-1",
      bgColor: "#7baeaf",
      cardBgColor: "#f6f6f6",
      productBgColor: "#77767b",
      textColor: "#ffffff",
    }

    const result = stripSectionStyleKeys("featured", variables)

    expect(result).toEqual({
      title: "¡Por favor, no detengas la música!",
      productId: "item-1",
    })
  })

  it("removes the specialOffer style keys while keeping its content", () => {
    const variables = {
      title: "Oferta Especial",
      productId: "item-2",
      bgColor: "#ed333b",
      accentColor: "#f5c211",
      productBgColor: "#f66151",
      textColor: "#ffffff",
    }

    const result = stripSectionStyleKeys("specialOffer", variables)

    expect(result).toEqual({
      title: "Oferta Especial",
      productId: "item-2",
    })
  })

  it("removes the newsletter style keys while keeping its content", () => {
    const variables = {
      title: "Unite a Nuestro Newsletter",
      overlayOpacity: 0.55,
      buttonColor: "#c01c28",
    }

    const result = stripSectionStyleKeys("newsletter", variables)

    expect(result).toEqual({
      title: "Unite a Nuestro Newsletter",
      overlayOpacity: 0.55,
    })
  })

  it("removes the hero style keys while keeping its content", () => {
    const variables = {
      title: "Smarthome Speaker",
      layoutMode: "full-image",
      buttonColor: "#33d17a",
    }

    const result = stripSectionStyleKeys("hero", variables)

    expect(result).toEqual({
      title: "Smarthome Speaker",
      layoutMode: "full-image",
    })
  })

  it("removes the popular style keys while keeping its content", () => {
    const variables = {
      title: "Lo más vendido",
      priceLabel: "Desde $29.000",
      buttonColor: "#33d17a",
    }

    const result = stripSectionStyleKeys("popular", variables)

    expect(result).toEqual({
      title: "Lo más vendido",
      priceLabel: "Desde $29.000",
    })
  })

  it("removes the site_background style keys while keeping its content", () => {
    const variables = {
      backgroundImage: "https://example.com/bg.webp",
      backgroundColor: "#123456",
      backgroundPosition: "bottom right",
      type: "image",
    }

    const result = stripSectionStyleKeys("site_background", variables)

    expect(result).toEqual({
      backgroundImage: "https://example.com/bg.webp",
    })
  })

  it("removes the whyus style keys while keeping its content", () => {
    const variables = {
      title: "¿Por qué nosotros?",
      sectionBgColor: "#f5f5f5",
      cardBgColor: "#ffffff",
      iconBgColor: "#eef1f4",
      iconColor: "#1e354e",
      titleColor: "#1e354e",
      subtitleColor: "#64748b",
    }

    const result = stripSectionStyleKeys("whyus", variables)

    expect(result).toEqual({
      title: "¿Por qué nosotros?",
    })
  })
})
