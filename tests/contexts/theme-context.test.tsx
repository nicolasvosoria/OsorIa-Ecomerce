/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "@/contexts/theme-context";
import { getActiveTheme, getThemes } from "@/lib/supabase/themes-api";

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock("@/lib/supabase/themes-api", () => ({
  getThemes: vi.fn(),
  getActiveTheme: vi.fn(),
  setActiveTheme: vi.fn(),
}));

vi.mock("@/lib/react/defer-state-update", () => ({
  deferStateUpdate: (callback: () => void) => callback(),
}));

const colorsA = {
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
const colorsB = { ...colorsA, primary: "#991122" };

function Probe() {
  const { activeTheme, loading } = useTheme();
  return <div>{loading ? "loading" : activeTheme?.theme_fingerprint}</div>;
}

describe("ThemeProvider publication fingerprint refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    delete (window as any).__osoria_applied_theme;
  });

  it("reapplies confirmed DB theme when the same name has a new fingerprint", async () => {
    (window as any).__osoria_applied_theme = {
      theme_name: "Claro Original",
      theme_fingerprint: "v1:store-1:version-old:theme-1:stamp:old",
    };
    localStorage.setItem(
      "osoria_active_theme",
      JSON.stringify({
        theme_name: "Claro Original",
        theme_fingerprint: "v1:store-1:version-old:theme-1:stamp:old",
        colors: colorsA,
      }),
    );

    vi.mocked(getThemes).mockResolvedValue([
      {
        id: "theme-1",
        theme_name: "Claro Original",
        colors: colorsB,
        is_active: true,
        created_at: "2026-05-14T10:00:00Z",
        updated_at: "2026-05-14T10:30:00Z",
        theme_fingerprint: "v1:store-1:version-new:theme-1:stamp:new",
      },
    ]);
    vi.mocked(getActiveTheme).mockResolvedValue({
      id: "theme-1",
      theme_name: "Claro Original",
      colors: colorsB,
      is_active: true,
      created_at: "2026-05-14T10:00:00Z",
      updated_at: "2026-05-14T10:30:00Z",
      theme_fingerprint: "v1:store-1:version-new:theme-1:stamp:new",
    });

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
        "#991122",
      ),
    );
    expect(
      screen.getByText("v1:store-1:version-new:theme-1:stamp:new"),
    ).toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem("osoria_active_theme") ?? "{}"),
    ).toEqual(
      expect.objectContaining({
        theme_fingerprint: "v1:store-1:version-new:theme-1:stamp:new",
      }),
    );
  });
});
