import { createElement, type ReactNode } from "react";
import { expect } from "vitest";
import type {
  HeroLayerId,
  HeroLayerModel,
  HeroSlideLayerFields,
  HeroStyleInput,
} from "@/lib/hero/hero-layer-model";

export interface HeroThemeMock {
  activeTheme: {
    theme_name: string;
    colors: {
      background: string;
      accent: string;
      secondary: string;
    };
  };
}

export interface HeroAdminMock {
  componentEdits: Map<string, HeroStyleInput>;
  selectedHeroLayer: HeroLayerId | null;
  selectedHeroSlideIndex: number;
  selectedHeroHotspotId: string | null;
}

export interface HeroComponentStyleMock {
  styles: HeroStyleInput;
}

export interface MockNextImageProps {
  alt: string;
  fill?: boolean;
  priority?: boolean;
  [key: string]: unknown;
}

export interface MockNextLinkProps {
  href: string;
  children: ReactNode;
  [key: string]: unknown;
}

export const legacyHeroSlide: HeroSlideLayerFields = {
  label: "Audio",
  title: "PREMIUM",
  subtitle: "HEADPHONES",
  description: "Auriculares premium",
  buttonText: "Comprar ahora",
  image: "/legacy-background.jpg",
};

export const currentHeroSlide: HeroSlideLayerFields = {
  label: "Audio",
  title: "HERO ACTUAL",
  subtitle: "CAPAS",
  description: "Hero con capas actuales",
  buttonText: "Ver oferta",
  image: "/legacy-bg.jpg",
  backgroundImage: "/layered-bg.jpg",
  productImage: "/primary.png",
  productAlt: "Producto principal",
  secondaryProductImage: "/secondary.png",
  secondaryProductAlt: "Producto secundario",
  secondaryProductPreset: "primary-left-secondary-right",
  textColor: "#22cc88",
  textSize: "balanced",
  productPlacement: "left",
  productPresence: "subtle",
  productScale: 92,
  productOffsetX: -12,
  productOffsetY: 8,
  contentOffsetX: 7,
  contentOffsetY: -6,
  hotspots: [
    {
      id: "driver",
      label: "Driver",
      description: "Audio mejorado",
      href: "/products/driver",
      anchor: "top-left",
      x: 25,
      y: 20,
      target: "primary",
    },
    {
      id: "secondary-chip",
      label: "Secundario",
      anchor: "bottom-right",
      x: 75,
      y: 80,
      target: "secondary",
    },
  ],
};

export const legacyHeroPayload: HeroStyleInput = {
  layoutMode: "full-image",
  imageFit: "contain",
  fullImageContentAlign: "right",
  overlayOpacity: "0.55",
  products: [legacyHeroSlide],
};

export const currentHeroPayload: HeroStyleInput = {
  layoutMode: "full-image",
  imageFit: "cover",
  backgroundMode: "fill",
  imagePositionX: "center",
  imagePositionY: "center",
  fullImageContentAlign: "center",
  overlayColor: "#111827",
  overlayOpacity: "0.65",
  products: [currentHeroSlide],
};

export const malformedLegacyHeroPayload: HeroStyleInput = {
  layoutMode: "poster",
  imageFit: "stretch",
  backgroundMode: "canvas",
  fullImageContentAlign: "offscreen",
  overlayOpacity: "2.5",
  products: [
    {
      ...legacyHeroSlide,
      textSize: "massive" as never,
      productPlacement: "middle" as never,
      productScale: "165" as never,
      productOffsetX: "-45" as never,
      productOffsetY: 35,
      contentOffsetX: "24" as never,
      contentOffsetY: -22,
      hotspots: [
        { id: "valid", label: "Visible", anchor: "center-left" },
        { id: "bad-anchor", label: "Bad", anchor: "custom" as never },
      ],
    },
  ],
};

export function createHeroAdminMock(
  overrides: Partial<HeroAdminMock> = {},
): HeroAdminMock {
  return {
    componentEdits: new Map(),
    selectedHeroLayer: null,
    selectedHeroSlideIndex: 0,
    selectedHeroHotspotId: null,
    ...overrides,
  };
}

export function createHeroThemeMock(
  overrides: Partial<HeroThemeMock["activeTheme"]> = {},
): HeroThemeMock {
  return {
    activeTheme: {
      theme_name: "Claro",
      colors: {
        background: "#ffffff",
        accent: "#005aa1",
        secondary: "#c4faff",
      },
      ...overrides,
    },
  };
}

export function createHeroStyleMock(
  styles: HeroStyleInput = currentHeroPayload,
): HeroComponentStyleMock {
  return { styles };
}

export function createMockNextImage({ alt, ...props }: MockNextImageProps) {
  const imageProps = { ...props };
  delete imageProps.fill;
  delete imageProps.priority;

  return createElement("img", { alt, ...imageProps });
}

export function MockNextLink({ href, children, ...props }: MockNextLinkProps) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}

export function expectLegacyPayloadMeaning(model: HeroLayerModel) {
  expect(model.layoutMode).toBe("full-image");
  expect(model.imageFit).toBe("contain");
  expect(model.contentAlign).toBe("right");
  expect(model.products[0]).toMatchObject({
    image: legacyHeroSlide.image,
    backgroundImage: legacyHeroSlide.image,
    title: legacyHeroSlide.title,
  });
}
