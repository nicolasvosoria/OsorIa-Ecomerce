import {
  HERO_CONTENT_OFFSET,
  HERO_HOTSPOT_ANCHOR_COORDINATES,
  HERO_PRODUCT_OFFSET,
  HERO_PRODUCT_SCALE,
  createNextHeroHotspotId,
  normalizeHeroSlide,
  type HeroHotspot,
  type HeroLayerId,
  type HeroSlideLayerFields,
  type HeroSlideUpdates,
} from "@/lib/hero/hero-layer-model";

export const HERO_LAYER_OPTIONS: Array<{ value: HeroLayerId; label: string }> = [
  { value: "background", label: "Fondo" },
  { value: "product", label: "Producto" },
  { value: "content", label: "Contenido" },
  { value: "overlay", label: "Contraste" },
  { value: "cta", label: "Acción" },
  { value: "hotspots", label: "Hotspots" },
];

export interface HeroSlideMutationResult {
  products: HeroSlideLayerFields[];
  nextSlideIndex: number;
  nextHotspotId: string | null;
}

export function getActiveHeroSlideIndex(
  products: HeroSlideLayerFields[],
  requestedIndex: number | null | undefined,
): number {
  return Math.min(
    Math.max(requestedIndex ?? 0, 0),
    Math.max(products.length - 1, 0),
  );
}

export function createHeroSlideDraft(
  nextSlideNumber: number,
): HeroSlideLayerFields {
  return normalizeHeroSlide({
    label: "Nuevo",
    title: `Slide ${nextSlideNumber}`,
    subtitle: "",
    description: "",
    buttonText: "Comprar ahora",
    image: "",
    backgroundImage: "",
    textSize: "feature",
    productPlacement: "right",
    productPresence: "balanced",
    productScale: HERO_PRODUCT_SCALE.default,
    productOffsetX: HERO_PRODUCT_OFFSET.default,
    productOffsetY: HERO_PRODUCT_OFFSET.default,
    contentOffsetX: HERO_CONTENT_OFFSET.default,
    contentOffsetY: HERO_CONTENT_OFFSET.default,
    hotspots: [],
  });
}

export function addHeroSlide(
  products: HeroSlideLayerFields[],
): HeroSlideMutationResult {
  const updatedProducts = [
    ...products,
    createHeroSlideDraft(products.length + 1),
  ];

  return {
    products: updatedProducts,
    nextSlideIndex: updatedProducts.length - 1,
    nextHotspotId: null,
  };
}

export function deleteHeroSlide(
  products: HeroSlideLayerFields[],
  activeSlideIndex: number,
): HeroSlideMutationResult {
  if (products.length <= 1) {
    return {
      products,
      nextSlideIndex: getActiveHeroSlideIndex(products, activeSlideIndex),
      nextHotspotId: null,
    };
  }

  const boundedIndex = getActiveHeroSlideIndex(products, activeSlideIndex);
  const updatedProducts = products.filter((_slide, index) => index !== boundedIndex);

  return {
    products: updatedProducts,
    nextSlideIndex: getActiveHeroSlideIndex(updatedProducts, boundedIndex),
    nextHotspotId: null,
  };
}

export function updateHeroSlide(
  products: HeroSlideLayerFields[],
  slideIndex: number,
  updates: HeroSlideUpdates,
): HeroSlideLayerFields[] {
  const boundedIndex = getActiveHeroSlideIndex(products, slideIndex);

  return products.map((slide, index) =>
    index === boundedIndex
      ? normalizeHeroSlide({ ...slide, ...updates })
      : normalizeHeroSlide(slide),
  );
}

export function createHeroHotspotDraft(
  hotspots: HeroHotspot[] = [],
): HeroHotspot {
  return {
    id: createNextHeroHotspotId(hotspots),
    label: "Nuevo hotspot",
    description: "",
    href: "",
    anchor: "center-right",
    ...HERO_HOTSPOT_ANCHOR_COORDINATES["center-right"],
    target: "primary",
  };
}

export function updateHeroHotspot(
  hotspots: HeroHotspot[] = [],
  hotspotId: string,
  updates: Partial<HeroHotspot>,
): HeroHotspot[] {
  return hotspots.map((hotspot) =>
    hotspot.id === hotspotId ? { ...hotspot, ...updates } : hotspot,
  );
}

export function deleteHeroHotspot(
  hotspots: HeroHotspot[] = [],
  hotspotId: string,
): HeroHotspot[] {
  return hotspots.filter((hotspot) => hotspot.id !== hotspotId);
}
