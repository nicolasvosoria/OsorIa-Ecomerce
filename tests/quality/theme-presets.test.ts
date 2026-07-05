import { describe, expect, it } from "vitest";

import { DEFAULT_THEME_TOKENS } from "@/lib/theme-font/theme-definition";
import {
  resolveThemeDefinition,
  THEME_PRESETS,
} from "@/lib/theme-font/theme-presets";
import type { ThemeColors } from "@/lib/types/theme";

const COLORS: ThemeColors = {
  primary: "#005aa1",
  secondary: "#c4faff",
  accent: "#005aa1",
  background: "#ffffff",
  foreground: "#1a1a1a",
  card: "#ffffff",
  cardForeground: "#1a1a1a",
  border: "#e5e5e5",
  muted: "#f5f5f5",
  mutedForeground: "#737373",
};

const REAL_THEME_NAMES = ["Tech", "Minimal", "Suave", "Bold", "Boutique"];
const DISTINCTIVE_THEME_NAMES = ["Minimal", "Suave", "Bold", "Boutique"];

describe("resolveThemeDefinition", () => {
  it("registers overrides for all 5 real theme names", () => {
    for (const name of REAL_THEME_NAMES) {
      expect(THEME_PRESETS[name]).toBeDefined();
    }
  });

  it("keeps Tech identical to DEFAULT_THEME_TOKENS except for shape.button (unified --button-radius token)", () => {
    const definition = resolveThemeDefinition("Tech", COLORS);

    expect(definition.radius).toEqual(DEFAULT_THEME_TOKENS.radius);
    expect(definition.density).toEqual(DEFAULT_THEME_TOKENS.density);
    expect(definition.shadow).toEqual(DEFAULT_THEME_TOKENS.shadow);
    expect(definition.shape).toEqual({ button: "9999px", card: "1.5rem" });
    expect(definition.colorsDark).toEqual(THEME_PRESETS.Tech.colorsDark);
  });

  it("keeps colorsLight verbatim for Tech", () => {
    const definition = resolveThemeDefinition("Tech", COLORS);

    expect(definition.colorsLight).toBe(COLORS);
  });

  it("never lets any of the 5 presets mutate colorsLight", () => {
    for (const name of REAL_THEME_NAMES) {
      const definition = resolveThemeDefinition(name, COLORS);
      expect(definition.colorsLight).toBe(COLORS);
    }
  });

  it("gives each distinctive theme its own curated colorsDark and shape/shadow/radius/density tokens", () => {
    for (const name of DISTINCTIVE_THEME_NAMES) {
      const definition = resolveThemeDefinition(name, COLORS);
      const preset = THEME_PRESETS[name];

      expect(definition.colorsDark).toEqual(preset.colorsDark);
      expect(definition.radius).toEqual(preset.radius);
      expect(definition.density).toEqual(preset.density);
      expect(definition.shadow).toEqual(preset.shadow);
      expect(definition.shape).toEqual(preset.shape);
    }
  });

  it("resolves the exact Minimal tokens", () => {
    const definition = resolveThemeDefinition("Minimal", COLORS);

    expect(definition.radius).toEqual({ base: "0px" });
    expect(definition.density).toEqual({ scale: 1.14 });
    expect(definition.shadow).toEqual({
      card: "none",
      elevated: "0 0 0 1px var(--border)",
    });
    expect(definition.shape).toEqual({ button: "0px", card: "0px" });
  });

  it("resolves the exact Suave tokens", () => {
    const definition = resolveThemeDefinition("Suave", COLORS);

    expect(definition.radius).toEqual({ base: "1.25rem" });
    expect(definition.density).toEqual({ scale: 1.06 });
    expect(definition.shadow).toEqual({
      card: "0 8px 24px -6px rgba(158,101,110,.22)",
      elevated: "0 18px 44px -12px rgba(158,101,110,.32)",
    });
    expect(definition.shape).toEqual({ button: "9999px", card: "1.25rem" });
  });

  it("resolves the exact Bold tokens", () => {
    const definition = resolveThemeDefinition("Bold", COLORS);

    expect(definition.radius).toEqual({ base: "0.15rem" });
    expect(definition.density).toEqual({ scale: 0.97 });
    expect(definition.shadow).toEqual({
      card: "4px 4px 0 var(--border)",
      elevated: "7px 7px 0 var(--border)",
    });
    expect(definition.shape).toEqual({ button: "0.15rem", card: "0.15rem" });
  });

  it("resolves the exact Boutique tokens", () => {
    const definition = resolveThemeDefinition("Boutique", COLORS);

    expect(definition.radius).toEqual({ base: "0.75rem" });
    expect(definition.density).toEqual({ scale: 1.05 });
    expect(definition.shadow).toEqual({
      card: "0 6px 18px -6px rgba(74,53,39,.2)",
      elevated: "0 16px 34px -12px rgba(74,53,39,.3)",
    });
    expect(definition.shape).toEqual({ button: "0.5rem", card: "0.9rem" });
  });

  it("falls back to the pure adapter for an unknown theme name", () => {
    const known = resolveThemeDefinition("Tech", COLORS);
    const unknown = resolveThemeDefinition("Some Unregistered Theme", COLORS);

    expect(unknown.colorsLight).toBe(COLORS);
    expect(unknown.radius).toEqual(DEFAULT_THEME_TOKENS.radius);
    expect(unknown.density).toEqual(DEFAULT_THEME_TOKENS.density);
    expect(unknown.shadow).toEqual(DEFAULT_THEME_TOKENS.shadow);
    expect(unknown.shape).toEqual(DEFAULT_THEME_TOKENS.shape);
    expect(unknown.colorsDark).not.toEqual(known.colorsDark);
  });

  it("falls back to the pure adapter for a null/empty theme name", () => {
    const nullnamed = resolveThemeDefinition(null, COLORS);
    const emptyNamed = resolveThemeDefinition("   ", COLORS);

    expect(nullnamed.colorsLight).toBe(COLORS);
    expect(emptyNamed.colorsLight).toBe(COLORS);
  });

  it("matches theme names case-insensitively and trimmed", () => {
    const canonical = resolveThemeDefinition("Boutique", COLORS);
    const looselyCased = resolveThemeDefinition("  boutique  ", COLORS);

    expect(looselyCased.colorsDark).toEqual(canonical.colorsDark);
  });

  it("gives each of the 5 presets its designed shape.button value so buttons/inputs follow the theme", () => {
    const BUTTON_RADII: Record<string, string> = {
      Tech: "9999px",
      Minimal: "0px",
      Suave: "9999px",
      Bold: "0.15rem",
      Boutique: "0.5rem",
    };

    for (const name of REAL_THEME_NAMES) {
      const definition = resolveThemeDefinition(name, COLORS);
      expect(definition.shape?.button).toBe(BUTTON_RADII[name]);
    }
  });
});

