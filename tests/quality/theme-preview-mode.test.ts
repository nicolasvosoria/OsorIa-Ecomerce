import { afterEach, describe, expect, it } from "vitest";

import {
  isThemePreviewMode,
  parseThemePreviewMessage,
  parseThemePreviewFontMessage,
  parseThemePreviewSelectMessage,
  parseThemePreviewSelectionMessage,
  parseThemePreviewContentMessage,
  THEME_PREVIEW_MESSAGE_SOURCE,
  THEME_PREVIEW_FONT_SOURCE,
  THEME_PREVIEW_SELECT_SOURCE,
  THEME_PREVIEW_SELECTION_SOURCE,
  THEME_PREVIEW_CONTENT_SOURCE,
} from "@/lib/theme-font/preview-mode";
import { DEFAULT_RUNTIME_THEME } from "@/lib/theme-font/runtime-contract";

function setSearch(search: string) {
  window.history.replaceState(null, "", `/${search}`);
}

describe("isThemePreviewMode", () => {
  afterEach(() => {
    setSearch("");
  });

  it("is false without the themePreview query param", () => {
    setSearch("");
    expect(isThemePreviewMode()).toBe(false);
  });

  it("is false for any value other than exactly '1'", () => {
    setSearch("?themePreview=true");
    expect(isThemePreviewMode()).toBe(false);
  });

  it("is true when themePreview=1 is present", () => {
    setSearch("?themePreview=1");
    expect(isThemePreviewMode()).toBe(true);
  });
});

describe("parseThemePreviewMessage", () => {
  const validPayload = {
    source: THEME_PREVIEW_MESSAGE_SOURCE,
    theme: DEFAULT_RUNTIME_THEME,
    mode: "dark" as const,
  };

  it("accepts a well-formed preview message", () => {
    const parsed = parseThemePreviewMessage(validPayload);

    expect(parsed).not.toBeNull();
    expect(parsed?.mode).toBe("dark");
    expect(parsed?.theme.theme_name).toBe(DEFAULT_RUNTIME_THEME.theme_name);
  });

  it("rejects a message with the wrong source", () => {
    expect(
      parseThemePreviewMessage({ ...validPayload, source: "something-else" }),
    ).toBeNull();
  });

  it("rejects a message with an invalid mode", () => {
    expect(
      parseThemePreviewMessage({ ...validPayload, mode: "sepia" }),
    ).toBeNull();
  });

  it("rejects a message whose theme fails normalization", () => {
    expect(
      parseThemePreviewMessage({ ...validPayload, theme: { bogus: true } }),
    ).toBeNull();
  });

  it("rejects non-object payloads", () => {
    expect(parseThemePreviewMessage(null)).toBeNull();
    expect(parseThemePreviewMessage("osoria-theme-preview")).toBeNull();
  });
});

describe("parseThemePreviewFontMessage", () => {
  const validPayload = {
    source: THEME_PREVIEW_FONT_SOURCE,
    pairing: {
      id: 3,
      pairing_name: "Inter + Inter",
      heading_font_name: "Inter",
      body_font_name: "Inter",
    },
  };

  it("accepts a well-formed font-pairing payload", () => {
    const parsed = parseThemePreviewFontMessage(validPayload);
    expect(parsed).not.toBeNull();
    expect(parsed?.source).toBe(THEME_PREVIEW_FONT_SOURCE);
    expect(
      (parsed?.pairing as Record<string, unknown>).pairing_name,
    ).toBe("Inter + Inter");
  });

  it("rejects the wrong source", () => {
    expect(
      parseThemePreviewFontMessage({ ...validPayload, source: THEME_PREVIEW_MESSAGE_SOURCE }),
    ).toBeNull();
  });

  it("rejects a pairing that is not a named object", () => {
    expect(
      parseThemePreviewFontMessage({ ...validPayload, pairing: { id: 3 } }),
    ).toBeNull();
    expect(
      parseThemePreviewFontMessage({ ...validPayload, pairing: null }),
    ).toBeNull();
  });

  it("rejects non-object payloads", () => {
    expect(parseThemePreviewFontMessage(null)).toBeNull();
    expect(parseThemePreviewFontMessage("osoria-font-preview")).toBeNull();
  });
});

