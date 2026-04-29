import type {
  HeroBackgroundMode,
  HeroHotspotAnchor,
  HeroHotspotTarget,
  HeroLayerModel,
  HeroProductPlacement,
  HeroProductPresence,
  HeroSecondaryProductPreset,
  HeroSlideLayerFields,
  HeroTextSize,
} from "./hero-types";

export const DEFAULT_HERO_PRODUCTS: HeroSlideLayerFields[] = [
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

export const HERO_TEXT_SIZE_VALUES = HERO_TEXT_SIZE_OPTIONS.map(
  (option) => option.value,
) as HeroTextSize[];
export const HERO_PRODUCT_PLACEMENT_VALUES = HERO_PRODUCT_PLACEMENT_OPTIONS.map(
  (option) => option.value,
) as HeroProductPlacement[];
export const HERO_SECONDARY_PRODUCT_PRESET_VALUES =
  HERO_SECONDARY_PRODUCT_PRESET_OPTIONS.map(
    (option) => option.value,
  ) as HeroSecondaryProductPreset[];
export const HERO_HOTSPOT_ANCHOR_VALUES = HERO_HOTSPOT_ANCHOR_OPTIONS.map(
  (option) => option.value,
) as HeroHotspotAnchor[];
export const HERO_HOTSPOT_TARGET_VALUES = HERO_HOTSPOT_TARGET_OPTIONS.map(
  (option) => option.value,
) as HeroHotspotTarget[];
export const HERO_PRODUCT_PRESENCE_VALUES = HERO_PRODUCT_PRESENCE_OPTIONS.map(
  (option) => option.value,
) as HeroProductPresence[];
export const HERO_BACKGROUND_MODE_VALUES = HERO_BACKGROUND_MODE_OPTIONS.map(
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
  products: DEFAULT_HERO_PRODUCTS.map((product) => ({
    ...product,
    backgroundImage: product.backgroundImage ?? product.image,
  })),
};
