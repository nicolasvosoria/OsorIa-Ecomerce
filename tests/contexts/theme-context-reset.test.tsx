/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "@/contexts/theme-context";
import { getActiveTheme, getThemes, setActiveTheme } from "@/lib/supabase/themes-api";

const refreshStyles = vi.fn();

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock("@/contexts/styles-context", () => ({
  useStyles: () => ({ refreshStyles }),
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

const colors = {
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

function ChangeThemeProbe() {
  const { changeTheme } = useTheme();
  return (
    <button onClick={() => changeTheme("Océano")}>trigger-change</button>
  );
}

describe("ThemeProvider clears the per-section styles cache after a reset (D3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.cookie = "store_id=store-reset-1";
    delete (window as any).__osoria_applied_theme;

    vi.mocked(getThemes).mockResolvedValue([]);
    vi.mocked(getActiveTheme).mockResolvedValue(null);
  });

  it("clears the scoped localStorage cache and calls refreshStyles on a successful theme apply", async () => {
    localStorage.setItem(
      "osoria_component_styles_store-reset-1",
      JSON.stringify({ hero: { color: "red" } }),
    );

    vi.mocked(setActiveTheme).mockResolvedValue({
      success: true,
      activeTheme: {
        id: "theme-2",
        theme_name: "Océano",
        colors,
        is_active: true,
        created_at: "2026-05-14T10:00:00Z",
        updated_at: "2026-05-14T10:00:00Z",
        theme_fingerprint: "v1:store-reset-1:version-2:theme-2:stamp:hash",
      },
    });

    render(
      <ThemeProvider>
        <ChangeThemeProbe />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByText("trigger-change"));

    await waitFor(() => expect(refreshStyles).toHaveBeenCalled());
    expect(
      localStorage.getItem("osoria_component_styles_store-reset-1"),
    ).toBeNull();
  });

  it("does not clear the cache when the theme apply fails", async () => {
    localStorage.setItem(
      "osoria_component_styles_store-reset-1",
      JSON.stringify({ hero: { color: "red" } }),
    );

    vi.mocked(setActiveTheme).mockResolvedValue({
      success: false,
      error: "boom",
    });

    render(
      <ThemeProvider>
        <ChangeThemeProbe />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByText("trigger-change"));

    await waitFor(() => expect(setActiveTheme).toHaveBeenCalled());
    expect(refreshStyles).not.toHaveBeenCalled();
    expect(
      localStorage.getItem("osoria_component_styles_store-reset-1"),
    ).not.toBeNull();
  });
});
