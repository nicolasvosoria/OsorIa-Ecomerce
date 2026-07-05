/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";

import { applyRuntimeTheme } from "@/lib/theme-font/bootstrap";
import { DEFAULT_RUNTIME_THEME } from "@/lib/theme-font/runtime-contract";
import { DEFAULT_THEME_TOKENS } from "@/lib/theme-font/theme-definition";

describe("applyRuntimeTheme density token (identical-by-default)", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("style");
  });

  it("writes --density-scale = '1' for the default theme", () => {
    applyRuntimeTheme(DEFAULT_RUNTIME_THEME, "light");

    const root = document.documentElement.style;
    expect(root.getPropertyValue("--density-scale")).toBe("1");
    expect(DEFAULT_THEME_TOKENS.density.scale).toBe(1);
  });

  it("falls back to '1' when a theme omits density", () => {
    const legacyTheme = { ...DEFAULT_RUNTIME_THEME, density: undefined };

    applyRuntimeTheme(legacyTheme, "light");

    const root = document.documentElement.style;
    expect(root.getPropertyValue("--density-scale")).toBe("1");
  });

  it("writes a non-default scale verbatim", () => {
    const denserTheme = {
      ...DEFAULT_RUNTIME_THEME,
      density: { scale: 1.1 },
    };

    applyRuntimeTheme(denserTheme, "light");

    const root = document.documentElement.style;
    expect(root.getPropertyValue("--density-scale")).toBe("1.1");
  });
});
