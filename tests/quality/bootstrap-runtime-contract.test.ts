/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";

import {
  applyRuntimeFont,
  applyRuntimePairing,
  applyRuntimeTheme,
  buildPairingStylesheetUrl,
  resolveActiveMode,
  resolveThemeBootstrapPayload,
  ensureStylesheetLink,
  shouldLoadFontStylesheet,
} from "@/lib/theme-font/bootstrap";
import { DEFAULT_RUNTIME_THEME } from "@/lib/theme-font/runtime-contract";
import { DEFAULT_DARK_FALLBACK } from "@/lib/theme-font/theme-definition";

describe("font stylesheet bootstrap", () => {
  it("loads stylesheet only once for active custom fonts", () => {
    const url =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap";

    const firstInserted = ensureStylesheetLink(url);
    const secondInserted = ensureStylesheetLink(url);

    expect(firstInserted).toBe(true);
    expect(secondInserted).toBe(false);
    expect(
      document.head.querySelectorAll(`link[href=\"${url}\"]`),
    ).toHaveLength(1);
  });

  it("does not load stylesheet for system fonts or empty urls", () => {
    expect(
      shouldLoadFontStylesheet({
        font_name: "System",
        font_family: "system-ui, sans-serif",
        google_font_url: null,
      }),
    ).toBe(false);

    expect(
      shouldLoadFontStylesheet({
        font_name: "Broken",
        font_family: "Inter, sans-serif",
        google_font_url: "   ",
      }),
    ).toBe(false);
  });

  it("normalizes legacy font_url before bootstrap font application", () => {
    applyRuntimeFont({
      font_name: "Poppins",
      font_family: "Poppins, sans-serif",
      font_url:
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap",
    });

    expect(
      document.documentElement.style.getPropertyValue("--font-family-sans"),
    ).toBe("Poppins, sans-serif");
    expect(
      document.head.querySelectorAll(
        'link[href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap"]',
      ),
    ).toHaveLength(1);
  });
});

describe("buildPairingStylesheetUrl", () => {
  const heading = {
    font_name: "Playfair Display",
    font_family: '"Playfair Display", serif',
    google_font_url:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap",
  };
  const body = {
    font_name: "Inter",
    font_family: '"Inter", sans-serif',
    google_font_url:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap",
  };

  it("composes one combined css2 request when both axes are present", () => {
    const url = buildPairingStylesheetUrl(
      heading,
      body,
      "Playfair+Display:wght@600;700",
      "Inter:wght@400;500",
    );

    expect(url).toBe(
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500&display=swap",
    );
  });

  it("returns null when either axis is missing", () => {
    expect(
      buildPairingStylesheetUrl(heading, body, null, "Inter:wght@400;500"),
    ).toBeNull();
    expect(
      buildPairingStylesheetUrl(
        heading,
        body,
        "Playfair+Display:wght@600;700",
        null,
      ),
    ).toBeNull();
    expect(buildPairingStylesheetUrl(heading, body, null, null)).toBeNull();
  });
});

describe("applyRuntimePairing", () => {
  it("sets both heading and body CSS vars and injects one combined stylesheet link", () => {
    const combinedUrl =
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500&display=swap";

    const pairing = applyRuntimePairing({
      pairing_name: "Editorial",
      heading: {
        font_name: "Playfair Display",
        font_family: '"Playfair Display", serif',
        google_font_url:
          "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap",
        font_axis: "Playfair+Display:wght@600;700",
      },
      body: {
        font_name: "Inter",
        font_family: '"Inter", sans-serif',
        google_font_url:
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap",
        font_axis: "Inter:wght@400;500",
      },
    });

    expect(pairing?.pairing_name).toBe("Editorial");
    expect(
      document.documentElement.style.getPropertyValue("--font-family-heading"),
    ).toBe('"Playfair Display", serif');
    expect(
      document.documentElement.style.getPropertyValue("--font-family-sans"),
    ).toBe('"Inter", sans-serif');
    expect(
      document.head.querySelectorAll(`link[href="${combinedUrl}"]`),
    ).toHaveLength(1);
  });

  it("returns null for invalid input", () => {
    expect(applyRuntimePairing(null)).toBeNull();
    expect(applyRuntimePairing({ pairing_name: "Broken" })).toBeNull();
  });
});

