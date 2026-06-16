import { describe, expect, it } from "vitest";

import {
  DEFAULT_RUNTIME_THEME,
  normalizeFontRecord,
  normalizeThemeRecord,
  stableThemeColorsHash,
} from "@/lib/theme-font/runtime-contract";
import {
  normalizeRuntimeStoreId,
  resolveScopedStorageKey,
} from "@/lib/utils/store";
import { resolveThemeBootstrapPayload } from "@/lib/theme-font/bootstrap";

describe("normalizeThemeRecord", () => {
  it("returns canonical runtime shape for current payload", () => {
    const theme = normalizeThemeRecord({
      id: "1",
      theme_name: "Ocean",
      colors: {
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
      },
    });

    expect(theme).toEqual(
      expect.objectContaining({
        theme_name: "Ocean",
        colors: {
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
        },
        theme_fingerprint: expect.stringMatching(/^legacy:1:/),
      }),
    );
  });

  it("derives a deterministic fingerprint from version metadata and colors", () => {
    const base = {
      id: "theme-1",
      store_id: "store-1",
      theme_version_id: "version-1",
      updated_at: "2026-05-14T10:00:00Z",
      theme_published_at: "2026-05-14T10:05:00Z",
      theme_name: "Ocean",
      colors: {
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
      },
    };

    const first = normalizeThemeRecord(base);
    const changedSameName = normalizeThemeRecord({
      ...base,
      colors: { ...base.colors, primary: "#991122" },
    });

    expect(first?.theme_fingerprint).toBe(
      `v1:store-1:version-1:theme-1:2026-05-14T10:00:00Z:${stableThemeColorsHash(base.colors)}`,
    );
    expect(changedSameName?.theme_name).toBe("Ocean");
    expect(changedSameName?.theme_fingerprint).not.toBe(
      first?.theme_fingerprint,
    );
  });

  it("derives v1 fingerprints from numeric database ids", () => {
    const colors = {
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

    const theme = normalizeThemeRecord({
      theme_id: 42,
      store_id: "store-1",
      version_id: 7,
      updated_at: "2026-05-14T10:00:00Z",
      theme_name: "Ocean",
      colors,
    });

    expect(theme?.theme_fingerprint).toBe(
      `v1:store-1:7:42:2026-05-14T10:00:00Z:${stableThemeColorsHash(colors)}`,
    );
    expect(theme?.theme_version_id).toBe("7");
  });

  it("normalizes legacy theme_config into a fingerprinted runtime shape", () => {
    const legacy = normalizeThemeRecord({
      id: "theme-legacy",
      updated_at: "2026-05-14T11:00:00Z",
      theme_name: "Legacy",
      theme_config: {
        primary: "#123456",
        secondary: "#223456",
        accent: "#323456",
        background: "#fefefe",
        foreground: "#1c1c1c",
        card: "#ffffff",
        cardForeground: "#121212",
        border: "#ededed",
        muted: "#fafafa",
        mutedForeground: "#4c4c4c",
      },
    });

    expect(legacy).toEqual(
      expect.objectContaining({
        theme_name: "Legacy",
        theme_fingerprint: expect.stringMatching(
          /^legacy:theme-legacy:2026-05-14T11:00:00Z:/,
        ),
      }),
    );
  });

  it("maps legacy theme_config to canonical colors", () => {
    const theme = normalizeThemeRecord({
      theme_name: "Legacy",
      theme_config: {
        primary: "#123456",
        secondary: "#223456",
        accent: "#323456",
        background: "#fefefe",
        foreground: "#1c1c1c",
        card: "#ffffff",
        cardForeground: "#121212",
        border: "#ededed",
        muted: "#fafafa",
        mutedForeground: "#4c4c4c",
      },
    });

    expect(theme?.colors.primary).toBe("#123456");
    expect(theme?.theme_name).toBe("Legacy");
  });
});

describe("normalizeFontRecord", () => {
  it("maps legacy font_url to canonical google_font_url", () => {
    const font = normalizeFontRecord({
      font_name: "Poppins",
      font_family: "Poppins, sans-serif",
      font_url:
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap",
    });

    expect(font).toEqual({
      font_name: "Poppins",
      font_family: "Poppins, sans-serif",
      google_font_url:
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap",
    });
  });

  it("returns null url for system fonts without external stylesheet", () => {
    const font = normalizeFontRecord({
      font_name: "System",
      font_family: "system-ui, sans-serif",
      google_font_url: null,
    });

    expect(font?.google_font_url).toBeNull();
  });
});

describe("store runtime resolution", () => {
  it("rejects symbolic default as scoped runtime store id", () => {
    expect(normalizeRuntimeStoreId("default")).toBeNull();
    expect(
      resolveScopedStorageKey("osoria_component_styles", "default"),
    ).toBeNull();
  });

  it("builds scoped cache key only for real store ids", () => {
    const storeId = "84f0a892-cf12-4826-befd-cf64e1235123";
    expect(normalizeRuntimeStoreId(storeId)).toBe(storeId);
    expect(resolveScopedStorageKey("osoria_component_styles", storeId)).toBe(
      `osoria_component_styles_${storeId}`,
    );
  });
});

describe("resolveThemeBootstrapPayload", () => {
  it("applies valid cached theme", () => {
    const cachedTheme = JSON.stringify({
      theme_name: "Cached",
      theme_fingerprint: "legacy:cached:stamp:hash",
      colors: {
        primary: "#0a0a0a",
        secondary: "#0b0b0b",
        accent: "#0c0c0c",
        background: "#101010",
        foreground: "#fafafa",
        card: "#1a1a1a",
        cardForeground: "#f0f0f0",
        border: "#2a2a2a",
        muted: "#3a3a3a",
        mutedForeground: "#d0d0d0",
      },
    });

    const result = resolveThemeBootstrapPayload(cachedTheme, {
      fallbackTheme: DEFAULT_RUNTIME_THEME,
    });

    expect(result.status).toBe("valid");
    expect(result.theme.theme_name).toBe("Cached");
  });

  it("falls back when cache is stale against expected active theme", () => {
    const cachedTheme = JSON.stringify({
      theme_name: "Old Theme",
      colors: DEFAULT_RUNTIME_THEME.colors,
    });

    const result = resolveThemeBootstrapPayload(cachedTheme, {
      fallbackTheme: DEFAULT_RUNTIME_THEME,
      expectedThemeName: "Claro Original",
    });

    expect(result.status).toBe("stale");
    expect(result.theme.theme_name).toBe("Claro Original");
  });

  it("falls back for corrupt cache payloads", () => {
    const result = resolveThemeBootstrapPayload("{invalid-json", {
      fallbackTheme: DEFAULT_RUNTIME_THEME,
    });

    expect(result.status).toBe("corrupt");
    expect(result.theme).toEqual(DEFAULT_RUNTIME_THEME);
  });
});
