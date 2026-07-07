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
  contentMaxWidthClass: string;
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

/** Resolves a color with "edit > theme > factory" precedence. */
function pickColor(edit: unknown, style: unknown, fallback: string): string {
  return readStringValue(edit, readStringValue(style, fallback));
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
    bgColor: pickColor(edits.bgColor, styleData.bgColor, "var(--primary)"),
    textColor: pickColor(edits.textColor, styleData.textColor, "var(--foreground)"),
    buttonColor: pickColor(
      edits.buttonColor,
      styleData.buttonColor,
      "var(--sec-hero-button, var(--primary))",
    ),
    buttonTextColor: pickColor(
      edits.buttonTextColor,
      styleData.buttonTextColor,
      "var(--primary-foreground)",
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
        "container relative mx-6 w-auto max-w-none overflow-hidden rounded-card mt-2 md:mt-4 mb-4 md:mb-8",
    };
  }

  return {
    layout: layoutMode,
    className:
      "container relative w-full overflow-hidden rounded-card mx-auto px-2 md:px-4 mt-2 md:mt-4 mb-4 md:mb-8",
  };
}

const SIDE_ALIGNED_CONTENT_MAX_WIDTH = "max-w-3xl md:max-w-[46%]";
const CENTERED_CONTENT_MAX_WIDTH = "max-w-3xl";

export function resolveFullImageAlignmentClasses(
  contentAlign: HeroContentAlign,
): HeroFullImageAlignmentClasses {
  if (contentAlign === "center") {
    return {
      contentPositionClass: "justify-center",
      textAlignClass: "text-center",
      contentMaxWidthClass: CENTERED_CONTENT_MAX_WIDTH,
    };
  }

  if (contentAlign === "right") {
    return {
      contentPositionClass: "justify-end",
      textAlignClass: "text-right",
      contentMaxWidthClass: SIDE_ALIGNED_CONTENT_MAX_WIDTH,
    };
  }

  return {
    contentPositionClass: "justify-start",
    textAlignClass: "text-left",
    contentMaxWidthClass: SIDE_ALIGNED_CONTENT_MAX_WIDTH,
  };
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
