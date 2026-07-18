/** @vitest-environment jsdom */

// Covers Slice 5's unified transactional publish (D16): handleApply must
// write staged content FIRST (merged over current persisted variables) and
// only publish the theme version LAST, must stop before publishing the theme
// if any content write fails, and must surface an actionable error (without
// clearing the staged edits) when the theme publish itself fails after
// content already saved. The tab/panel children are mocked out — this test
// exercises orchestration only, not the section design/content UI (covered
// elsewhere).

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeCustomEditor } from "@/components/theme/theme-custom-editor";
import { THEME_PREVIEW_SELECT_SOURCE } from "@/lib/theme-font/preview-mode";
import type { ThemeColors, ThemeDefinition } from "@/lib/types/theme";

const ACTIVE_STORE_ID = "store-active";

const {
  changeThemeCustom,
  changePairing,
  updateComponentStyle,
  getComponentStyles,
  getActiveTheme,
  getHomeComposition,
  updateHomeComposition,
  getShopConfig,
  updateShopConfig,
  useAdminActiveStoreId,
} = vi.hoisted(() => ({
  changeThemeCustom: vi.fn(),
  changePairing: vi.fn(),
  updateComponentStyle: vi.fn(),
  getComponentStyles: vi.fn(),
  getActiveTheme: vi.fn(),
  getHomeComposition: vi.fn(),
  updateHomeComposition: vi.fn(),
  getShopConfig: vi.fn(),
  updateShopConfig: vi.fn(),
  useAdminActiveStoreId: vi.fn(),
}));

const DEFAULT_SHOP_CONFIG = {
  defaultSort: null,
  filters: { category: true, color: true, tipo: true, sort: true, price: true, enOferta: true },
};

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

vi.mock("@/contexts/admin-active-store-context", () => ({
  useAdminActiveStoreId,
}));

vi.mock("@/lib/supabase/styles-api", () => ({
  getComponentStyles,
  updateComponentStyle,
}));

vi.mock("@/lib/supabase/themes-api", () => ({
  getActiveTheme,
}));

vi.mock("@/lib/supabase/home-composition-api", () => ({
  getHomeComposition,
  updateHomeComposition,
}));

vi.mock("@/lib/supabase/shop-config-api", () => ({
  getShopConfig,
  updateShopConfig,
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
  SectionDesignFieldList: () => null,
  SectionDesignResetAction: () => null,
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
    heroPersistedStyles = { title: "Título guardado", keepMe: "unchanged" };
    updateComponentStyle.mockResolvedValue(undefined);
    useAdminActiveStoreId.mockReturnValue(ACTIVE_STORE_ID);
    getActiveTheme.mockResolvedValue(activeTheme);
    getComponentStyles.mockImplementation(async () => [
      {
        id: "style-hero",
        component_name: "hero",
        store_id: ACTIVE_STORE_ID,
        variables: heroPersistedStyles,
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    getHomeComposition.mockResolvedValue([]);
    updateHomeComposition.mockResolvedValue([]);
    getShopConfig.mockResolvedValue(DEFAULT_SHOP_CONFIG);
    updateShopConfig.mockResolvedValue(DEFAULT_SHOP_CONFIG);
  });

  it("writes staged content merged over persisted variables BEFORE publishing the theme", async () => {
    changeThemeCustom.mockResolvedValue({ success: true, activeTheme });

    render(<ThemeCustomEditor />);

    selectHeroSection();
    await userEvent.click(await screen.findByRole("tab", { name: "Contenido" }));
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
    await userEvent.click(await screen.findByRole("tab", { name: "Contenido" }));
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
    await userEvent.click(await screen.findByRole("tab", { name: "Contenido" }));
    await userEvent.click(await screen.findByText("Editar contenido"));

    await userEvent.click(screen.getByRole("button", { name: /Aplicar/i }));

    expect(updateComponentStyle).toHaveBeenCalledWith("hero", {
      title: "Título editado",
      keepMe: "unchanged",
    });
    expect(await screen.findByText("No se pudo publicar el diseño")).toBeInTheDocument();
  });

  // #2345 regression: reads once followed the host while writes followed the
  // active store, so editing from store A's subdomain with store B active would
  // overwrite B with A's data. All three editor reads must now take the active
  // store id, matching where the writes go.
  it("reads theme, styles, and home composition from the ACTIVE store, not the host (#2345)", async () => {
    useAdminActiveStoreId.mockReturnValue("store-b");

    render(<ThemeCustomEditor />);

    await waitFor(() => {
      expect(getActiveTheme).toHaveBeenCalledWith("store-b");
      expect(getComponentStyles).toHaveBeenCalledWith("store-b");
      expect(getHomeComposition).toHaveBeenCalledWith("store-b");
    });
  });

  // Slice 11: the Vitrina tab seeds from getShopConfig and folds into the same
  // unified Apply — a changed shop_config persists via updateShopConfig, an
  // unchanged one never calls it, and the /shop header copy rides the existing
  // content channel (updateComponentStyle "shop").
  it("seeds the Vitrina tab from getShopConfig for the active store", async () => {
    render(<ThemeCustomEditor />);

    await waitFor(() => expect(getShopConfig).toHaveBeenCalledWith(ACTIVE_STORE_ID));
  });

  it("persists a changed shop_config via updateShopConfig on Apply", async () => {
    changeThemeCustom.mockResolvedValue({ success: true, activeTheme });

    render(<ThemeCustomEditor />);

    await userEvent.click(await screen.findByRole("tab", { name: "Tienda" }));
    await userEvent.click(await screen.findByLabelText("Categoría"));

    await userEvent.click(screen.getByRole("button", { name: /Aplicar/i }));
    await screen.findByText("Tema publicado para todas las visitas.");

    expect(updateShopConfig).toHaveBeenCalledTimes(1);
    expect(updateShopConfig.mock.calls[0][0].filters.category).toBe(false);
  });

  it("does not call updateShopConfig when the shop_config is unchanged", async () => {
    changeThemeCustom.mockResolvedValue({ success: true, activeTheme });

    render(<ThemeCustomEditor />);

    await userEvent.click(screen.getByRole("button", { name: /Aplicar/i }));
    await screen.findByText("Tema publicado para todas las visitas.");

    expect(updateShopConfig).not.toHaveBeenCalled();
  });

  it("saves the /shop header copy through updateComponentStyle 'shop'", async () => {
    changeThemeCustom.mockResolvedValue({ success: true, activeTheme });

    render(<ThemeCustomEditor />);

    await userEvent.click(await screen.findByRole("tab", { name: "Tienda" }));
    fireEvent.change(await screen.findByLabelText("Título"), {
      target: { value: "Nuestra tienda" },
    });

    await userEvent.click(screen.getByRole("button", { name: /Aplicar/i }));
    await screen.findByText("Tema publicado para todas las visitas.");

    expect(updateComponentStyle).toHaveBeenCalledWith(
      "shop",
      expect.objectContaining({ title: "Nuestra tienda" }),
    );
  });
});
