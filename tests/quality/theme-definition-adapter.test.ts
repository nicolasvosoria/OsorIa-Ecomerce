import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME_TOKENS,
  themeColorsToDefinition,
} from "@/lib/theme-font/theme-definition";
import { normalizeThemeRecord } from "@/lib/theme-font/runtime-contract";
import type { ThemeColors } from "@/lib/types/theme";

const LEGACY_COLORS: ThemeColors = {
  primary: "#001122",
  secondary: "#112233",
  accent: "#334455",
  background: "#ffffff",
  foreground: "#111111",
  card: "#f6f6f6",
  cardForeground: "#111111",
  border: "#dddddd",
  muted: "#efefef",
  mutedForeground: "#555555",
};

describe("themeColorsToDefinition", () => {
  it("keeps colorsLight verbatim (identical-by-default guarantee)", () => {
    const definition = themeColorsToDefinition(LEGACY_COLORS);

    expect(definition.colorsLight).toBe(LEGACY_COLORS);
    expect(definition.colorsLight).toEqual(LEGACY_COLORS);
  });

  it("applies token defaults that match DEFAULT_THEME_TOKENS exactly", () => {
    const definition = themeColorsToDefinition(LEGACY_COLORS);

    expect(definition.radius).toEqual(DEFAULT_THEME_TOKENS.radius);
    expect(definition.density).toEqual(DEFAULT_THEME_TOKENS.density);
    expect(definition.shadow).toEqual(DEFAULT_THEME_TOKENS.shadow);
    expect(definition.shape).toEqual(DEFAULT_THEME_TOKENS.shape);
  });

  it("pins radius, density and shape to the current effective values", () => {
    const definition = themeColorsToDefinition(LEGACY_COLORS);

    expect(definition.radius.base).toBe("0.5rem");
    expect(definition.density.scale).toBe(1);
    expect(definition.shape.button).toBe("var(--radius)");
    // VisualProductCard's real resting radius (rounded-3xl), not `--radius`.
    expect(definition.shape.card).toBe("1.5rem");
  });

  it("provides a curated dark fallback distinct from the light input", () => {
    const definition = themeColorsToDefinition(LEGACY_COLORS);

    expect(definition.colorsDark).not.toBe(LEGACY_COLORS);
    expect(definition.colorsDark.background).not.toBe(
      LEGACY_COLORS.background,
    );
  });
});

describe("normalizeThemeRecord (definition synthesis)", () => {
  it("still normalizes a legacy 10-color record and yields a definition", () => {
    const theme = normalizeThemeRecord({
      id: "1",
      theme_name: "Ocean",
      colors: LEGACY_COLORS,
    });

    expect(theme).not.toBeNull();
    expect(theme?.colors).toEqual(LEGACY_COLORS);
    expect(theme?.colorsLight).toEqual(LEGACY_COLORS);
    expect(theme?.radius).toEqual(DEFAULT_THEME_TOKENS.radius);
    expect(theme?.density).toEqual(DEFAULT_THEME_TOKENS.density);
    expect(theme?.shadow).toEqual(DEFAULT_THEME_TOKENS.shadow);
    expect(theme?.shape).toEqual(DEFAULT_THEME_TOKENS.shape);
    expect(theme?.colorsDark).toBeDefined();
  });
});
