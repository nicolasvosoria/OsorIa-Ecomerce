import Image from "next/image";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import type {
  HeroHotspot,
  HeroHotspotTarget,
  HeroProductPresence,
} from "@/lib/hero/hero-layer-model";
import { HERO_PRODUCT_PRESENCE_FRAME_CLASSES } from "./hero-rendering";
import { HeroHotspots } from "./hotspots";

interface HeroProductFrameProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  priority: boolean;
  imageClassName: string;
  hotspots?: HeroHotspot[];
  frameTarget: HeroHotspotTarget;
  presence: HeroProductPresence;
  productCompositionStyle: CSSProperties;
  selectedHeroHotspotId?: string | null;
  openHotspotId: string | null;
  hoveredHotspotId: string | null;
  focusedHotspotId: string | null;
  setOpenHotspotId: Dispatch<SetStateAction<string | null>>;
  setHoveredHotspotId: Dispatch<SetStateAction<string | null>>;
  setFocusedHotspotId: Dispatch<SetStateAction<string | null>>;
}

export function HeroProductFrame({
  src,
  alt,
  width,
  height,
  sizes,
  priority,
  imageClassName,
  hotspots,
  frameTarget,
  presence,
  productCompositionStyle,
  selectedHeroHotspotId,
  openHotspotId,
  hoveredHotspotId,
  focusedHotspotId,
  setOpenHotspotId,
  setHoveredHotspotId,
  setFocusedHotspotId,
}: HeroProductFrameProps) {
  return (
    <div
      data-hero-product-frame={frameTarget}
      data-product-presence={presence}
      className={`relative inline-flex max-w-full items-center justify-center pointer-events-none transition-transform md:[transform:translate(var(--hero-product-offset-x),var(--hero-product-offset-y))_scale(var(--hero-product-scale))] ${HERO_PRODUCT_PRESENCE_FRAME_CLASSES[presence]}`}
      style={productCompositionStyle}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={imageClassName}
        sizes={sizes}
        priority={priority}
      />
      <HeroHotspots
        hotspots={hotspots}
        target={frameTarget}
        selectedHeroHotspotId={selectedHeroHotspotId}
        openHotspotId={openHotspotId}
        hoveredHotspotId={hoveredHotspotId}
        focusedHotspotId={focusedHotspotId}
        setOpenHotspotId={setOpenHotspotId}
        setHoveredHotspotId={setHoveredHotspotId}
        setFocusedHotspotId={setFocusedHotspotId}
      />
    </div>
  );
}