describe("per-section surface colors (featured)", () => {
  const FEATURED_PALETTES: Record<string, Record<string, string>> = {
    Tech: { bg: "#7baeaf", cardBg: "#f6f6f6", productBg: "#77767b", text: "#ffffff" },
    Minimal: { bg: "#eceae5", cardBg: "#fdfdfb", productBg: "#d8d5cc", text: "#1b1b18" },
    Suave: { bg: "#fdeef0", cardBg: "#ffffff", productBg: "#f6d3da", text: "#4a3b34" },
    Bold: { bg: "#0a0a0a", cardBg: "#161616", productBg: "#262626", text: "#fafafa" },
    Boutique: { bg: "#f2e5d5", cardBg: "#fffaf3", productBg: "#e6d5bf", text: "#4a3527" },
  };

  it("gives each of the 5 presets its designed featured palette", () => {
    for (const name of REAL_THEME_NAMES) {
      const definition = resolveThemeDefinition(name, COLORS);
      expect(definition.sections?.featured).toEqual(FEATURED_PALETTES[name]);
    }
  });

  it("keeps Tech's featured bg at #7baeaf (byte-identical to today)", () => {
    const definition = resolveThemeDefinition("Tech", COLORS);
    expect(definition.sections?.featured?.bg).toBe("#7baeaf");
  });
});

