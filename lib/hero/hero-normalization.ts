import {
  DEFAULT_HERO_LAYER_MODEL,
  DEFAULT_HERO_PRODUCTS,
  HERO_BACKGROUND_MODE_VALUES,
  HERO_CONTENT_OFFSET,
  HERO_HOTSPOT_ANCHOR_COORDINATES,
  HERO_HOTSPOT_ANCHOR_VALUES,
  HERO_HOTSPOT_TARGET_VALUES,
  HERO_PRODUCT_OFFSET,
  HERO_PRODUCT_PLACEMENT_VALUES,
  HERO_PRODUCT_PRESENCE_DEFAULTS,
  HERO_PRODUCT_PRESENCE_VALUES,
  HERO_PRODUCT_SCALE,
  HERO_SECONDARY_PRODUCT_PRESET_VALUES,
  HERO_TEXT_SIZE_VALUES,
} from "./hero-defaults";
import type {
  HeroContentAlign,
  HeroHotspot,
  HeroHotspotAnchor,
  HeroHotspotTarget,
  HeroImageFit,
  HeroLayerModel,
  HeroLayoutMode,
  HeroProductPlacement,
  HeroProductPresence,
  HeroSecondaryProductPreset,
  HeroSlideLayerFields,
  HeroStyleInput,
  HeroStylePayload,
  HeroVerticalPosition,
  HeroHorizontalPosition,
} from "./hero-types";

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function pickUnion<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

export function clampOverlayOpacity(value: unknown): number {
  const numericValue = Number(value ?? DEFAULT_HERO_LAYER_MODEL.overlayOpacity);
  if (!Number.isFinite(numericValue)) {
    return DEFAULT_HERO_LAYER_MODEL.overlayOpacity;
  }
  return Math.min(Math.max(numericValue, 0), 0.9);
}

export function clampHeroHotspotCoordinate(
  value: unknown,
  fallback: number,
): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.min(Math.max(numericValue, 0), 100);
}

function clampBoundedNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.min(Math.max(numericValue, min), max);
}

export function clampHeroProductScale(
  value: unknown,
  fallback: number = HERO_PRODUCT_SCALE.default,
): number {
  return clampBoundedNumber(
    value,
    fallback,
    HERO_PRODUCT_SCALE.min,
    HERO_PRODUCT_SCALE.max,
  );
}

export function clampHeroProductOffset(
  value: unknown,
  fallback: number = HERO_PRODUCT_OFFSET.default,
): number {
  return clampBoundedNumber(
    value,
    fallback,
    HERO_PRODUCT_OFFSET.min,
    HERO_PRODUCT_OFFSET.max,
  );
}

export function clampHeroContentOffset(
  value: unknown,
  fallback: number = HERO_CONTENT_OFFSET.default,
): number {
  return clampBoundedNumber(
    value,
    fallback,
    HERO_CONTENT_OFFSET.min,
    HERO_CONTENT_OFFSET.max,
  );
}

export function normalizeHeroHotspots(value: unknown): HeroHotspot[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((hotspot) => {
    if (!hotspot || typeof hotspot !== "object") return [];
    const record = hotspot as Record<string, unknown>;
    const id = normalizeOptionalString(record.id);
    const label = normalizeOptionalString(record.label);
    const anchor = record.anchor;

    if (
      !id ||
      !label ||
      typeof anchor !== "string" ||
      !HERO_HOTSPOT_ANCHOR_VALUES.includes(anchor as HeroHotspotAnchor)
    ) {
      return [];
    }

    const description = normalizeOptionalString(record.description);
    const href = normalizeOptionalString(record.href);
    const coordinateDefaults =
      HERO_HOTSPOT_ANCHOR_COORDINATES[anchor as HeroHotspotAnchor];

    return [
      {
        id,
        label,
        ...(description ? { description } : {}),
        ...(href ? { href } : {}),
        anchor: anchor as HeroHotspotAnchor,
        x: clampHeroHotspotCoordinate(record.x, coordinateDefaults.x),
        y: clampHeroHotspotCoordinate(record.y, coordinateDefaults.y),
        target: pickUnion(
          record.target,
          HERO_HOTSPOT_TARGET_VALUES,
          "primary" satisfies HeroHotspotTarget,
        ),
      },
    ];
  });
}

