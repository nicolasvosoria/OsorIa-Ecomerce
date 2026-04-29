export type HeroLayerId =
  | "background"
  | "product"
  | "content"
  | "overlay"
  | "cta"
  | "hotspots";

export type HeroLayoutMode = "split" | "full-image";

export type HeroImageFit = "cover" | "contain";
export type HeroBackgroundMode = "stage" | "fill";
export type HeroHorizontalPosition = "left" | "center" | "right";
export type HeroVerticalPosition = "top" | "center" | "bottom";
export type HeroContentAlign = "left" | "center" | "right";
export type HeroTextSize = "compact" | "balanced" | "feature";
export type HeroProductPlacement = "left" | "right";
export type HeroSecondaryProductPreset =
  | "primary-right-secondary-left"
  | "primary-left-secondary-right";
export type HeroHotspotAnchor =
  | "top-left"
  | "top-right"
  | "center-left"
  | "center-right"
  | "bottom-left"
  | "bottom-right";
export type HeroHotspotTarget = "primary" | "secondary";
export type HeroProductPresence = "subtle" | "balanced" | "prominent";

export interface HeroHotspot {
  id: string;
  label: string;
  description?: string;
  href?: string;
  anchor: HeroHotspotAnchor;
  x?: number;
  y?: number;
  target?: HeroHotspotTarget;
}

export interface HeroSlideLayerFields {
  label?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  image?: string;
  backgroundImage?: string;
  productImage?: string;
  productAlt?: string;
  secondaryProductImage?: string;
  secondaryProductAlt?: string;
  secondaryProductPreset?: HeroSecondaryProductPreset;
  textColor?: string;
  textSize?: HeroTextSize;
  productPlacement?: HeroProductPlacement;
  productPresence?: HeroProductPresence;
  productScale?: number;
  productOffsetX?: number;
  productOffsetY?: number;
  contentOffsetX?: number;
  contentOffsetY?: number;
  hotspots?: HeroHotspot[];
}

export interface HeroLayerModel {
  layoutMode: HeroLayoutMode;
  imageFit: HeroImageFit;
  backgroundMode: HeroBackgroundMode;
  imagePositionX: HeroHorizontalPosition;
  imagePositionY: HeroVerticalPosition;
  contentAlign: HeroContentAlign;
  overlayColor: string;
  overlayOpacity: number;
  products: HeroSlideLayerFields[];
}

const DEFAULT_PRODUCTS: HeroSlideLayerFields[] = [
  {
    label: "Electrónica",
    title: "BALFE",
    subtitle: "NUEVO MODELO",
    description:
      "Descubre la última tecnología en dispositivos electrónicos. Calidad premium y diseño innovador para una experiencia única.",
    buttonText: "Comprar ahora",
    image: "/black-smart-speaker.jpg",
  },
  {
    label: "Audio",
    title: "PREMIUM",
    subtitle: "HEADPHONES",
    description:
      "Experimenta el sonido de alta calidad con nuestros auriculares premium. Diseño ergonómico y cancelación de ruido activa.",
    buttonText: "Ver más",
    image: "/premium-headphones.png",
  },
  {
    label: "Accesorios",
    title: "LAPTOP STAND",
    subtitle: "ERGONÓMICO",
    description:
      "Mejora tu espacio de trabajo con nuestro soporte para laptop. Diseño moderno y ajustable para mayor comodidad.",
    buttonText: "Comprar ahora",
    image: "/laptop-stand.png",
  },
  {
    label: "Proyección",
    title: "MINI PROJECTOR",
    subtitle: "PORTÁTIL",
    description:
      "Lleva el cine contigo. Proyector compacto con alta resolución y conectividad inalámbrica para tus presentaciones.",
    buttonText: "Descubrir",
    image: "/mini-projector.jpg",
  },
];

export const HERO_TEXT_SIZE_OPTIONS: Array<{
  value: HeroTextSize;
  label: string;
}> = [
  { value: "compact", label: "Compacto" },
  { value: "balanced", label: "Balanceado" },
  { value: "feature", label: "Destacado" },
];

