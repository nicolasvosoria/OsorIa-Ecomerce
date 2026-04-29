import Image from "next/image";
import type { CSSProperties } from "react";
import type { HeroBackgroundMode } from "@/lib/hero/hero-layer-model";
import type { HeroLayerAttributes } from "./hero-view-model";

export function HeroFullImageBackground({
  backgroundMode,
  displayImage,
  displayTitle,
  objectFit,
  objectPosition,
  overlayColor,
  overlayOpacity,
  priority,
  backgroundLayerAttributes,
  overlayLayerAttributes,
}: {
  backgroundMode: HeroBackgroundMode;
  displayImage: string;
  displayTitle: string;
  objectFit: CSSProperties["objectFit"];
  objectPosition: string;
  overlayColor: string;
  overlayOpacity: number;
  priority: boolean;
  backgroundLayerAttributes: HeroLayerAttributes;
  overlayLayerAttributes: HeroLayerAttributes;
}) {
  const backgroundImage = (
    <Image
      {...backgroundLayerAttributes}
      data-testid={priority ? "hero-full-background-image" : undefined}
      data-hero-background-fit={backgroundMode}
      src={displayImage}
      alt={displayTitle || "Hero background image"}
      fill
      style={{
        objectFit,
        objectPosition,
      }}
      sizes="100vw"
      priority={priority}
    />
  );

  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none"
      data-hero-background-shell={backgroundMode}
    >
      {backgroundMode === "stage" ? (
        <div data-hero-background-stage="contained" className="relative mx-auto h-full">
          {backgroundImage}
        </div>
      ) : (
        backgroundImage
      )}
      <div
        {...overlayLayerAttributes}
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          backgroundColor: overlayColor,
          opacity: overlayOpacity,
        }}
      />
    </div>
  );
}