describe("per-section surface colors (specialOffer)", () => {
  const SPECIAL_OFFER_PALETTES: Record<string, Record<string, string>> = {
    Tech: { bg: "#ed333b", accent: "#f5c211", productBg: "#f66151", text: "#ffffff" },
    Minimal: { bg: "#1b1b18", accent: "#8a8574", productBg: "#2a2a26", text: "#f6f5f2" },
    Suave: { bg: "#ec6a80", accent: "#ffd166", productBg: "#f58aa0", text: "#ffffff" },
    Bold: { bg: "#0a0a0a", accent: "#ffe600", productBg: "#1c1c1c", text: "#ffffff" },
    Boutique: { bg: "#b0603f", accent: "#e8b04b", productBg: "#c47a5c", text: "#fff8f1" },
  };

  it("gives each of the 5 presets its designed specialOffer palette", () => {
    for (const name of REAL_THEME_NAMES) {
      const definition = resolveThemeDefinition(name, COLORS);
      expect(definition.sections?.specialOffer).toEqual(SPECIAL_OFFER_PALETTES[name]);
    }
  });

  it("keeps Tech's specialOffer colors byte-identical to today's live values", () => {
    const definition = resolveThemeDefinition("Tech", COLORS);
    expect(definition.sections?.specialOffer).toEqual({
      bg: "#ed333b",
      accent: "#f5c211",
      productBg: "#f66151",
      text: "#ffffff",
    });
  });
});

describe("per-section surface colors (newsletter)", () => {
  const NEWSLETTER_PALETTES: Record<string, Record<string, string>> = {
    Tech: { button: "#c01c28" },
    Minimal: { button: "#1b1b18" },
    Suave: { button: "#ec6a80" },
    Bold: { button: "#ff2d55" },
    Boutique: { button: "#b0603f" },
  };

  it("gives each of the 5 presets its designed newsletter palette", () => {
    for (const name of REAL_THEME_NAMES) {
      const definition = resolveThemeDefinition(name, COLORS);
      expect(definition.sections?.newsletter).toEqual(NEWSLETTER_PALETTES[name]);
    }
  });

  it("keeps Tech's newsletter button byte-identical to today's live value", () => {
    const definition = resolveThemeDefinition("Tech", COLORS);
    expect(definition.sections?.newsletter?.button).toBe("#c01c28");
  });
});

describe("per-section surface colors (hero)", () => {
  const HERO_PALETTES: Record<string, Record<string, string>> = {
    Tech: { button: "#33d17a" },
    Minimal: { button: "#1b1b18" },
    Suave: { button: "#ec6a80" },
    Bold: { button: "#0a0a0a" },
    Boutique: { button: "#b0603f" },
  };

  it("gives each of the 5 presets its designed hero palette", () => {
    for (const name of REAL_THEME_NAMES) {
      const definition = resolveThemeDefinition(name, COLORS);
      expect(definition.sections?.hero).toEqual(HERO_PALETTES[name]);
    }
  });

  it("keeps Tech's hero button byte-identical to today's live value", () => {
    const definition = resolveThemeDefinition("Tech", COLORS);
    expect(definition.sections?.hero?.button).toBe("#33d17a");
  });
});

describe("per-section surface colors (popular)", () => {
  const POPULAR_PALETTES: Record<string, Record<string, string>> = {
    Tech: { button: "#33d17a" },
    Minimal: { button: "#1b1b18" },
    Suave: { button: "#ec6a80" },
    Bold: { button: "#0a0a0a" },
    Boutique: { button: "#b0603f" },
  };

  it("gives each of the 5 presets its designed popular palette", () => {
    for (const name of REAL_THEME_NAMES) {
      const definition = resolveThemeDefinition(name, COLORS);
      expect(definition.sections?.popular).toEqual(POPULAR_PALETTES[name]);
    }
  });

  it("keeps Tech's popular button matching the hero button (#33d17a)", () => {
    const definition = resolveThemeDefinition("Tech", COLORS);
    expect(definition.sections?.popular?.button).toBe("#33d17a");
  });
});
