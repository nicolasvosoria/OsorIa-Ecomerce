/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";

import {
  applyRuntimeFont,
  resolveThemeBootstrapPayload,
  ensureStylesheetLink,
  shouldLoadFontStylesheet,
} from "@/lib/theme-font/bootstrap";
import { DEFAULT_RUNTIME_THEME } from "@/lib/theme-font/runtime-contract";

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