export const HERO_PRODUCT_PLACEMENT_OPTIONS: Array<{
  value: HeroProductPlacement;
  label: string;
}> = [
  { value: "left", label: "Izquierda" },
  { value: "right", label: "Derecha" },
];

export const HERO_SECONDARY_PRODUCT_PRESET_OPTIONS: Array<{
  value: HeroSecondaryProductPreset;
  label: string;
}> = [
  {
    value: "primary-right-secondary-left",
    label: "Principal derecha, secundario izquierda",
  },
  {
    value: "primary-left-secondary-right",
    label: "Principal izquierda, secundario derecha",
  },
];

export const HERO_HOTSPOT_ANCHOR_OPTIONS: Array<{
  value: HeroHotspotAnchor;
  label: string;
}> = [
  { value: "top-left", label: "Arriba izquierda" },
  { value: "top-right", label: "Arriba derecha" },
  { value: "center-left", label: "Centro izquierda" },
  { value: "center-right", label: "Centro derecha" },
  { value: "bottom-left", label: "Abajo izquierda" },
  { value: "bottom-right", label: "Abajo derecha" },
];

export const HERO_HOTSPOT_TARGET_OPTIONS: Array<{
  value: HeroHotspotTarget;
  label: string;
}> = [
  { value: "primary", label: "Principal" },
  { value: "secondary", label: "Secundario" },
];

export const HERO_PRODUCT_PRESENCE_OPTIONS: Array<{
  value: HeroProductPresence;
  label: string;
}> = [
  { value: "subtle", label: "Sutil" },
  { value: "balanced", label: "Balanceada" },
  { value: "prominent", label: "Prominente" },
];

export const HERO_BACKGROUND_MODE_OPTIONS: Array<{
  value: HeroBackgroundMode;
  label: string;
}> = [
  { value: "fill", label: "Estirar al banner completo" },
  { value: "stage", label: "Mantener proporción dentro del stage" },
];

export const HERO_PRODUCT_SCALE = { min: 70, max: 140, default: 100 } as const;
export const HERO_PRODUCT_OFFSET = { min: -20, max: 20, default: 0 } as const;
export const HERO_CONTENT_OFFSET = { min: -16, max: 16, default: 0 } as const;

export const HERO_PRODUCT_PRESENCE_DEFAULTS: Record<
  HeroProductPresence,
  { productScale: number; productOffsetX: number; productOffsetY: number }
> = {
  subtle: { productScale: 90, productOffsetX: 0, productOffsetY: 0 },
  balanced: { productScale: 100, productOffsetX: 0, productOffsetY: 0 },
  prominent: { productScale: 110, productOffsetX: 0, productOffsetY: 0 },
};

export const HERO_HOTSPOT_ANCHOR_COORDINATES: Record<
  HeroHotspotAnchor,
  { x: number; y: number }
> = {
  "top-left": { x: 25, y: 20 },
  "top-right": { x: 75, y: 20 },
  "center-left": { x: 25, y: 50 },
  "center-right": { x: 75, y: 50 },
  "bottom-left": { x: 25, y: 80 },
  "bottom-right": { x: 75, y: 80 },
};

const HERO_TEXT_SIZE_VALUES = HERO_TEXT_SIZE_OPTIONS.map(
  (option) => option.value,
) as HeroTextSize[];
const HERO_PRODUCT_PLACEMENT_VALUES = HERO_PRODUCT_PLACEMENT_OPTIONS.map(
  (option) => option.value,
) as HeroProductPlacement[];
const HERO_SECONDARY_PRODUCT_PRESET_VALUES =
  HERO_SECONDARY_PRODUCT_PRESET_OPTIONS.map(
    (option) => option.value,
  ) as HeroSecondaryProductPreset[];
const HERO_HOTSPOT_ANCHOR_VALUES = HERO_HOTSPOT_ANCHOR_OPTIONS.map(
  (option) => option.value,
) as HeroHotspotAnchor[];
const HERO_HOTSPOT_TARGET_VALUES = HERO_HOTSPOT_TARGET_OPTIONS.map(
  (option) => option.value,
) as HeroHotspotTarget[];
const HERO_PRODUCT_PRESENCE_VALUES = HERO_PRODUCT_PRESENCE_OPTIONS.map(
  (option) => option.value,
) as HeroProductPresence[];
const HERO_BACKGROUND_MODE_VALUES = HERO_BACKGROUND_MODE_OPTIONS.map(
  (option) => option.value,
) as HeroBackgroundMode[];

