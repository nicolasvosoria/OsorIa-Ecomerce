import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import {
  HeroLayerControls,
  type HeroLayerControlsCallbacks,
} from "@/lib/section-editor/hero-layer-controls";
import { toHeroLayerModel } from "@/lib/hero/hero-layer-model";
import type { HeroLayerId, HeroSlideLayerFields } from "@/lib/hero/hero-layer-model";
import { currentHeroPayload, currentHeroSlide } from "@/tests/fixtures/hero";

// Real (Radix) selects only mount their SelectContent when open, which
// requires jsdom pointer-capture polyfills this suite doesn't set up.
// Mirrors the mock used by tests/security/admin-products-form-reset.test.tsx
// so SelectContent/SelectItem always render, letting us assert on the
// unified option-rendering helpers without simulating a click-to-open.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => createElement("div", { "data-value": value }, children),
  SelectContent: ({ children }: { children: ReactNode }) =>
    createElement("div", {}, children),
  SelectItem: ({
    children,
    value,
    disabled,
  }: {
    children: ReactNode;
    value: string;
    disabled?: boolean;
  }) => createElement("div", { "data-value": value, "data-disabled": disabled }, children),
  SelectTrigger: ({ children }: { children: ReactNode }) =>
    createElement("button", { type: "button" }, children),
  SelectValue: () => createElement("span"),
}));

vi.mock("@/components/admin/image-upload", () => ({
  ImageUpload: ({ label }: { label?: string }) =>
    createElement("div", { "aria-label": "mock-image-upload" }, label),
}));

function noop() {}

const callbacks: HeroLayerControlsCallbacks = {
  onFieldChange: noop,
  onSlideChange: noop,
  onAddHotspot: noop,
  onHotspotChange: noop,
  onDeleteHotspot: noop,
  onSelectHotspot: noop,
};

function renderLayer(
  activeHeroLayer: HeroLayerId,
  overrides: {
    activeHeroSlide?: HeroSlideLayerFields;
    heroLayerModelOverrides?: Record<string, unknown>;
  } = {},
) {
  const heroLayerModel = toHeroLayerModel({
    ...currentHeroPayload,
    ...overrides.heroLayerModelOverrides,
  });

  return render(
    <HeroLayerControls
      heroLayerModel={heroLayerModel}
      activeHeroLayer={activeHeroLayer}
      activeHeroSlide={overrides.activeHeroSlide ?? currentHeroSlide}
      selectedHeroHotspotId={null}
      callbacks={callbacks}
    />,
  );
}

describe("HeroLayerControls", () => {
  it("returns null when there is no hero layer model", () => {
    const { container } = render(
      <HeroLayerControls
        heroLayerModel={null}
        activeHeroLayer="background"
        activeHeroSlide={currentHeroSlide}
        selectedHeroHotspotId={null}
        callbacks={callbacks}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the background section, including the stage-only fit/focus selects", () => {
    renderLayer("background", {
      heroLayerModelOverrides: { backgroundMode: "stage" },
    });

    expect(screen.getByText("Cobertura del fondo")).toBeInTheDocument();
    expect(screen.getByText("Prominencia de imagen")).toBeInTheDocument();

    // Clone group 1 (HeroLeftCenterRightSelectItems): identical
    // left/center/right options shared by "Enfoque horizontal" here and
    // "Alineación del mensaje" in the content section.
    expect(screen.getByText("Enfoque horizontal")).toBeInTheDocument();
    const leftRightLabels = screen.getAllByText("Izquierda");
    expect(leftRightLabels.length).toBeGreaterThan(0);
    expect(screen.getAllByText("Centro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Derecha").length).toBeGreaterThan(0);

    // Not part of the clone: imagePositionY uses top/center/bottom.
    expect(screen.getByText("Arriba")).toBeInTheDocument();
    expect(screen.getByText("Abajo")).toBeInTheDocument();
  });

  it("renders the product section, its options-driven select, and the secondary product block when eligible", () => {
    renderLayer("product", {
      heroLayerModelOverrides: {
        layoutMode: "full-image",
        fullImageContentAlign: "center",
      },
    });

    expect(
      screen.getByText("Texto alternativo del producto"),
    ).toBeInTheDocument();

    // Clone group 2 (HeroOptionSelectItems): the productPlacement options
    // render via the shared data-driven helper.
    expect(screen.getByText("Ubicación del producto")).toBeInTheDocument();
    expect(screen.getByText("Izquierda")).toBeInTheDocument();
    expect(screen.getByText("Derecha")).toBeInTheDocument();

    expect(
      screen.getByText("Producto secundario opcional"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Composición secundaria"),
    ).toBeInTheDocument();
  });

  it("hides the secondary product controls when layout/content-align don't allow it", () => {
    renderLayer("product", {
      heroLayerModelOverrides: {
        layoutMode: "split",
        fullImageContentAlign: "center",
      },
    });

    expect(
      screen.getByText(
        "El producto secundario está disponible solo en Full Image con mensaje centrado.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Composición secundaria")).not.toBeInTheDocument();
  });

  it("renders the content section, sharing the left/center/right clone with the background select", () => {
    renderLayer("content");

    expect(screen.getByText("Título")).toBeInTheDocument();
    expect(screen.getByText("Alineación del mensaje")).toBeInTheDocument();
    expect(screen.getByText("Tamaño de texto")).toBeInTheDocument();
    expect(screen.getAllByText("Izquierda").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Centro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Derecha").length).toBeGreaterThan(0);
  });

  it("renders the overlay section", () => {
    renderLayer("overlay");

    expect(screen.getByText("Contraste")).toBeInTheDocument();
    expect(screen.getByText("Intensidad")).toBeInTheDocument();
  });

  it("renders the hotspots section, including the anchor options-driven select", () => {
    renderLayer("hotspots");

    expect(screen.getByText("Hotspot activo")).toBeInTheDocument();
    expect(screen.getByText("Driver")).toBeInTheDocument();
    expect(screen.getByText("Preset del hotspot")).toBeInTheDocument();
    // HERO_HOTSPOT_ANCHOR_OPTIONS rendered through the shared options helper.
    expect(screen.getByText("Arriba izquierda")).toBeInTheDocument();
  });

  it("renders the fallback cta section for any other layer id", () => {
    renderLayer("cta");

    expect(screen.getByText("Texto de la acción")).toBeInTheDocument();
    expect(screen.getByText("Color de acción")).toBeInTheDocument();
  });
});