describe("theme cache bootstrap fingerprint contract", () => {
  const fingerprintedTheme = {
    theme_name: "Cached",
    theme_fingerprint: "v1:store-1:version-1:theme-1:stamp:abc",
    colors: DEFAULT_RUNTIME_THEME.colors,
  };

  it("accepts fingerprint-aware cache when the expected fingerprint matches", () => {
    const result = resolveThemeBootstrapPayload(
      JSON.stringify(fingerprintedTheme),
      {
        expectedThemeFingerprint: fingerprintedTheme.theme_fingerprint,
      },
    );

    expect(result.status).toBe("valid");
    expect(result.theme.theme_fingerprint).toBe(
      fingerprintedTheme.theme_fingerprint,
    );
  });

  it("rejects legacy cache without a fingerprint before first paint", () => {
    const result = resolveThemeBootstrapPayload(
      JSON.stringify({
        theme_name: "Cached",
        colors: DEFAULT_RUNTIME_THEME.colors,
      }),
    );

    expect(result.status).toBe("stale");
    expect(result.theme).toEqual(DEFAULT_RUNTIME_THEME);
  });

  it("rejects fingerprint-aware cache when the expected fingerprint differs", () => {
    const result = resolveThemeBootstrapPayload(
      JSON.stringify(fingerprintedTheme),
      {
        expectedThemeFingerprint: "v1:store-1:version-2:theme-1:stamp:def",
      },
    );

    expect(result.status).toBe("stale");
    expect(result.theme.theme_fingerprint).toBe(
      DEFAULT_RUNTIME_THEME.theme_fingerprint,
    );
  });
});

describe("applyRuntimeTheme per-section surface colors", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("style");
  });

  it("writes --sec-<section>-<kebab-key> for each theme.sections entry", () => {
    applyRuntimeTheme(
      {
        ...DEFAULT_RUNTIME_THEME,
        sections: {
          featured: {
            bg: "#7baeaf",
            cardBg: "#f6f6f6",
            productBg: "#77767b",
            text: "#ffffff",
          },
        },
      },
      "light",
    );

    const root = document.documentElement.style;
    expect(root.getPropertyValue("--sec-featured-bg")).toBe("#7baeaf");
    expect(root.getPropertyValue("--sec-featured-card-bg")).toBe("#f6f6f6");
    expect(root.getPropertyValue("--sec-featured-product-bg")).toBe("#77767b");
    expect(root.getPropertyValue("--sec-featured-text")).toBe("#ffffff");
  });

  it("writes no section vars when the theme has no sections", () => {
    applyRuntimeTheme({ ...DEFAULT_RUNTIME_THEME, sections: undefined }, "light");

    const root = document.documentElement.style;
    expect(root.getPropertyValue("--sec-featured-bg")).toBe("");
  });

  it("emits a CSS length (not the raw preset key) for products.cornerRadius", () => {
    applyRuntimeTheme(
      {
        ...DEFAULT_RUNTIME_THEME,
        sections: {
          products: { cornerRadius: "lg" },
        },
      },
      "light",
    );

    const root = document.documentElement.style;
    expect(root.getPropertyValue("--sec-products-corner-radius")).toBe("1rem");
  });

  it("maps every products.cornerRadius preset key to its CSS length equivalent", () => {
    applyRuntimeTheme(
      { ...DEFAULT_RUNTIME_THEME, sections: { products: { cornerRadius: "none" } } },
      "light",
    );
    expect(
      document.documentElement.style.getPropertyValue("--sec-products-corner-radius"),
    ).toBe("0px");
  });

  it("removes a stale --sec-<...> var when the new theme drops that section (reset to theme)", () => {
    applyRuntimeTheme(
      {
        ...DEFAULT_RUNTIME_THEME,
        sections: { hero: { button: "#ff0000" } },
      },
      "light",
    );
    expect(
      document.documentElement.style.getPropertyValue("--sec-hero-button"),
    ).toBe("#ff0000");

    applyRuntimeTheme({ ...DEFAULT_RUNTIME_THEME, sections: {} }, "light");

    expect(
      document.documentElement.style.getPropertyValue("--sec-hero-button"),
    ).toBe("");
  });

  it("falls back to the raw value for an unknown products.cornerRadius key", () => {
    applyRuntimeTheme(
      { ...DEFAULT_RUNTIME_THEME, sections: { products: { cornerRadius: "1.25rem" } } },
      "light",
    );
    expect(
      document.documentElement.style.getPropertyValue("--sec-products-corner-radius"),
    ).toBe("1.25rem");
  });
});

describe("applyRuntimeTheme mode resolution when `mode` is omitted", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("style");
  });

  it("defaults to light (byte-identical) when there is no stored mode preference", () => {
    expect(resolveActiveMode()).toBe("light");

    applyRuntimeTheme(DEFAULT_RUNTIME_THEME);

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(
      document.documentElement.style.getPropertyValue("--foreground"),
    ).toBe(DEFAULT_RUNTIME_THEME.colors.foreground);
  });

  it("keeps dark mode active (does not revert to light) when the active mode is dark", () => {
    localStorage.setItem("osoria_mode", "dark");
    expect(resolveActiveMode()).toBe("dark");

    applyRuntimeTheme(DEFAULT_RUNTIME_THEME);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(
      document.documentElement.style.getPropertyValue("--foreground"),
    ).toBe(DEFAULT_DARK_FALLBACK.foreground);
  });
});
