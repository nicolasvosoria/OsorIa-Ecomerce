import { beforeEach, describe, expect, it, vi } from "vitest";

import { getActiveTheme } from "@/lib/supabase/themes-api";
import { getSupabaseEcommerce } from "@/lib/supabase/client";
import { getStoreId } from "@/lib/utils/store";
import { resolveThemeDefinition } from "@/lib/theme-font/theme-presets";

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: vi.fn(),
  getSupabaseBrowserClient: vi.fn(),
}));

vi.mock("@/lib/utils/store", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/utils/store")>(
      "@/lib/utils/store",
    );

  return {
    ...actual,
    getStoreId: vi.fn(),
  };
});

const mockedGetSupabaseEcommerce = vi.mocked(getSupabaseEcommerce);
const mockedGetStoreId = vi.mocked(getStoreId);

const THEME_COLORS = {
  primary: "#111111",
  secondary: "#222222",
  accent: "#333333",
  background: "#ffffff",
  foreground: "#000000",
  card: "#f5f5f5",
  cardForeground: "#101010",
  border: "#dedede",
  muted: "#eeeeee",
  mutedForeground: "#444444",
};

const CURRENT_VERSION_BASE = {
  id: "version-1",
  store_id: "store-123",
  theme_id: "theme-1",
  created_at: "2026-05-14T10:05:00Z",
};

const THEME_ROW = {
  id: "theme-1",
  theme_name: "Claro Original",
  updated_at: "2026-05-14T10:00:00Z",
  colors: THEME_COLORS,
};

function mockThemeVersionAndThemeQueries(version: Record<string, unknown>) {
  const versionMaybeSingle = vi
    .fn()
    .mockResolvedValue({ data: version, error: null });
  const versionEq2 = vi
    .fn()
    .mockReturnValue({ maybeSingle: versionMaybeSingle });
  const versionEq1 = vi.fn().mockReturnValue({ eq: versionEq2 });
  const versionSelect = vi.fn().mockReturnValue({ eq: versionEq1 });

  const themeMaybeSingle = vi
    .fn()
    .mockResolvedValue({ data: THEME_ROW, error: null });
  const themeEq = vi.fn().mockReturnValue({ maybeSingle: themeMaybeSingle });
  const themeSelect = vi.fn().mockReturnValue({ eq: themeEq });

  const from = vi.fn((table: string) => {
    if (table === "app_theme_versions") return { select: versionSelect };
    if (table === "app_themes") return { select: themeSelect };
    throw new Error(`unexpected table ${table}`);
  });

  mockedGetSupabaseEcommerce.mockReturnValue({ from } as any);
}

describe("getActiveTheme definition merge (variables/fonts jsonb)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetStoreId.mockResolvedValue("store-123");
  });

  it("falls back to resolveThemeDefinition when variables/fonts are NULL (identical-by-default)", async () => {
    mockThemeVersionAndThemeQueries({
      ...CURRENT_VERSION_BASE,
      variables: null,
      fonts: null,
    });

    const theme = await getActiveTheme();
    // `AppTheme.definition.fontPairingId` is always explicit (`?? null`),
    // matching the existing `normalizeThemeRecord` guarantee — even though
    // `resolveThemeDefinition` itself omits the key when no preset sets it.
    const expected = {
      ...resolveThemeDefinition("Claro Original", THEME_COLORS),
      fontPairingId: null,
    };

    expect(theme?.definition).toEqual(expected);
  });

  it("prefers a stored definition bundle from variables/fonts when present", async () => {
    const storedColorsDark = {
      ...THEME_COLORS,
      primary: "#abcdef",
    };
    const storedVariables = {
      colorsLight: THEME_COLORS,
      colorsDark: storedColorsDark,
      radius: { base: "1rem" },
      density: { scale: 1.2 },
      shadow: { card: "0 1px 2px rgb(0 0 0 / 0.2)", elevated: "0 4px 8px rgb(0 0 0 / 0.3)" },
      shape: { button: "9999px", card: "1rem" },
    };
    const storedFonts = { fontPairingId: "tech-pairing" };

    mockThemeVersionAndThemeQueries({
      ...CURRENT_VERSION_BASE,
      variables: storedVariables,
      fonts: storedFonts,
    });

    const theme = await getActiveTheme();

    expect(theme?.definition).toEqual({
      colorsLight: THEME_COLORS,
      colorsDark: storedColorsDark,
      radius: { base: "1rem" },
      density: { scale: 1.2 },
      shadow: { card: "0 1px 2px rgb(0 0 0 / 0.2)", elevated: "0 4px 8px rgb(0 0 0 / 0.3)" },
      shape: { button: "9999px", card: "1rem" },
      fontPairingId: "tech-pairing",
    });
  });

  it("falls back gracefully per-field when variables is malformed or partial", async () => {
    // `variables` is not an object at all (e.g. corrupted write) — the whole
    // overlay must be dropped, not crash the request.
    mockThemeVersionAndThemeQueries({
      ...CURRENT_VERSION_BASE,
      variables: "not-an-object",
      fonts: undefined,
    });

    const theme = await getActiveTheme();
    const expected = {
      ...resolveThemeDefinition("Claro Original", THEME_COLORS),
      fontPairingId: null,
    };

    expect(theme?.definition).toEqual(expected);
  });

  it("round-trips a stored `sections` overlay instead of dropping it", async () => {
    const storedSections = { featured: { bg: "#123456" } };
    const storedVariables = {
      colorsLight: THEME_COLORS,
      colorsDark: THEME_COLORS,
      radius: { base: "1rem" },
      density: { scale: 1.2 },
      shadow: { card: "0 1px 2px rgb(0 0 0 / 0.2)", elevated: "0 4px 8px rgb(0 0 0 / 0.3)" },
      shape: { button: "9999px", card: "1rem" },
      sections: storedSections,
    };

    mockThemeVersionAndThemeQueries({
      ...CURRENT_VERSION_BASE,
      variables: storedVariables,
      fonts: null,
    });

    const theme = await getActiveTheme();

    expect(theme?.definition?.sections).toEqual(storedSections);
  });

  it("falls back per-field when variables is a partial/invalid bundle", async () => {
    // `radius` is malformed (missing `base`); every other field is a valid
    // stored override. Only `radius` should fall back to the adapter value.
    const storedVariables = {
      colorsLight: THEME_COLORS,
      colorsDark: THEME_COLORS,
      radius: { wrongKey: "1rem" },
      density: { scale: 1.5 },
      shadow: { card: "none", elevated: "none" },
      shape: { button: "1rem", card: "1rem" },
    };

    mockThemeVersionAndThemeQueries({
      ...CURRENT_VERSION_BASE,
      variables: storedVariables,
      fonts: null,
    });

    const theme = await getActiveTheme();
    const expectedFallback = resolveThemeDefinition(
      "Claro Original",
      THEME_COLORS,
    );

    expect(theme?.definition?.radius).toEqual(expectedFallback.radius);
    expect(theme?.definition?.density).toEqual({ scale: 1.5 });
  });
});
