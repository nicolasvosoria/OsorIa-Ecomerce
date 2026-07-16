/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "@/contexts/theme-context";
import { getActiveTheme, getThemes } from "@/lib/supabase/themes-api";
import { THEME_PREVIEW_MESSAGE_SOURCE } from "@/lib/theme-font/preview-mode";
import { DEFAULT_RUNTIME_THEME } from "@/lib/theme-font/runtime-contract";

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock("@/contexts/styles-context", () => ({
  useStyles: () => ({ refreshStyles: vi.fn() }),
}));

vi.mock("@/lib/supabase/themes-api", () => ({
  getThemes: vi.fn(),
  getActiveTheme: vi.fn(),
  setActiveTheme: vi.fn(),
  CATALOG_DEFAULT_THEME_NAME: "Tech",
}));

vi.mock("@/lib/react/defer-state-update", () => ({
  deferStateUpdate: (callback: () => void) => callback(),
}));

function Probe() {
  const { loading } = useTheme();
  return <div>{loading ? "loading" : "ready"}</div>;
}

function postPreviewMessage(data: unknown) {
  window.dispatchEvent(
    new MessageEvent("message", { data, origin: window.location.origin }),
  );
}

describe("ThemeProvider preview mode (?themePreview=1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("class");
    delete (window as any).__osoria_applied_theme;
    window.history.replaceState(null, "", "/?themePreview=1");
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("never fetches the persisted theme or applies its own poll", async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await waitFor(() => expect(screen.getByText("ready")).toBeInTheDocument());

    expect(getThemes).not.toHaveBeenCalled();
    expect(getActiveTheme).not.toHaveBeenCalled();
  });

  it("applies a valid preview message from the parent", async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByText("ready")).toBeInTheDocument());

    postPreviewMessage({
      source: THEME_PREVIEW_MESSAGE_SOURCE,
      theme: { ...DEFAULT_RUNTIME_THEME, theme_fingerprint: "preview:custom" },
      mode: "dark",
    });

    await waitFor(() =>
      expect(document.documentElement.classList.contains("dark")).toBe(true),
    );
  });

  it("ignores a malformed message (wrong source)", async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByText("ready")).toBeInTheDocument());

    postPreviewMessage({ source: "not-osoria", theme: DEFAULT_RUNTIME_THEME, mode: "dark" });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