export const DEFAULT_HERO_LAYER_MODEL: HeroLayerModel = {
  layoutMode: "split",
  imageFit: "cover",
  backgroundMode: "fill",
  imagePositionX: "center",
  imagePositionY: "center",
  contentAlign: "left",
  overlayColor: "#101828",
  overlayOpacity: 0.45,
  products: DEFAULT_PRODUCTS.map((product) => ({
    ...product,
    backgroundImage: product.backgroundImage ?? product.image,
  })),
};

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

export function clampHeroProductScale(value: unknown, fallback = HERO_PRODUCT_SCALE.default): number {
  return clampBoundedNumber(
    value,
    fallback,
    HERO_PRODUCT_SCALE.min,
    HERO_PRODUCT_SCALE.max,
  );
}

export function clampHeroProductOffset(value: unknown, fallback = HERO_PRODUCT_OFFSET.default): number {
  return clampBoundedNumber(
    value,
    fallback,
    HERO_PRODUCT_OFFSET.min,
    HERO_PRODUCT_OFFSET.max,
  );
}

export function clampHeroContentOffset(
  value: unknown,
  fallback = HERO_CONTENT_OFFSET.default,
): number {
  return clampBoundedNumber(
    value,
    fallback,
    HERO_CONTENT_OFFSET.min,
    HERO_CONTENT_OFFSET.max,
  );
}

export function normalizeHeroSlide(
  slide: Partial<HeroSlideLayerFields> = {},
): HeroSlideLayerFields {
  const image = slide.image;
  const backgroundImage = slide.backgroundImage ?? image;
  const normalizedHotspots = normalizeHeroHotspots((slide as any).hotspots);
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
      "feature" satisfies HeroTextSize,
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

export function createNextHeroHotspotId(hotspots: HeroHotspot[] = []): string {
  const existingIds = new Set(hotspots.map((hotspot) => hotspot.id));
  let nextIndex = 1;

  while (existingIds.has(`hotspot-${nextIndex}`)) {
    nextIndex += 1;
  }

  return `hotspot-${nextIndex}`;
}

export function toHeroLayerModel(
  variables: Record<string, any> = {},
): HeroLayerModel {
  const rawProducts = Array.isArray(variables.products)
    ? variables.products
    : DEFAULT_PRODUCTS;

  return {
    layoutMode: pickUnion(
      variables.layoutMode,
      ["split", "full-image"] as const,
      DEFAULT_HERO_LAYER_MODEL.layoutMode,
    ),
    imageFit: pickUnion(
      variables.imageFit,
      ["cover", "contain"] as const,
      DEFAULT_HERO_LAYER_MODEL.imageFit,
    ),
    backgroundMode: pickUnion(
      variables.backgroundMode,
      HERO_BACKGROUND_MODE_VALUES,
      DEFAULT_HERO_LAYER_MODEL.backgroundMode,
    ),
    imagePositionX: pickUnion(
      variables.imagePositionX,
      ["left", "center", "right"] as const,
      DEFAULT_HERO_LAYER_MODEL.imagePositionX,
    ),
    imagePositionY: pickUnion(
      variables.imagePositionY,
      ["top", "center", "bottom"] as const,
      DEFAULT_HERO_LAYER_MODEL.imagePositionY,
    ),
    contentAlign: pickUnion(
      variables.contentAlign ?? variables.fullImageContentAlign,
      ["left", "center", "right"] as const,
      DEFAULT_HERO_LAYER_MODEL.contentAlign,
    ),
    overlayColor:
      typeof variables.overlayColor === "string" && variables.overlayColor
        ? variables.overlayColor
        : DEFAULT_HERO_LAYER_MODEL.overlayColor,
    overlayOpacity: clampOverlayOpacity(variables.overlayOpacity),
    products: rawProducts.map((product) => normalizeHeroSlide(product)),
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

export function toFlatHeroVariables(model: HeroLayerModel): Record<string, any> {
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
