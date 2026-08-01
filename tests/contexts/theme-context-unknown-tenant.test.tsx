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
  getThemes: vi.fn(async () => []),
  getActiveTheme: vi.fn(async () => null),
  setActiveTheme: vi.fn(),
  setActiveThemeCustom: vi.fn(),
  revertToThemeVersion: vi.fn(),
  CATALOG_DEFAULT_THEME_NAME: "Tech",
}));

vi.mock("@/lib/react/defer-state-update", () => ({
  deferStateUpdate: (callback: () => void) => callback(),
}));

function ThemeReadinessProbe() {
  const { loading } = useTheme();
  return <div>{loading ? "cargando" : "listo"}</div>;
}

describe("ThemeProvider on a subdomain with no store behind it", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    delete (window as any).__osoria_applied_theme;
  });

  it("publishes no theme, leaving the base tokens of globals.css in charge", async () => {
    render(
      <ThemeProvider isUnknownTenant>
        <ThemeReadinessProbe />
      </ThemeProvider>,
    );

    await waitFor(() => expect(screen.getByText("listo")).toBeInTheDocument());

    expect(getThemes).not.toHaveBeenCalled();
    expect(getActiveTheme).not.toHaveBeenCalled();
    expect(document.documentElement.getAttribute("style")).toBeNull();
  });

  it("still resolves the published theme when the signal is absent", async () => {
    render(
      <ThemeProvider>
        <ThemeReadinessProbe />
      </ThemeProvider>,
    );

    await waitFor(() => expect(getActiveTheme).toHaveBeenCalled());
    expect(getThemes).toHaveBeenCalled();
  });
});
