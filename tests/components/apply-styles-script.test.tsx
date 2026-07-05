import { describe, expect, it } from "vitest"

import { ApplyStylesScript } from "@/components/apply-styles-script"
import { DEFAULT_RUNTIME_THEME } from "@/lib/theme-font/runtime-contract"

interface NormalizedThemePayload {
  theme_name: string
  theme_fingerprint: string
  colors: unknown
  colorsLight: unknown
  colorsDark: unknown
  radius: unknown
  density: unknown
  shadow: unknown
  shape: unknown
  fontPairingId: string | null
  sections: unknown
}

function extractFunctionSource(source: string, functionName: string): string {
  const start = source.indexOf(`function ${functionName}(`)
  if (start === -1) {
    throw new Error(`${functionName} not found in ApplyStylesScript source`)
  }

  const bodyStart = source.indexOf("{", start)
  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1
    if (source[index] === "}") {
      depth -= 1
      if (depth === 0) {
        return source.slice(start, index + 1)
      }
    }
  }

  throw new Error(`Unbalanced braces while extracting ${functionName}`)
}

function loadNormalizeThemePayload(): (payload: unknown) => NormalizedThemePayload | null {
  const element = ApplyStylesScript() as unknown as {
    props: { dangerouslySetInnerHTML: { __html: string } }
  }
  const scriptSource = element.props.dangerouslySetInnerHTML.__html
  const functionSource = extractFunctionSource(scriptSource, "normalizeThemePayload")

  return new Function(`${functionSource}; return normalizeThemePayload;`)()
}

describe("ApplyStylesScript pre-hydration normalizeThemePayload", () => {
  it("forwards radius, density, shadow, shape and fontPairingId from a cached distinctive theme record", () => {
    const normalizeThemePayload = loadNormalizeThemePayload()
    const cached = {
      theme_name: "Boutique",
      theme_fingerprint: "v1:store:version:theme:updated:hash",
      colors: DEFAULT_RUNTIME_THEME.colors,
      colorsLight: DEFAULT_RUNTIME_THEME.colors,
      colorsDark: { primary: "#d0805f" },
      radius: { base: "0.75rem" },
      density: { scale: 1.05 },
      shadow: { card: "0 6px 18px -6px rgba(74,53,39,.2)", elevated: "0 16px 34px -12px rgba(74,53,39,.3)" },
      shape: { button: "0.5rem", card: "0.9rem" },
      fontPairingId: "boutique-pairing",
      sections: {
        featured: { bg: "#f2e5d5", cardBg: "#fffaf3", productBg: "#e6d5bf", text: "#4a3527" },
      },
    }

    const normalized = normalizeThemePayload(cached)

    expect(normalized).toEqual(cached)
  })

  it("leaves the distinctive fields null for a legacy cached record (no flash, defaults still apply downstream)", () => {
    const normalizeThemePayload = loadNormalizeThemePayload()
    const legacyCached = {
      theme_name: "Claro Original",
      theme_fingerprint: "legacy:claro-original:unknown:hash",
      colors: DEFAULT_RUNTIME_THEME.colors,
    }

    const normalized = normalizeThemePayload(legacyCached)

    expect(normalized).toEqual({
      theme_name: legacyCached.theme_name,
      theme_fingerprint: legacyCached.theme_fingerprint,
      colors: legacyCached.colors,
      colorsLight: null,
      colorsDark: null,
      radius: null,
      density: null,
      shadow: null,
      shape: null,
      fontPairingId: null,
      sections: null,
    })
  })

  it("round-trips the default Tech runtime theme's tokens unchanged (byte-identical, no flash)", () => {
    const normalizeThemePayload = loadNormalizeThemePayload()

    const normalized = normalizeThemePayload(DEFAULT_RUNTIME_THEME)

    expect(normalized).toEqual({
      theme_name: DEFAULT_RUNTIME_THEME.theme_name,
      theme_fingerprint: DEFAULT_RUNTIME_THEME.theme_fingerprint,
      colors: DEFAULT_RUNTIME_THEME.colors,
      colorsLight: DEFAULT_RUNTIME_THEME.colorsLight,
      colorsDark: DEFAULT_RUNTIME_THEME.colorsDark,
      radius: DEFAULT_RUNTIME_THEME.radius,
      density: DEFAULT_RUNTIME_THEME.density,
      shadow: DEFAULT_RUNTIME_THEME.shadow,
      shape: DEFAULT_RUNTIME_THEME.shape,
      fontPairingId: DEFAULT_RUNTIME_THEME.fontPairingId,
      sections: null,
    })
  })
})
