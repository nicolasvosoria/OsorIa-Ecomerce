import type {
  HeroBackgroundMode,
  HeroContentAlign,
  HeroImageFit,
  HeroLayerId,
  HeroLayoutMode,
  HeroSlideLayerFields,
  HeroStyleInput,
} from "@/lib/hero/hero-layer-model";
import {
  HERO_TEXT_SIZE_CLASSES,
  isDarkHeroTheme,
  type HeroThemeLike,
} from "./hero-rendering";

interface HeroThemeColorSource extends HeroThemeLike {
  colors: HeroThemeLike["colors"] & {
    accent?: string;
    secondary?: string;
  };
}

export interface HeroResolvedColors {
  bgColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  barColor?: string;
  accentColor: string;
  secondaryColor: string;
  isDarkTheme: boolean;
}

export interface HeroShellProps {
  layout: HeroLayoutMode;
  viewportShell?: "full-image";
  backgroundMode?: HeroBackgroundMode;
  sideGutters?: "24px";
  className: string;
}

export interface HeroFullImageAlignmentClasses {
  contentPositionClass: string;
  textAlignClass: string;
}

export interface HeroSlideContentViewModel {
  displayLabel: string;
  displayTitle: string;
  displaySubtitle: string;
  displayDescription: string;
  displayButtonText: string;
  displayImage: string;
  productMediaImage: string;
  slideTextColor: string;
  textSize: NonNullable<HeroSlideLayerFields["textSize"]>;
  titleSizeClass: string;
  productPresence: NonNullable<HeroSlideLayerFields["productPresence"]>;
  productPlacement: NonNullable<HeroSlideLayerFields["productPlacement"]>;
  productMediaOrderClass: string;
}

export type HeroLayerAttributes = {
  "data-hero-layer": HeroLayerId;
  "data-selected-hero-layer"?: "true";
};

function readStringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function readOptionalStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function resolveHeroColors({
  activeTheme,
  styleData,
  edits,
}: {
  activeTheme: HeroThemeColorSource | null;
  styleData: HeroStyleInput;
  edits: HeroStyleInput;
}): HeroResolvedColors {
  return {
    bgColor: readStringValue(
      edits.bgColor,
      readStringValue(styleData.bgColor, "var(--primary)"),
    ),
    textColor: readStringValue(
      edits.textColor,
      readStringValue(styleData.textColor, "var(--primary-foreground)"),
    ),
    buttonColor: readStringValue(
      edits.buttonColor,
      readStringValue(styleData.buttonColor, "var(--accent)"),
    ),
    buttonTextColor: readStringValue(
      edits.buttonTextColor,
      readStringValue(styleData.buttonTextColor, "var(--accent-foreground)"),
    ),
    barColor: readOptionalStringValue(edits.barColor) ?? readOptionalStringValue(styleData.barColor),
    accentColor: activeTheme?.colors.accent || "#005aa1",
    secondaryColor: activeTheme?.colors.secondary || "#c4faff",
    isDarkTheme: isDarkHeroTheme(activeTheme),
  };
}

export function resolveHeroShellProps(
  layoutMode: HeroLayoutMode,
  backgroundMode: HeroBackgroundMode,
): HeroShellProps {
  if (layoutMode === "full-image") {
    return {
      layout: layoutMode,
      viewportShell: "full-image",
      backgroundMode,
      sideGutters: "24px",
      className:
        "container relative mx-6 w-auto max-w-none overflow-hidden rounded-2xl md:rounded-3xl mt-2 md:mt-4 mb-4 md:mb-8",
    };
  }

  return {
    layout: layoutMode,
    className:
      "container relative w-full overflow-hidden rounded-2xl md:rounded-3xl mx-auto px-2 md:px-4 mt-2 md:mt-4 mb-4 md:mb-8",
  };
}

export function resolveFullImageAlignmentClasses(
  contentAlign: HeroContentAlign,
): HeroFullImageAlignmentClasses {
  if (contentAlign === "center") {
    return { contentPositionClass: "justify-center", textAlignClass: "text-center" };
  }

  if (contentAlign === "right") {
    return { contentPositionClass: "justify-end", textAlignClass: "text-right" };
  }

  return { contentPositionClass: "justify-start", textAlignClass: "text-left" };
}

export function resolveHeroBackgroundObjectFit(
  backgroundMode: HeroBackgroundMode,
  imageFit: HeroImageFit,
): "fill" | "contain" | "cover" {
  if (backgroundMode === "fill") return "fill";
  return imageFit === "contain" ? "contain" : "cover";
}

export function getHeroLayerAttributes(
  layerId: HeroLayerId,
  selectedHeroLayer: HeroLayerId | null | undefined,
): HeroLayerAttributes {
  return {
    "data-hero-layer": layerId,
    "data-selected-hero-layer": selectedHeroLayer === layerId ? "true" : undefined,
  };
}

export function resolveHeroSlideContent(
  slide: HeroSlideLayerFields,
  fallbackTextColor: string,
): HeroSlideContentViewModel {
  const displayImage = slide.backgroundImage || slide.image || "/placeholder.svg";
  const productPlacement = slide.productPlacement ?? "right";

  return {
    displayLabel: slide.label || "",
    displayTitle: slide.title || "",
    displaySubtitle: slide.subtitle || "",
    displayDescription: slide.description || "",
    displayButtonText: slide.buttonText || "",
    displayImage,
    productMediaImage: slide.productImage || displayImage,
    slideTextColor: slide.textColor || fallbackTextColor,
    textSize: slide.textSize ?? "feature",
    titleSizeClass: HERO_TEXT_SIZE_CLASSES[slide.textSize ?? "feature"],
    productPresence: slide.productPresence ?? "balanced",
    productPlacement,
    productMediaOrderClass:
      productPlacement === "left" ? "order-first" : "order-first md:order-last",
  };
}