export function normalizeHeroSlide(
  slide: Partial<HeroSlideLayerFields> = {},
): HeroSlideLayerFields {
  const image = slide.image;
  const backgroundImage = slide.backgroundImage ?? image;
  const normalizedHotspots = normalizeHeroHotspots(slide.hotspots);
  const textColor = normalizeOptionalString(slide.textColor);
  const secondaryProductImage = normalizeOptionalString(
    slide.secondaryProductImage,
  );
  const secondaryProductAlt = normalizeOptionalString(slide.secondaryProductAlt);
  const productPresence = pickUnion(
    slide.productPresence,
    HERO_PRODUCT_PRESENCE_VALUES,
    "balanced" satisfies HeroProductPresence,
  );
  const compositionDefaults = HERO_PRODUCT_PRESENCE_DEFAULTS[productPresence];

  return {
    ...slide,
    ...(image ? { image } : {}),
    ...(backgroundImage ? { backgroundImage } : {}),
    ...(textColor ? { textColor } : {}),
    secondaryProductImage,
    secondaryProductAlt,
    textSize: pickUnion(
      slide.textSize,
      HERO_TEXT_SIZE_VALUES,
      "feature" satisfies HeroSlideLayerFields["textSize"],
    ),
    productPlacement: pickUnion(
      slide.productPlacement,
      HERO_PRODUCT_PLACEMENT_VALUES,
      "right" satisfies HeroProductPlacement,
    ),
    productPresence,
    productScale: clampHeroProductScale(
      slide.productScale,
      compositionDefaults.productScale,
    ),
    productOffsetX: clampHeroProductOffset(
      slide.productOffsetX,
      compositionDefaults.productOffsetX,
    ),
    productOffsetY: clampHeroProductOffset(
      slide.productOffsetY,
      compositionDefaults.productOffsetY,
    ),
    contentOffsetX: clampHeroContentOffset(slide.contentOffsetX),
    contentOffsetY: clampHeroContentOffset(slide.contentOffsetY),
    secondaryProductPreset:
      slide.secondaryProductPreset || secondaryProductImage
        ? pickUnion(
            slide.secondaryProductPreset,
            HERO_SECONDARY_PRODUCT_PRESET_VALUES,
            "primary-right-secondary-left" satisfies HeroSecondaryProductPreset,
          )
        : undefined,
    hotspots: normalizedHotspots,
  };
}

export function createNextHeroHotspotId(hotspots: HeroHotspot[] = []): string {
  const existingIds = new Set(hotspots.map((hotspot) => hotspot.id));
  let nextIndex = 1;

  while (existingIds.has(`hotspot-${nextIndex}`)) {
    nextIndex += 1;
  }

  return `hotspot-${nextIndex}`;
}

export function toHeroLayerModel(
  variables: HeroStyleInput = {},
): HeroLayerModel {
  const rawProducts = Array.isArray(variables.products)
    ? variables.products
    : DEFAULT_HERO_PRODUCTS;

  return {
    layoutMode: pickUnion(
      variables.layoutMode,
      ["split", "full-image"] as const,
      DEFAULT_HERO_LAYER_MODEL.layoutMode,
    ) satisfies HeroLayoutMode,
    imageFit: pickUnion(
      variables.imageFit,
      ["cover", "contain"] as const,
      DEFAULT_HERO_LAYER_MODEL.imageFit,
    ) satisfies HeroImageFit,
    backgroundMode: pickUnion(
      variables.backgroundMode,
      HERO_BACKGROUND_MODE_VALUES,
      DEFAULT_HERO_LAYER_MODEL.backgroundMode,
    ),
    imagePositionX: pickUnion(
      variables.imagePositionX,
      ["left", "center", "right"] as const,
      DEFAULT_HERO_LAYER_MODEL.imagePositionX,
    ) satisfies HeroHorizontalPosition,
    imagePositionY: pickUnion(
      variables.imagePositionY,
      ["top", "center", "bottom"] as const,
      DEFAULT_HERO_LAYER_MODEL.imagePositionY,
    ) satisfies HeroVerticalPosition,
    contentAlign: pickUnion(
      variables.contentAlign ?? variables.fullImageContentAlign,
      ["left", "center", "right"] as const,
      DEFAULT_HERO_LAYER_MODEL.contentAlign,
    ) satisfies HeroContentAlign,
    overlayColor:
      typeof variables.overlayColor === "string" && variables.overlayColor
        ? variables.overlayColor
        : DEFAULT_HERO_LAYER_MODEL.overlayColor,
    overlayOpacity: clampOverlayOpacity(variables.overlayOpacity),
    products: rawProducts.map((product) =>
      normalizeHeroSlide(product as Partial<HeroSlideLayerFields>),
    ),
  };
}

export function updateHeroSlideLayer(
  model: HeroLayerModel,
  slideIndex: number,
  updates: Partial<HeroSlideLayerFields>,
): HeroLayerModel {
  return {
    ...model,
    products: model.products.map((slide, index) =>
      index === slideIndex ? normalizeHeroSlide({ ...slide, ...updates }) : slide,
    ),
  };
}

export function updateHeroLayerModel(
  model: HeroLayerModel,
  updates: Partial<Omit<HeroLayerModel, "products">>,
): HeroLayerModel {
  return toHeroLayerModel({
    ...model,
    ...updates,
    products: model.products,
  });
}

export function toFlatHeroVariables(model: HeroLayerModel): HeroStylePayload {
  return {
    layoutMode: model.layoutMode,
    imageFit: model.imageFit,
    backgroundMode: model.backgroundMode,
    imagePositionX: model.imagePositionX,
    imagePositionY: model.imagePositionY,
    fullImageContentAlign: model.contentAlign,
    overlayColor: model.overlayColor,
    overlayOpacity: String(model.overlayOpacity),
    products: model.products.map((product) => ({ ...product })),
  };
}
