import { describe, expect, it } from "vitest"
import { DEFAULT_RUNTIME_THEME } from "@/lib/theme-font/runtime-contract"
import {
  CRITICAL_THEME_CONTRAST_PAIRS,
  getContrastRatio,
  resolveThemeCssVariables,
} from "@/lib/theme-font/contrast"

describe("theme contrast resolver", () => {
  it("derives readable foregrounds for unsafe dark-on-dark theme values", () => {
    const variables = resolveThemeCssVariables({
      ...DEFAULT_RUNTIME_THEME,
      colors: {
        ...DEFAULT_RUNTIME_THEME.colors,
        background: "#050505",
        foreground: "#001a55",
        card: "#070707",
        cardForeground: "#001a55",
        primary: "#001a55",
        secondary: "#101010",
        accent: "#111111",
        muted: "#111111",
        mutedForeground: "#001a55",
      },
    })

    CRITICAL_THEME_CONTRAST_PAIRS.forEach((pair) => {
      expect(getContrastRatio(variables[pair.background], variables[pair.foreground])).toBeGreaterThanOrEqual(4.5)
    })
  })
})
