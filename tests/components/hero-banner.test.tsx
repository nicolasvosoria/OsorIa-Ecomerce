import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { HeroBanner } from "@/components/sections/hero-banner";
import {
  HERO_SECONDARY_PRODUCT_PRESET_OPTIONS,
  createNextHeroHotspotId,
  toFlatHeroVariables,
  toHeroLayerModel,
} from "@/lib/hero/hero-layer-model";

const mockUseComponentStyle = vi.fn();
const mockUseAdmin = vi.fn();
const mockUseTheme = vi.fn();

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: any) => {
    const imageProps = { ...props };
    delete imageProps.fill;
    delete imageProps.priority;

    return createElement("img", { alt, ...imageProps });
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/contexts/styles-context", () => ({
  useComponentStyle: (...args: any[]) => mockUseComponentStyle(...args),
}));

vi.mock("@/contexts/admin-context", () => ({
  useAdmin: () => mockUseAdmin(),
}));

vi.mock("@/contexts/theme-context", () => ({
  useTheme: () => mockUseTheme(),
}));

vi.mock("@/components/ui/carousel", () => ({
  Carousel: ({ children }: any) => <div>{children}</div>,
  CarouselContent: ({ children }: any) => <div>{children}</div>,
  CarouselItem: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
}));

describe("HeroBanner", () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({
      activeTheme: {
        theme_name: "Claro",
        colors: {
          background: "#ffffff",
          accent: "#005aa1",
          secondary: "#c4faff",
        },
      },
    });

    mockUseAdmin.mockReturnValue({
      componentEdits: new Map(),
      selectedHeroLayer: null,
      selectedHeroSlideIndex: 0,
      selectedHeroHotspotId: null,
    });
  });

  it("normalizes semantic slide fields and drops invalid hotspot records", () => {
    const model = toHeroLayerModel({
      products: [
        {
          title: "VALID",
          image: "/legacy.jpg",
          textSize: "compact",
          productPlacement: "left",
          hotspots: [
            {
              id: "driver",
              label: "Driver",
              description: "Audio mejorado",
              href: "/products/driver",
              anchor: "top-left",
            },
            { id: "missing-label", anchor: "bottom-right" },
            { id: "bad-anchor", label: "Bad", anchor: "custom" },
          ],
        },
        {
          title: "FALLBACKS",
          image: "/fallback.jpg",
          textSize: "huge",
          productPlacement: "center",
          hotspots: "not-an-array",
        },
      ],
    });

    expect(model.products[0]).toMatchObject({
      textSize: "compact",
      productPlacement: "left",
      hotspots: [
        {
          id: "driver",
          label: "Driver",
          description: "Audio mejorado",
          href: "/products/driver",
          anchor: "top-left",
        },
      ],
    });
    expect(model.products[1]).toMatchObject({
      textSize: "feature",
      productPlacement: "right",
      hotspots: [],
    });
  });

  it("creates deterministic sequential hotspot ids without clock state", () => {
    expect(createNextHeroHotspotId([])).toBe("hotspot-1");
    expect(
      createNextHeroHotspotId([
        { id: "hotspot-1", label: "Driver", anchor: "top-left" },
        { id: "hotspot-2", label: "Battery", anchor: "bottom-right" },
      ]),
    ).toBe("hotspot-3");
  });

  it("adapts legacy hero images into semantic background layers without requiring product media", () => {
    const model = toHeroLayerModel({
      layoutMode: "full-image",
      imageFit: "contain",
      fullImageContentAlign: "right",
      products: [
        {
          label: "Audio",
          title: "PREMIUM",
          image: "/legacy-background.jpg",
          buttonText: "Comprar ahora",
        },
      ],
    });

    expect(model.layoutMode).toBe("full-image");
    expect(model.imageFit).toBe("contain");
    expect(model.contentAlign).toBe("right");
    expect(model.products[0]).toMatchObject({
      image: "/legacy-background.jpg",
      backgroundImage: "/legacy-background.jpg",
      title: "PREMIUM",
    });
    expect(model.products[0].productImage).toBeUndefined();
  });

  it("keeps layered product media separate from the flat-compatible background image", () => {
    const model = toHeroLayerModel({
      layoutMode: "full-image",
      overlayOpacity: "1.7",
      products: [
        {
          label: "Audio",
          title: "PREMIUM",
          image: "/legacy-background.jpg",
          backgroundImage: "/layered-background.jpg",
          productImage: "/product.png",
          productAlt: "Auriculares flotantes",
        },
      ],
    });

    expect(model.overlayOpacity).toBe(0.9);
    expect(model.products[0]).toMatchObject({
      image: "/legacy-background.jpg",
      backgroundImage: "/layered-background.jpg",
      productImage: "/product.png",
      productAlt: "Auriculares flotantes",
    });
  });

  it("normalizes optional secondary product fields additively for legacy slides", () => {
    const model = toHeroLayerModel({
      products: [
        {
          title: "WITH SECONDARY",
          image: "/legacy-background.jpg",
          productImage: "/primary.png",
          secondaryProductImage: "/secondary.png",
          secondaryProductAlt: "Producto secundario",
          secondaryProductPreset: "primary-left-secondary-right",
        },
        {
          title: "LEGACY ONLY",
          image: "/legacy-only.jpg",
        },
      ],
    });

    expect(model.products[0]).toMatchObject({
      title: "WITH SECONDARY",
      image: "/legacy-background.jpg",
      backgroundImage: "/legacy-background.jpg",
      productImage: "/primary.png",
      secondaryProductImage: "/secondary.png",
      secondaryProductAlt: "Producto secundario",
      secondaryProductPreset: "primary-left-secondary-right",
    });
    expect(model.products[1]).toMatchObject({
      title: "LEGACY ONLY",
      image: "/legacy-only.jpg",
      backgroundImage: "/legacy-only.jpg",
    });
    expect(model.products[1].secondaryProductImage).toBeUndefined();
    expect(model.products[1].secondaryProductAlt).toBeUndefined();
    expect(model.products[1].secondaryProductPreset).toBeUndefined();
  });

  it("sanitizes unsupported secondary data without dropping valid hotspot-safe slide fields", () => {
    const model = toHeroLayerModel({
      products: [
        {
          title: "UNSUPPORTED SECONDARY",
          image: "/legacy-background.jpg",
          productImage: "/primary.png",
          secondaryProductImage: "   ",
          secondaryProductAlt: "   ",
          secondaryProductPreset: "freeform-canvas",
          hotspots: [
            { id: "valid", label: "Visible", anchor: "center-left" },
            { id: "bad-anchor", label: "Invalid", anchor: "freeform" },
          ],
        },
      ],
    });

    expect(model.products[0]).toMatchObject({
      title: "UNSUPPORTED SECONDARY",
      image: "/legacy-background.jpg",
      backgroundImage: "/legacy-background.jpg",
      productImage: "/primary.png",
      secondaryProductPreset: "primary-right-secondary-left",
      hotspots: [{ id: "valid", label: "Visible", anchor: "center-left" }],
    });
    expect(model.products[0].secondaryProductImage).toBeUndefined();
    expect(model.products[0].secondaryProductAlt).toBeUndefined();
  });

  it("exports bounded secondary preset options for editor and renderer reuse", () => {
    expect(HERO_SECONDARY_PRODUCT_PRESET_OPTIONS).toEqual([
      {
        value: "primary-right-secondary-left",
        label: "Principal derecha, secundario izquierda",
      },
      {
        value: "primary-left-secondary-right",
        label: "Principal izquierda, secundario derecha",
      },
    ]);
  });

  it("normalizes hotspot precision, target defaults and product presence without viewport data", () => {
    const model = toHeroLayerModel({
      products: [
        {
          title: "PRECISION",
          image: "/precision.jpg",
          productPresence: "prominent",
          hotspots: [
            {
              id: "legacy-anchor",
              label: "Anchor seeded",
              anchor: "top-left",
            },
            {
              id: "clamped-secondary",
              label: "Secondary clamp",
              anchor: "bottom-right",
              x: "125",
              y: -12,
              target: "secondary",
            },
            {
              id: "invalid-target",
              label: "Invalid target",
              anchor: "center-left",
              x: "not numeric",
              y: Number.POSITIVE_INFINITY,
              target: "canvas" as never,
            },
          ],
        },
        {
          title: "LEGACY PRESENCE",
          image: "/legacy.jpg",
          hotspots: [{ id: "legacy-only", label: "Legacy", anchor: "bottom-left" }],
        },
      ],
    });

    expect(model.products[0]).toMatchObject({
      productPresence: "prominent",
      hotspots: [
        {
          id: "legacy-anchor",
          anchor: "top-left",
          x: 25,
          y: 20,
          target: "primary",
        },
        {
          id: "clamped-secondary",
          anchor: "bottom-right",
          x: 100,
          y: 0,
          target: "secondary",
        },
        {
          id: "invalid-target",
          anchor: "center-left",
          x: 25,
          y: 50,
          target: "primary",
        },
      ],
    });
    expect(model.products[1]).toMatchObject({
      productPresence: "balanced",
      hotspots: [{ id: "legacy-only", x: 25, y: 80, target: "primary" }],
    });

    const flatPayload = toFlatHeroVariables(model);
    expect(flatPayload.products[0]).toMatchObject({
      productPresence: "prominent",
      hotspots: expect.arrayContaining([
        expect.objectContaining({ id: "legacy-anchor", x: 25, y: 20, target: "primary" }),
        expect.objectContaining({ id: "clamped-secondary", x: 100, y: 0, target: "secondary" }),
      ]),
    });
  });

  it("normalizes bounded product/content offsets and background mode while preserving legacy presence seeds", () => {
    const model = toHeroLayerModel({
      layoutMode: "full-image",
      backgroundMode: "fill",
      products: [
        {
          title: "EXPLICIT TRANSFORM",
          image: "/explicit.jpg",
          productPresence: "subtle",
          productScale: "165",
          productOffsetX: "-45",
          productOffsetY: 35,
          contentOffsetX: "24",
          contentOffsetY: -22,
        },
        {
          title: "LEGACY PROMINENT",
          image: "/legacy.jpg",
          productPresence: "prominent",
          contentOffsetX: Number.NaN,
          contentOffsetY: Number.POSITIVE_INFINITY,
        },
        {
          title: "BAD VALUES",
          image: "/bad.jpg",
          productScale: Number.NaN,
          productOffsetX: Number.POSITIVE_INFINITY,
          productOffsetY: "not numeric",
        },
      ],
    });

    expect(model.backgroundMode).toBe("fill");
    expect(model.products[0]).toMatchObject({
      productPresence: "subtle",
      productScale: 140,
      productOffsetX: -20,
      productOffsetY: 20,
      contentOffsetX: 16,
      contentOffsetY: -16,
    });
    expect(model.products[1]).toMatchObject({
      productPresence: "prominent",
      productScale: 110,
      productOffsetX: 0,
      productOffsetY: 0,
      contentOffsetX: 0,
      contentOffsetY: 0,
    });
    expect(model.products[2]).toMatchObject({
      productPresence: "balanced",
      productScale: 100,
      productOffsetX: 0,
      productOffsetY: 0,
      contentOffsetX: 0,
      contentOffsetY: 0,
    });

    expect(toFlatHeroVariables(model)).toMatchObject({
      backgroundMode: "fill",
      products: expect.arrayContaining([
        expect.objectContaining({
          productScale: 140,
          productOffsetX: -20,
          productOffsetY: 20,
          contentOffsetX: 16,
          contentOffsetY: -16,
        }),
      ]),
    });
  });

  it("keeps the existing split layout as the default mode", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "split",
        products: [
          {
            label: "Audio",
            title: "PREMIUM",
            subtitle: "HEADPHONES",
            description: "Auriculares premium",
            buttonText: "Comprar ahora",
            image: "/premium-headphones.png",
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);
    const hero = container.querySelector('[data-component="hero"]');

    expect(hero).toHaveAttribute("data-hero-layout", "split");
    expect(screen.getByText("PREMIUM")).toBeInTheDocument();
    expect(screen.getByAltText("PREMIUM")).toHaveClass("object-contain");
  });

  it("renders the new full-image layout with a full-bleed image layer", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        overlayColor: "#101828",
        overlayOpacity: "0.55",
        products: [
          {
            label: "Audio",
            title: "PREMIUM",
            subtitle: "HEADPHONES",
            description: "Auriculares premium",
            buttonText: "Comprar ahora",
            image: "/premium-headphones.png",
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);
    const hero = container.querySelector('[data-component="hero"]');

    expect(hero).toHaveAttribute("data-hero-layout", "full-image");
    expect(screen.getByTestId("hero-full-background-image")).toHaveAttribute(
      "src",
      "/premium-headphones.png",
    );
    expect(screen.getByText("HEADPHONES")).toBeInTheDocument();
  });

  it("marks full-image heroes as viewport-safe shells with 24px side gutters", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        products: [
          {
            label: "Audio",
            title: "PREMIUM",
            subtitle: "HEADPHONES",
            description: "Auriculares premium",
            buttonText: "Comprar ahora",
            image: "/premium-headphones.png",
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);
    const hero = container.querySelector('[data-component="hero"]');
    const slideShell = screen.getByTestId("hero-full-content-container");

    expect(hero).toHaveAttribute("data-hero-viewport-shell", "full-image");
    expect(hero).toHaveAttribute("data-hero-side-gutters", "24px");
    expect(slideShell).toHaveAttribute("data-hero-mobile-sizing", "content-safe");
  });

  it("renders full-image hero layers in semantic order with CTA access preserved", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        overlayColor: "#101828",
        overlayOpacity: "0.55",
        products: [
          {
            label: "Audio",
            title: "PREMIUM",
            subtitle: "HEADPHONES",
            description: "Auriculares premium",
            buttonText: "Comprar ahora",
            backgroundImage: "/hero-bg.jpg",
            image: "/legacy-bg.jpg",
            productImage: "/floating-product.png",
            productAlt: "Auriculares premium flotando",
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);
    const layers = Array.from(container.querySelectorAll("[data-hero-layer]")).map(
      (node) => node.getAttribute("data-hero-layer"),
    );

    expect(layers).toEqual([
      "background",
      "overlay",
      "product",
      "content",
      "cta",
    ]);
    expect(screen.getByTestId("hero-full-background-image")).toHaveAttribute(
      "src",
      "/hero-bg.jpg",
    );
    expect(screen.getByAltText("Auriculares premium flotando")).toHaveAttribute(
      "src",
      "/floating-product.png",
    );
    expect(
      screen.getByRole("link", { name: /comprar ahora/i }),
    ).toHaveAttribute("href", "/products/premium");
  });

  it("omits optional product media placeholders while preserving text and CTA", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        products: [
          {
            title: "MINI PROJECTOR",
            subtitle: "PORTÁTIL",
            description: "Llevá el cine con vos",
            buttonText: "Descubrir",
            backgroundImage: "/projector-bg.jpg",
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);

    expect(
      container.querySelector('[data-hero-layer="product"]'),
    ).not.toBeInTheDocument();
    expect(screen.getByText("MINI PROJECTOR")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /descubrir/i })).toHaveAttribute(
      "href",
      "/products/mini-projector",
    );
  });

  it("uses transient selected hero layer only for preview emphasis", () => {
    mockUseAdmin.mockReturnValue({
      componentEdits: new Map(),
      selectedHeroLayer: "product",
      selectedHeroSlideIndex: 0,
      selectedHeroHotspotId: null,
    });
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        products: [
          {
            title: "PREMIUM",
            buttonText: "Comprar ahora",
            backgroundImage: "/hero-bg.jpg",
            productImage: "/floating-product.png",
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);
    const selectedLayer = container.querySelector(
      '[data-hero-layer="product"]',
    );

    expect(selectedLayer).toHaveAttribute("data-selected-hero-layer", "true");
    expect(container.querySelector('[data-component="hero"]')).not.toHaveAttribute(
      "data-selected-hero-layer",
    );
  });

  it("renders per-slide text styling, product placement and product-relative hotspots", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "split",
        textColor: "#ffffff",
        products: [
          {
            label: "Audio",
            title: "PREMIUM",
            subtitle: "HEADPHONES",
            description: "Auriculares premium",
            buttonText: "Comprar ahora",
            image: "/premium-headphones.png",
            textColor: "#123456",
            textSize: "compact",
            productPlacement: "left",
            hotspots: [
              {
                id: "battery",
                label: "Batería extendida",
                description: "48 horas de música",
                href: "/products/premium#battery",
                anchor: "bottom-right",
              },
            ],
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);

    expect(screen.getByTestId("hero-slide-content-0")).toHaveStyle({
      color: "#123456",
    });
    expect(screen.getByTestId("hero-slide-content-0")).toHaveAttribute(
      "data-hero-text-size",
      "compact",
    );
    expect(screen.getByTestId("hero-product-media-0")).toHaveAttribute(
      "data-product-placement",
      "left",
    );
    expect(
      container.querySelector('[data-hero-hotspot-id="battery"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /batería extendida/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("anchors hotspots inside the actual product image frame", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        products: [
          {
            title: "PREMIUM",
            backgroundImage: "/hero-bg.jpg",
            productImage: "/primary.png",
            productAlt: "Producto principal",
            hotspots: [
              { id: "corner", label: "Esquina", anchor: "top-left" },
            ],
          },
        ],
      },
    });

    render(<HeroBanner />);

    const productMedia = screen.getByTestId("hero-product-media-0");
    const productFrame = productMedia.querySelector("[data-hero-product-frame]");

    expect(productFrame).toContainElement(screen.getByAltText("Producto principal"));
    expect(productFrame).toContainElement(
      productMedia.querySelector('[data-hero-hotspot-id="corner"]'),
    );
  });

  it("renders precision hotspots as percentages inside their targeted product frames", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        fullImageContentAlign: "center",
        products: [
          {
            title: "PRECISION",
            backgroundImage: "/hero-bg.jpg",
            productImage: "/primary.png",
            productAlt: "Producto principal",
            secondaryProductImage: "/secondary.png",
            secondaryProductAlt: "Producto secundario",
            productPresence: "prominent",
            productScale: 124,
            productOffsetX: 12,
            productOffsetY: -8,
            hotspots: [
              {
                id: "primary-chip",
                label: "Chip principal",
                anchor: "center-right",
                x: 62,
                y: 44,
                target: "primary",
              },
              {
                id: "secondary-chip",
                label: "Chip secundario",
                anchor: "bottom-left",
                x: "18",
                y: "76",
                target: "secondary",
              },
            ],
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);
    const primaryFrame = container.querySelector('[data-hero-product-frame="primary"]');
    const secondaryFrame = container.querySelector('[data-hero-product-frame="secondary"]');
    const primaryHotspot = primaryFrame?.querySelector('[data-hero-hotspot-id="primary-chip"]');
    const secondaryHotspot = secondaryFrame?.querySelector('[data-hero-hotspot-id="secondary-chip"]');

    expect(primaryFrame).toContainElement(screen.getByAltText("Producto principal"));
    expect(secondaryFrame).toContainElement(screen.getByAltText("Producto secundario"));
    expect(primaryFrame).toContainElement(primaryHotspot as HTMLElement);
    expect(primaryFrame).not.toContainElement(secondaryHotspot as HTMLElement);
    expect(secondaryFrame).toContainElement(secondaryHotspot as HTMLElement);
    expect(primaryHotspot).toHaveStyle({
      left: "62%",
      top: "44%",
      transform: "translate(-50%, -50%)",
    });
    expect(secondaryHotspot).toHaveStyle({
      left: "18%",
      top: "76%",
      transform: "translate(-50%, -50%)",
    });
    expect(screen.getByRole("button", { name: /chip principal/i })).toHaveAttribute(
      "aria-controls",
      "hero-hotspot-details-primary-chip",
    );
    expect(screen.getByTestId("hero-product-media-0")).toHaveAttribute(
      "data-product-presence",
      "prominent",
    );
    expect(primaryFrame).toHaveStyle({
      "--hero-product-scale": "1.24",
      "--hero-product-offset-x": "12%",
      "--hero-product-offset-y": "-8%",
    });
  });

  it("renders full-image fill backgrounds outside a capped foreground stage", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        backgroundMode: "fill",
        products: [
          {
            title: "STAGED HERO",
            subtitle: "FOREGROUND",
            description: "Capped foreground composition",
            buttonText: "Comprar ahora",
            backgroundImage: "/wide-bg.jpg",
            productImage: "/stage-product.png",
            productAlt: "Producto en stage",
            productScale: 118,
            productOffsetX: -10,
            productOffsetY: 6,
            contentOffsetX: 9,
            contentOffsetY: -7,
            hotspots: [
              {
                id: "stage-hotspot",
                label: "Hotspot en stage",
                description: "Detalle dentro del stage",
                anchor: "center-right",
                x: 60,
                y: 40,
              },
            ],
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);
    const hero = container.querySelector('[data-component="hero"]');
    const stage = container.querySelector("[data-hero-stage]");
    const background = screen.getByTestId("hero-full-background-image");
    const productLayer = screen.getByTestId("hero-product-media-0");
    const productFrame = container.querySelector('[data-hero-product-frame="primary"]');

    expect(hero).toHaveAttribute("data-hero-background-mode", "fill");
    expect(stage).toHaveAttribute("data-hero-stage", "foreground");
    expect(stage).toContainElement(productLayer);
    expect(stage).toContainElement(screen.getByTestId("hero-full-content-container"));
    expect(stage).not.toContainElement(background);
    expect(background).toHaveAttribute("data-hero-background-fit", "fill");
    expect(background).toHaveStyle({ objectFit: "fill" });
    expect(productFrame).toHaveStyle({
      "--hero-product-scale": "1.18",
      "--hero-product-offset-x": "-10%",
      "--hero-product-offset-y": "6%",
    });
    expect(screen.getByTestId("hero-full-content-block")).toHaveStyle({
      "--hero-content-offset-x": "9%",
      "--hero-content-offset-y": "-7%",
      transform:
        "translate(var(--hero-content-offset-x), var(--hero-content-offset-y))",
    });
  });

  it("constrains stage background mode while keeping foreground coordinates unchanged", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        backgroundMode: "stage",
        imageFit: "contain",
        products: [
          {
            title: "STAGE MODE",
            subtitle: "CONTAINED",
            description: "Stage-contained background",
            buttonText: "Ver",
            backgroundImage: "/contained-bg.jpg",
            productImage: "/stage-product.png",
            productScale: 105,
            productOffsetX: 4,
            productOffsetY: -3,
            contentOffsetX: -5,
            contentOffsetY: 6,
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);
    const background = screen.getByTestId("hero-full-background-image");
    const backgroundStage = container.querySelector(
      '[data-hero-background-stage="contained"]',
    );
    const foregroundStage = container.querySelector('[data-hero-stage="foreground"]');

    expect(container.querySelector('[data-component="hero"]')).toHaveAttribute(
      "data-hero-background-mode",
      "stage",
    );
    expect(backgroundStage).toContainElement(background);
    expect(foregroundStage).not.toContainElement(background);
    expect(background).toHaveAttribute("data-hero-background-fit", "stage");
    expect(background).toHaveStyle({ objectFit: "contain" });
    expect(container.querySelector('[data-hero-product-frame="primary"]')).toHaveStyle({
      "--hero-product-offset-x": "4%",
      "--hero-product-offset-y": "-3%",
    });
    expect(screen.getByTestId("hero-full-content-block")).toHaveStyle({
      "--hero-content-offset-x": "-5%",
      "--hero-content-offset-y": "6%",
    });
  });

  it("uses refined interactive hotspot triggers and keeps details reachable from trigger or bubble hover", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "split",
        products: [
          {
            title: "PREMIUM",
            buttonText: "Comprar",
            image: "/premium-headphones.png",
            productImage: "/premium-headphones.png",
            hotspots: [
              {
                id: "refined",
                label: "Detalle refinado",
                description: "Burbuja legible",
                anchor: "top-right",
              },
            ],
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);
    const hotspot = container.querySelector('[data-hero-hotspot-id="refined"]')!;
    const button = screen.getByRole("button", { name: /detalle refinado/i });

    expect(button).toHaveAttribute("data-hero-hotspot-trigger", "refined");
    expect(button).toHaveAttribute("data-hero-hotspot-size", "compact-plus");
    expect(within(button).getByTestId("hero-hotspot-plus-horizontal-refined")).toHaveAttribute(
      "data-hero-hotspot-plus-bar",
      "horizontal",
    );
    expect(within(button).getByTestId("hero-hotspot-plus-vertical-refined")).toHaveAttribute(
      "data-hero-hotspot-plus-bar",
      "vertical",
    );
    expect(within(button).getByTestId("hero-hotspot-pulse-refined")).toHaveAttribute(
      "data-hero-hotspot-pulse",
      "subtle",
    );
    expect(hotspot).toHaveAttribute("data-hero-hotspot-stack", "interactive");

    fireEvent.mouseEnter(hotspot);
    const details = screen.getByRole("status");
    expect(details).toHaveAttribute("data-hero-hotspot-bubble", "readable");
    expect(details).toHaveAttribute("data-hero-hotspot-bubble-position", "floating");
    expect(details).toHaveTextContent("Burbuja legible");

    fireEvent.mouseLeave(button, { relatedTarget: details });
    expect(screen.getByText("Burbuja legible")).toBeInTheDocument();
    fireEvent.mouseLeave(hotspot);
    expect(screen.queryByText("Burbuja legible")).not.toBeInTheDocument();
  });

  it("keeps secondary-targeted hotspots in data but hides them without a secondary product frame", () => {
    const model = toHeroLayerModel({
      products: [
        {
          title: "PRIMARY ONLY",
          backgroundImage: "/hero-bg.jpg",
          productImage: "/primary.png",
          hotspots: [
            {
              id: "hidden-secondary",
              label: "Secondary only",
              anchor: "top-right",
              x: 90,
              y: 12,
              target: "secondary",
            },
          ],
        },
      ],
    });

    expect(model.products[0].hotspots).toEqual([
      expect.objectContaining({
        id: "hidden-secondary",
        x: 90,
        y: 12,
        target: "secondary",
      }),
    ]);

    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        products: model.products,
      },
    });

    const { container } = render(<HeroBanner />);

    expect(screen.getByTestId("hero-product-media-0")).toContainElement(
      container.querySelector('[data-hero-product-frame="primary"]'),
    );
    expect(
      container.querySelector('[data-hero-hotspot-id="hidden-secondary"]'),
    ).not.toBeInTheDocument();
  });

  it("renders one semantic secondary product only for centered full-image compositions", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        fullImageContentAlign: "center",
        products: [
          {
            title: "PREMIUM",
            backgroundImage: "/hero-bg.jpg",
            productImage: "/primary.png",
            productAlt: "Producto principal",
            secondaryProductImage: "/secondary.png",
            secondaryProductAlt: "Producto secundario",
            secondaryProductPreset: "primary-left-secondary-right",
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);

    expect(screen.getByAltText("Producto principal")).toBeInTheDocument();
    expect(screen.getByAltText("Producto secundario")).toBeInTheDocument();
    expect(
      container.querySelectorAll("[data-hero-secondary-product]").length,
    ).toBe(1);
    expect(container.querySelector("[data-hero-secondary-product]")).toHaveAttribute(
      "data-secondary-preset",
      "primary-left-secondary-right",
    );
  });

  it("ignores secondary product data outside supported centered full-image layouts", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        fullImageContentAlign: "left",
        products: [
          {
            title: "LEFT FULL IMAGE",
            backgroundImage: "/hero-bg.jpg",
            productImage: "/primary.png",
            secondaryProductImage: "/secondary.png",
            secondaryProductAlt: "Secondary ignored",
          },
        ],
      },
    });

    const { rerender } = render(<HeroBanner />);
    expect(screen.queryByAltText("Secondary ignored")).not.toBeInTheDocument();

    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "split",
        fullImageContentAlign: "center",
        products: [
          {
            title: "SPLIT",
            image: "/primary.png",
            secondaryProductImage: "/secondary.png",
            secondaryProductAlt: "Secondary split ignored",
          },
        ],
      },
    });

    rerender(<HeroBanner />);

    expect(screen.queryByAltText("Secondary split ignored")).not.toBeInTheDocument();
  });

  it("renders hotspots only when product media exists and marks selected hotspot preview", () => {
    mockUseAdmin.mockReturnValue({
      componentEdits: new Map(),
      selectedHeroLayer: "hotspots",
      selectedHeroSlideIndex: 0,
      selectedHeroHotspotId: "selected-hotspot",
    });
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        products: [
          {
            title: "WITH MEDIA",
            backgroundImage: "/bg.jpg",
            productImage: "/product.png",
            hotspots: [
              {
                id: "selected-hotspot",
                label: "Material premium",
                anchor: "center-right",
              },
            ],
          },
          {
            title: "NO MEDIA",
            backgroundImage: "/bg-2.jpg",
            hotspots: [
              { id: "hidden", label: "Hidden", anchor: "top-left" },
            ],
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);

    const selectedHotspot = container.querySelector(
      '[data-hero-hotspot-id="selected-hotspot"]',
    );
    expect(selectedHotspot).toHaveAttribute("data-selected-hero-hotspot", "true");
    expect(
      container.querySelector('[data-hero-hotspot-id="hidden"]'),
    ).not.toBeInTheDocument();
  });

  it("reveals hotspot details on hover, focus and keyboard/click activation with outside dismissal", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "split",
        products: [
          {
            title: "PREMIUM",
            buttonText: "Comprar",
            image: "/premium-headphones.png",
            hotspots: [
              {
                id: "audio",
                label: "Sonido espacial",
                description: "Escena de audio 360",
                anchor: "top-right",
              },
              {
                id: "battery",
                label: "Batería",
                description: "48 horas",
                anchor: "bottom-left",
              },
            ],
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);
    const hero = container.querySelector('[data-component="hero"]')!;
    const audioButton = screen.getByRole("button", { name: /sonido espacial/i });
    const batteryButton = screen.getByRole("button", { name: /batería/i });

    expect(screen.queryByText("Escena de audio 360")).not.toBeInTheDocument();

    fireEvent.mouseEnter(audioButton);
    expect(screen.getByText("Escena de audio 360")).toBeInTheDocument();
    fireEvent.mouseLeave(audioButton);
    expect(screen.queryByText("Escena de audio 360")).not.toBeInTheDocument();

    act(() => {
      audioButton.focus();
    });
    expect(screen.getByText("Escena de audio 360")).toBeInTheDocument();
    fireEvent.blur(audioButton);
    expect(screen.queryByText("Escena de audio 360")).not.toBeInTheDocument();

    fireEvent.click(audioButton);
    expect(audioButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Escena de audio 360")).toBeInTheDocument();

    fireEvent.click(batteryButton);
    expect(audioButton).toHaveAttribute("aria-expanded", "false");
    expect(batteryButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("48 horas")).toBeInTheDocument();

    fireEvent.click(hero);
    expect(batteryButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("48 horas")).not.toBeInTheDocument();
  });

  it("keeps hotspot details keyboard-operable with understandable aria relationships", async () => {
    const user = userEvent.setup();
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "split",
        products: [
          {
            title: "PREMIUM",
            buttonText: "Comprar",
            image: "/premium-headphones.png",
            productImage: "/premium-headphones.png",
            hotspots: [
              {
                id: "audio",
                label: "Sonido espacial",
                description: "Escena de audio 360",
                href: "/products/premium#audio",
                anchor: "top-right",
              },
            ],
          },
        ],
      },
    });

    render(<HeroBanner />);

    const audioButton = screen.getByRole("button", { name: /sonido espacial/i });
    act(() => {
      audioButton.focus();
    });
    expect(audioButton).toHaveFocus();
    expect(audioButton).toHaveAttribute(
      "aria-controls",
      "hero-hotspot-details-audio",
    );

    await user.keyboard("[Enter]");

    const details = screen.getByRole("status");
    expect(audioButton).toHaveAttribute("aria-expanded", "true");
    expect(details).toHaveAttribute("id", "hero-hotspot-details-audio");
    expect(details).toHaveTextContent("Escena de audio 360");
    expect(screen.getByRole("link", { name: /ver detalle/i })).toHaveAttribute(
      "href",
      "/products/premium#audio",
    );
  });

  it("keeps product-relative hotspots attached to product media on mobile and uses tap toggling", () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 375,
    });
    window.dispatchEvent(new Event("resize"));

    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "split",
        products: [
          {
            title: "PREMIUM",
            buttonText: "Comprar",
            image: "/premium-headphones.png",
            productImage: "/premium-headphones.png",
            productPlacement: "left",
            hotspots: [
              {
                id: "mobile-audio",
                label: "Audio móvil",
                description: "Detalle táctil",
                anchor: "center-right",
              },
            ],
          },
        ],
      },
    });

    try {
      const { container } = render(<HeroBanner />);
      const productMedia = screen.getByTestId("hero-product-media-0");
      const mobileHotspot = within(productMedia).getByRole("button", {
        name: /audio móvil/i,
      });

      expect(productMedia).toHaveAttribute("data-product-placement", "left");
      expect(
        productMedia.querySelector('[data-hero-hotspot-id="mobile-audio"]'),
      ).toBeInTheDocument();
      expect(screen.queryByText("Detalle táctil")).not.toBeInTheDocument();

      fireEvent.click(mobileHotspot);
      expect(within(productMedia).getByRole("status")).toHaveTextContent(
        "Detalle táctil",
      );
      expect(mobileHotspot).toHaveAttribute("aria-expanded", "true");

      fireEvent.click(container.querySelector('[data-component="hero"]')!);
      expect(mobileHotspot).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("Detalle táctil")).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        writable: true,
        value: originalInnerWidth,
      });
      window.dispatchEvent(new Event("resize"));
    }
  });

  it("keeps the full-width home wrapper, restores rounded corners and removes the bottom overlay band in full-image layout", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        products: [
          {
            label: "Audio",
            title: "PREMIUM",
            subtitle: "HEADPHONES",
            description: "Auriculares premium",
            buttonText: "Comprar ahora",
            image: "/premium-headphones.png",
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);
    const hero = container.querySelector('[data-component="hero"]');

    expect(hero).toHaveClass("container");
    expect(hero).not.toHaveClass("max-w-7xl");
    expect(hero).toHaveClass("rounded-2xl");
    expect(hero).toHaveClass("md:rounded-3xl");
    expect(hero).not.toHaveClass("px-2");
    expect(hero).not.toHaveClass("md:px-4");
    expect(screen.queryByTestId("hero-bottom-bar")).not.toBeInTheDocument();
  });

  it("applies full-image fit, position and content alignment controls", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        backgroundMode: "stage",
        imageFit: "contain",
        imagePositionX: "left",
        imagePositionY: "top",
        fullImageContentAlign: "right",
        products: [
          {
            label: "Audio",
            title: "PREMIUM",
            subtitle: "HEADPHONES",
            description: "Auriculares premium",
            buttonText: "Comprar ahora",
            image: "/premium-headphones.png",
          },
        ],
      },
    });

    render(<HeroBanner />);

    const backgroundImage = screen.getByTestId("hero-full-background-image");
    expect(backgroundImage).toHaveAttribute("data-hero-background-fit", "stage");
    expect(backgroundImage).toHaveStyle({
      objectFit: "contain",
      objectPosition: "left top",
    });

    const contentContainer = screen.getByTestId("hero-full-content-container");
    expect(contentContainer).toHaveClass("justify-end");

    const contentBlock = screen.getByTestId("hero-full-content-block");
    expect(contentBlock).toHaveClass("text-right");
  });
});
