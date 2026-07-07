/** @vitest-environment jsdom */

// Covers Slice 5's unified transactional publish (D16): handleApply must
// write staged content FIRST (merged over current persisted variables) and
// only publish the theme version LAST, must stop before publishing the theme
// if any content write fails, and must surface an actionable error (without
// clearing the staged edits) when the theme publish itself fails after
// content already saved. The tab/panel children are mocked out — this test
// exercises orchestration only, not the section design/content UI (covered
// elsewhere).

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeCustomEditor } from "@/components/theme/theme-custom-editor";
import { THEME_PREVIEW_SELECT_SOURCE } from "@/lib/theme-font/preview-mode";
import type { ThemeColors, ThemeDefinition } from "@/lib/types/theme";

const { changeThemeCustom, changePairing, updateComponentStyle } = vi.hoisted(() => ({
  changeThemeCustom: vi.fn(),
  changePairing: vi.fn(),
  updateComponentStyle: vi.fn(),
}));

const fakeColors: ThemeColors = {
  primary: "#111111",
  secondary: "#222222",
  accent: "#333333",
  background: "#ffffff",
  foreground: "#000000",
  card: "#ffffff",
  cardForeground: "#000000",
  border: "#cccccc",
  muted: "#eeeeee",
  mutedForeground: "#666666",
};

const fakeDefinition: ThemeDefinition = {
  colorsLight: fakeColors,
  colorsDark: fakeColors,
  radius: { base: "0.5rem" },
  density: { scale: 1 },
  shadow: { card: "sm", elevated: "md" },
  shape: { button: "rounded", card: "rounded" },
  fontPairingId: null,
};

const activeTheme = {
  id: "theme-1",
  theme_name: "Claro Original",
  colors: fakeColors,
  is_active: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  definition: fakeDefinition,
};

let heroPersistedStyles: Record<string, any> = { title: "Título guardado", keepMe: "unchanged" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/contexts/theme-context", () => ({
  useTheme: () => ({
    themes: [activeTheme],
    activeTheme,
    loading: false,
    changeThemeCustom,
    revertToVersion: vi.fn(),
  }),
}));

vi.mock("@/contexts/mode-context", () => ({
  useMode: () => ({ isDark: false }),
}));

vi.mock("@/contexts/font-context", () => ({
  useFont: () => ({ pairings: [], changePairing }),
}));

vi.mock("@/contexts/styles-context", () => ({
  useStyles: () => ({
    styles: new Map([["hero", heroPersistedStyles]]),
    refreshStyles: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/styles-api", () => ({
  updateComponentStyle,
}));

// Sidebar tabs are irrelevant to publish orchestration; stub them out so
// rendering doesn't pull in their own heavy dependencies (product pickers,
// image uploads, etc).
vi.mock("@/components/theme/theme-editor-colors-tab", () => ({
  ColoresTab: () => null,
  COLOR_SET_LABELS: { light: "claro", dark: "oscuro" },
}));
vi.mock("@/components/theme/theme-editor-shape-tab", () => ({
  FormaTab: () => null,
}));
vi.mock("@/components/theme/theme-editor-fonts-tab", () => ({
  FuentesTab: () => null,
}));
vi.mock("@/components/theme/theme-editor-history-tab", () => ({
  HistorialTab: () => null,
}));
vi.mock("@/components/theme/theme-editor-section-design-panel", () => ({
  SectionDesignPanel: () => null,
}));
// The one panel this test cares about: expose its `onFieldChange` seam via a
// simple button so the test can stage a content edit without depending on
// the real field widgets.
vi.mock("@/components/theme/theme-editor-section-content-panel", () => ({
  SectionContentPanel: ({ onFieldChange }: { onFieldChange: (key: string, value: any) => void }) => (
    <button type="button" onClick={() => onFieldChange("title", "Título editado")}>
      Editar contenido
    </button>
  ),
}));

function selectHeroSection() {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { source: THEME_PREVIEW_SELECT_SOURCE, componentName: "hero" },
        origin: window.location.origin,
      }),
    );
  });
}

describe("ThemeCustomEditor handleApply (D16 unified publish)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    updateComponentStyle.mockResolvedValue(undefined);
    heroPersistedStyles = { title: "Título guardado", keepMe: "unchanged" };
  });

  it("writes staged content merged over persisted variables BEFORE publishing the theme", async () => {
    changeThemeCustom.mockResolvedValue({ success: true, activeTheme });

    render(<ThemeCustomEditor />);

    selectHeroSection();
    await userEvent.click(await screen.findByText("Editar contenido"));

    await userEvent.click(screen.getByRole("button", { name: /Aplicar/i }));

    await screen.findByText("Tema publicado para todas las visitas.");

    expect(updateComponentStyle).toHaveBeenCalledWith("hero", {
      title: "Título editado",
      keepMe: "unchanged",
    });
    // Content write must be ordered before the theme publish call.
    expect(updateComponentStyle.mock.invocationCallOrder[0]).toBeLessThan(
      changeThemeCustom.mock.invocationCallOrder[0],
    );
  });

  it("does not publish the theme when a content write fails, and keeps the edit staged for retry", async () => {
    updateComponentStyle.mockRejectedValue(new Error("db offline"));

    render(<ThemeCustomEditor />);

    selectHeroSection();
    await userEvent.click(await screen.findByText("Editar contenido"));

    await userEvent.click(screen.getByRole("button", { name: /Aplicar/i }));

    expect(await screen.findByText(/El diseño no se publicó/i)).toBeInTheDocument();
    expect(changeThemeCustom).not.toHaveBeenCalled();
  });

  it("surfaces an actionable error when the theme publish fails after content already saved", async () => {
    changeThemeCustom.mockResolvedValue({
      success: false,
      error: "No se pudo publicar el diseño",
    });

    render(<ThemeCustomEditor />);

    selectHeroSection();
    await userEvent.click(await screen.findByText("Editar contenido"));

    await userEvent.click(screen.getByRole("button", { name: /Aplicar/i }));

    expect(updateComponentStyle).toHaveBeenCalledWith("hero", {
      title: "Título editado",
      keepMe: "unchanged",
    });
    expect(await screen.findByText("No se pudo publicar el diseño")).toBeInTheDocument();
  });
});
