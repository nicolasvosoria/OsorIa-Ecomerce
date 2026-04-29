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

export type HeroStyleInput = Record<string, unknown> & {
  products?: unknown;
};

export interface HeroStylePayload extends Record<string, unknown> {
  layoutMode: HeroLayoutMode;
  imageFit: HeroImageFit;
  backgroundMode: HeroBackgroundMode;
  imagePositionX: HeroHorizontalPosition;
  imagePositionY: HeroVerticalPosition;
  fullImageContentAlign: HeroContentAlign;
  overlayColor: string;
  overlayOpacity: string;
  products: HeroSlideLayerFields[];
}

export type HeroSlideUpdateValue = string | number | HeroHotspot[];
export type HeroSlideUpdates = Partial<HeroSlideLayerFields>;
