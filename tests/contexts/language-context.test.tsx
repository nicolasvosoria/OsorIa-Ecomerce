/** @vitest-environment jsdom */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider, useLanguage } from "@/contexts/language-context";
import { translations } from "@/lib/i18n/translations";

describe("LanguageProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("always resolves Spanish, even when a stale 'osoria_language' entry points at another language", () => {
    localStorage.setItem("osoria_language", "en");

    const { result } = renderHook(() => useLanguage(), {
      wrapper: LanguageProvider,
    });

    expect(result.current.language).toBe("es");
    expect(result.current.t).toBe(translations.es);
  });

  it("ignores the browser's language even when it points at another language", () => {
    vi.spyOn(window.navigator, "language", "get").mockReturnValue("pt-BR");

    const { result } = renderHook(() => useLanguage(), {
      wrapper: LanguageProvider,
    });

    expect(result.current.language).toBe("es");
  });

  it("throws when useLanguage is used outside a LanguageProvider", () => {
    expect(() => renderHook(() => useLanguage())).toThrow(
      "useLanguage must be used within a LanguageProvider",
    );
  });
});
