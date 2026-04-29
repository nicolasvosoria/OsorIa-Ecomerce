import type { CSSProperties } from "react";
import type {
  HeroContentAlign,
  HeroHotspotTarget,
  HeroLayoutMode,
  HeroProductPlacement,
  HeroProductPresence,
  HeroSecondaryProductPreset,
  HeroSlideLayerFields,
} from "@/lib/hero/hero-layer-model";

export interface HeroThemeLike {
  theme_name: string;
  colors: {
    background: string;
  };
}

export interface HeroProductFrameDescriptor {
  target: HeroHotspotTarget;
  src: string;
  alt: string;
  placement: HeroProductPlacement;
  width: number;
  height: number;
  sizes: string;
  imageClassName: string;
}

export const HERO_TEXT_SIZE_CLASSES: Record<
  NonNullable<HeroSlideLayerFields["textSize"]>,
  string
> = {
  compact: "text-3xl md:text-5xl lg:text-6xl",
  balanced: "text-4xl md:text-6xl lg:text-7xl",
  feature: "text-4xl md:text-6xl lg:text-[92px]",
};

export const HERO_SECONDARY_PRESET_PLACEMENT: Record<
  HeroSecondaryProductPreset,
  { primary: HeroProductPlacement; secondary: HeroProductPlacement }
> = {
  "primary-right-secondary-left": { primary: "right", secondary: "left" },
  "primary-left-secondary-right": { primary: "left", secondary: "right" },
};

export const HERO_FULL_IMAGE_PRODUCT_SIDE_CLASSES: Record<
  HeroProductPlacement,
  string
> = {
  left: "md:left-8 md:right-auto",
  right: "md:right-8 md:left-auto",
};

export const HERO_PRODUCT_PRESENCE_FRAME_CLASSES: Record<
  HeroProductPresence,
  string
> = {
  subtle: "opacity-85",
  balanced: "opacity-95",
  prominent: "opacity-100",
};

export function toHeroProductSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function isDarkHeroTheme(activeTheme: HeroThemeLike | null): boolean {
  if (!activeTheme) return false;
  if (activeTheme.theme_name.toLowerCase().includes("oscuro")) {
    return true;
  }

  const backgroundColor = activeTheme.colors.background;
  if (!backgroundColor.startsWith("#") || backgroundColor.length < 7) {
    return false;
  }

  const red = parseInt(backgroundColor.slice(1, 3), 16);
  const green = parseInt(backgroundColor.slice(3, 5), 16);
  const blue = parseInt(backgroundColor.slice(5, 7), 16);

  return (red + green + blue) / 3 < 128;
}

export function getProductCompositionStyle(
  product: HeroSlideLayerFields,
): CSSProperties {
  const productScale = product.productScale ?? 100;
  const productOffsetX = product.productOffsetX ?? 0;
  const productOffsetY = product.productOffsetY ?? 0;

  return {
    "--hero-product-scale": String(productScale / 100),
    "--hero-product-offset-x": `${productOffsetX}%`,
    "--hero-product-offset-y": `${productOffsetY}%`,
  } as CSSProperties;
}

export function getContentCompositionStyle(
  product: HeroSlideLayerFields,
): CSSProperties {
  const contentOffsetX = product.contentOffsetX ?? 0;
  const contentOffsetY = product.contentOffsetY ?? 0;

  return {
    "--hero-content-offset-x": `${contentOffsetX}%`,
    "--hero-content-offset-y": `${contentOffsetY}%`,
  } as CSSProperties;
}

export function hexToRgba(hex: string, alpha: number): string {
  const hexColor = hex.startsWith("#") ? hex : `#${hex}`;
  if (hexColor.length < 7) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const red = parseInt(hexColor.slice(1, 3), 16);
  const green = parseInt(hexColor.slice(3, 5), 16);
  const blue = parseInt(hexColor.slice(5, 7), 16);

  if (![red, green, blue].every(Number.isFinite)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function getHeroBackgroundGradient({
  barColor,
  accentColor,
  secondaryColor,
}: {
  barColor?: string;
  accentColor: string;
  secondaryColor: string;
}): string {
  return barColor
    ? `linear-gradient(to bottom, ${hexToRgba(barColor, 0.8)}, ${hexToRgba(barColor, 0.4)})`
    : `linear-gradient(to bottom, ${hexToRgba(accentColor, 0.8)}, ${hexToRgba(secondaryColor, 0.6)})`;
}

export function resolveHeroProductFrames({
  slide,
  layoutMode,
  contentAlign,
}: {
  slide: HeroSlideLayerFields;
  layoutMode: HeroLayoutMode;
  contentAlign: HeroContentAlign;
}): HeroProductFrameDescriptor[] {
  const productImage = slide.productImage;
  if (!productImage) return [];

  const productPlacement = slide.productPlacement ?? "right";
  const isFullImageLayout = layoutMode === "full-image";
  const canRenderSecondaryProduct =
    isFullImageLayout &&
    contentAlign === "center" &&
    Boolean(slide.secondaryProductImage);
  const secondaryPreset =
    slide.secondaryProductPreset ?? "primary-right-secondary-left";
  const primaryPlacement = canRenderSecondaryProduct
    ? HERO_SECONDARY_PRESET_PLACEMENT[secondaryPreset].primary
    : productPlacement;

  const frames: HeroProductFrameDescriptor[] = [
    {
      target: "primary",
      src: productImage,
      alt: slide.productAlt || slide.title || "Hero product media",
      placement: primaryPlacement,
      width: 720,
      height: 720,
      sizes: "(max-width: 768px) 80vw, 45vw",
      imageClassName:
        "max-h-[220px] w-auto object-contain md:max-h-[420px] lg:max-h-[520px]",
    },
  ];

  if (canRenderSecondaryProduct && slide.secondaryProductImage) {
    frames.push({
      target: "secondary",
      src: slide.secondaryProductImage,
      alt: slide.secondaryProductAlt || "Hero secondary product media",
      placement: HERO_SECONDARY_PRESET_PLACEMENT[secondaryPreset].secondary,
      width: 520,
      height: 520,
      sizes: "(max-width: 768px) 60vw, 30vw",
      imageClassName:
        "max-h-[160px] w-auto object-contain md:max-h-[320px] lg:max-h-[400px]",
    });
  }

  return frames;
}
