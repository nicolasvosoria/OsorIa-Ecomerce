/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "@/contexts/theme-context";
import { getActiveTheme, getThemes } from "@/lib/supabase/themes-api";

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

// El catálogo real (5 presets): no existe fila "Claro Original" entre ellos —
// ese nombre solo vivió en `DEFAULT_RUNTIME_THEME` (bootstrap), nunca en
// `app_themes`.
const CATALOG = [
  { id: "1", theme_name: "Suave", colors, is_active: false },
  { id: "2", theme_name: "Minimal", colors, is_active: false },
  { id: "3", theme_name: "Bold", colors, is_active: false },
  { id: "4", theme_name: "Tech", colors, is_active: true },
  { id: "5", theme_name: "Boutique", colors, is_active: false },
];

function Probe() {
  const { activeTheme, loading } = useTheme();
  return <div>{loading ? "loading" : (activeTheme?.theme_name ?? "none")}</div>;
}

describe("ThemeProvider catalog anchor (D7) when getActiveTheme resolves null", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    delete (window as any).__osoria_applied_theme;
  });

  it("falls back to the 'Tech' preset instead of the dead 'Claro Original' lookup", async () => {
    vi.mocked(getThemes).mockResolvedValue(CATALOG as any);
    vi.mocked(getActiveTheme).mockResolvedValue(null);

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await waitFor(() => expect(screen.getByText("Tech")).toBeInTheDocument());
  });
});
