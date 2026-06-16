/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";

import {
  applyRuntimeFont,
  ensureStylesheetLink,
  shouldLoadFontStylesheet,
} from "@/lib/theme-font/bootstrap";

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

import { ApplyStylesScript } from "@/components/apply-styles-script";
import { DEFAULT_RUNTIME_THEME } from "@/lib/theme-font/runtime-contract";
import { applyRuntimeTheme } from "@/lib/theme-font/bootstrap";
import { CRITICAL_THEME_CSS_VARIABLES } from "@/lib/theme-font/contrast";

describe("theme contrast bootstrap parity", () => {
  function readCriticalVariables() {
    return Object.fromEntries(
      CRITICAL_THEME_CSS_VARIABLES.map((name) => [
        name,
        document.documentElement.style.getPropertyValue(name),
      ]),
    );
  }

  it("beforeInteractive script and runtime provider emit the same critical variables", () => {
    const unsafeTheme = {
      theme_name: "Unsafe cached theme",
      colors: {
        ...DEFAULT_RUNTIME_THEME.colors,
        primary: "#001a66",
        foreground: "#000000",
        background: "#000000",
      },
    };

    localStorage.setItem("osoria_active_theme", JSON.stringify(unsafeTheme));
    const element = ApplyStylesScript() as { props: { dangerouslySetInnerHTML: { __html: string } } };
    const script = element.props.dangerouslySetInnerHTML.__html;
    expect(script).toContain("resolveThemeCssVariables");
    new Function(script ?? "")();
    const scriptVariables = readCriticalVariables();
    const scriptBodyBackground = document.body.style.backgroundColor;

    document.documentElement.removeAttribute("style");
    document.body.removeAttribute("style");
    applyRuntimeTheme(unsafeTheme);
    const runtimeVariables = readCriticalVariables();

    expect(scriptVariables).toEqual(runtimeVariables);
    expect(scriptBodyBackground).toBe(document.body.style.backgroundColor);
  });
});