describe("parseThemePreviewSelectMessage", () => {
  const validPayload = {
    source: THEME_PREVIEW_SELECT_SOURCE,
    componentName: "hero-banner",
  };

  it("accepts a well-formed select message", () => {
    const parsed = parseThemePreviewSelectMessage(validPayload);
    expect(parsed).not.toBeNull();
    expect(parsed?.componentName).toBe("hero-banner");
  });

  it("rejects a message with the wrong source", () => {
    expect(
      parseThemePreviewSelectMessage({ ...validPayload, source: "something-else" }),
    ).toBeNull();
  });

  it("rejects a missing, empty, or non-string componentName", () => {
    expect(
      parseThemePreviewSelectMessage({ source: THEME_PREVIEW_SELECT_SOURCE }),
    ).toBeNull();
    expect(
      parseThemePreviewSelectMessage({ ...validPayload, componentName: "" }),
    ).toBeNull();
    expect(
      parseThemePreviewSelectMessage({ ...validPayload, componentName: 42 }),
    ).toBeNull();
  });

  it("rejects non-object payloads", () => {
    expect(parseThemePreviewSelectMessage(null)).toBeNull();
    expect(parseThemePreviewSelectMessage("osoria-theme-select")).toBeNull();
  });
});

describe("parseThemePreviewSelectionMessage", () => {
  const validPayload = {
    source: THEME_PREVIEW_SELECTION_SOURCE,
    componentName: "hero-banner",
  };

  it("accepts a well-formed selection message", () => {
    const parsed = parseThemePreviewSelectionMessage(validPayload);
    expect(parsed).not.toBeNull();
    expect(parsed?.componentName).toBe("hero-banner");
  });

  it("accepts a null componentName as a clear-selection signal", () => {
    const parsed = parseThemePreviewSelectionMessage({
      ...validPayload,
      componentName: null,
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.componentName).toBeNull();
  });

  it("rejects a message with the wrong source", () => {
    expect(
      parseThemePreviewSelectionMessage({ ...validPayload, source: "something-else" }),
    ).toBeNull();
  });

  it("rejects an undefined or non-string componentName", () => {
    expect(
      parseThemePreviewSelectionMessage({ source: THEME_PREVIEW_SELECTION_SOURCE }),
    ).toBeNull();
    expect(
      parseThemePreviewSelectionMessage({ ...validPayload, componentName: 42 }),
    ).toBeNull();
  });

  it("rejects non-object payloads", () => {
    expect(parseThemePreviewSelectionMessage(null)).toBeNull();
    expect(parseThemePreviewSelectionMessage("osoria-theme-selection")).toBeNull();
  });
});

describe("parseThemePreviewContentMessage", () => {
  const validPayload = {
    source: THEME_PREVIEW_CONTENT_SOURCE,
    componentName: "hero-banner",
    edits: { title: "New title" },
  };

  it("accepts a well-formed content message", () => {
    const parsed = parseThemePreviewContentMessage(validPayload);
    expect(parsed).not.toBeNull();
    expect(parsed?.componentName).toBe("hero-banner");
    expect(parsed?.edits).toEqual({ title: "New title" });
  });

  it("rejects a message with the wrong source", () => {
    expect(
      parseThemePreviewContentMessage({ ...validPayload, source: "something-else" }),
    ).toBeNull();
  });

  it("rejects a missing, empty, or non-string componentName", () => {
    expect(
      parseThemePreviewContentMessage({
        source: THEME_PREVIEW_CONTENT_SOURCE,
        edits: {},
      }),
    ).toBeNull();
    expect(
      parseThemePreviewContentMessage({ ...validPayload, componentName: "" }),
    ).toBeNull();
    expect(
      parseThemePreviewContentMessage({ ...validPayload, componentName: 42 }),
    ).toBeNull();
  });

  it("rejects an edits value that is not a plain object", () => {
    expect(
      parseThemePreviewContentMessage({ ...validPayload, edits: null }),
    ).toBeNull();
    expect(
      parseThemePreviewContentMessage({ ...validPayload, edits: ["a"] }),
    ).toBeNull();
    expect(
      parseThemePreviewContentMessage({ ...validPayload, edits: "nope" }),
    ).toBeNull();
  });

  it("rejects non-object payloads", () => {
    expect(parseThemePreviewContentMessage(null)).toBeNull();
    expect(parseThemePreviewContentMessage("osoria-theme-content")).toBeNull();
  });
});
