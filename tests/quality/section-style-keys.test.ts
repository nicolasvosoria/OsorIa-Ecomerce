import { describe, expect, it } from "vitest"

import {
  PRODUCTS_RADIUS_LENGTH,
  SECTION_FIELD_THEME_TOKEN,
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

  it("registers bgColor, accentColor, productBgColor, textColor and sectionBgColor as the specialOffer style keys", () => {
    expect(SECTION_STYLE_KEYS.specialOffer).toEqual([
      "bgColor",
      "accentColor",
      "productBgColor",
      "textColor",
      "sectionBgColor",
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

describe("SECTION_FIELD_THEME_TOKEN", () => {
  it("maps the newsletter button field to the theme's primary color, matching its var(--sec-newsletter-button, var(--primary)) fallback", () => {
    expect(SECTION_FIELD_THEME_TOKEN.newsletter).toEqual({ button: "primary" })
  })

  it("maps the hero button field to the theme's primary color, matching its var(--sec-hero-button, var(--primary)) fallback", () => {
    expect(SECTION_FIELD_THEME_TOKEN.hero).toEqual({ button: "primary" })
  })

  it("maps the popular button field to the theme's primary color, matching its var(--sec-popular-button, var(--primary)) fallback", () => {
    expect(SECTION_FIELD_THEME_TOKEN.popular).toEqual({ button: "primary" })
  })

  it("maps every products color field to the theme token its var(--sec-products-*) fallback resolves to", () => {
    expect(SECTION_FIELD_THEME_TOKEN.products).toEqual({
      cardBg: "muted",
      bg: null,
      text: "foreground",
      price: "primary",
    })
  })

  it("maps every featured color field to the theme token its var(--sec-featured-*) fallback resolves to", () => {
    expect(SECTION_FIELD_THEME_TOKEN.featured).toEqual({
      bg: "secondary",
      cardBg: "card",
      productBg: "muted",
      text: "foreground",
    })
  })

  it("maps every specialOffer color field to the theme token its var(--sec-specialOffer-*) fallback resolves to", () => {
    expect(SECTION_FIELD_THEME_TOKEN.specialOffer).toEqual({
      bg: "secondary",
      accent: "primary",
      productBg: "muted",
      text: "foreground",
      sectionBg: "background",
    })
  })

  it("maps every whyus color field to the theme token its var(--sec-whyus-*) fallback resolves to", () => {
    expect(SECTION_FIELD_THEME_TOKEN.whyus).toEqual({
      sectionBg: "muted",
      cardBg: "card",
      iconBg: "muted",
      icon: "foreground",
      title: "foreground",
      subtitle: "mutedForeground",
    })
  })
})

describe("PRODUCTS_RADIUS_LENGTH", () => {
  it("maps every cornerRadius preset key to a valid CSS length matching the project's Tailwind radius scale", () => {
    expect(PRODUCTS_RADIUS_LENGTH).toEqual({
      none: "0px",
      md: "0.75rem",
      lg: "1rem",
      xl: "1.5rem",
    })
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

  it("removes the specialOffer style keys, including sectionBgColor, while keeping its content", () => {
    const variables = {
      title: "Oferta Especial",
      productId: "item-2",
      bgColor: "#ed333b",
      accentColor: "#f5c211",
      productBgColor: "#f66151",
      textColor: "#ffffff",
      sectionBgColor: "#0f172a",
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
