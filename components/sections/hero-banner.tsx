"use client";

import { useState } from "react";
import { useAdmin } from "@/contexts/admin-context";
import { useComponentStyle } from "@/contexts/styles-context";
import { useTheme } from "@/contexts/theme-context";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  toHeroLayerModel,
  type HeroStyleInput,
} from "@/lib/hero/hero-layer-model";
import { HeroFeatureDialog, type HeroProductFeature } from "./hero/feature-callouts";
import { getHeroBackgroundGradient } from "./hero/hero-rendering";
import { HeroSlide } from "./hero/hero-slide";
import { useHeroAutoplay } from "./hero/use-hero-autoplay";
import { resolveHeroColors, resolveHeroShellProps } from "./hero/hero-view-model";

const HERO_STYLE_FALLBACKS = {
  label: "Electronics",
  title: "BALFE",
  subtitle: "NUEVO MODELO",
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua",
  buttonText: "Comprar ahora",
} satisfies HeroStyleInput;

export function HeroBanner() {
  const { activeTheme } = useTheme();
  const { styles: styleData } = useComponentStyle("hero", HERO_STYLE_FALLBACKS);
  const {
    componentEdits,
    selectedHeroLayer,
    selectedHeroSlideIndex = 0,
    selectedHeroHotspotId = null,
  } = useAdmin();
  const [api, setApi] = useState<CarouselApi>();
  const [selectedFeature, setSelectedFeature] = useState<HeroProductFeature | null>(null);
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);
  const [openHotspotId, setOpenHotspotId] = useState<string | null>(null);
  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null);
  const [focusedHotspotId, setFocusedHotspotId] = useState<string | null>(null);

  useHeroAutoplay(api);

  const edits = (componentEdits.get("hero") ?? {}) as HeroStyleInput;
  const heroLayerModel = toHeroLayerModel({ ...styleData, ...edits });
  const colors = resolveHeroColors({ activeTheme, styleData, edits });
  const shellProps = resolveHeroShellProps(
    heroLayerModel.layoutMode,
    heroLayerModel.backgroundMode,
  );
  const fullImageObjectPosition = `${heroLayerModel.imagePositionX} ${heroLayerModel.imagePositionY}`;

  const handleSelectFeature = (feature: HeroProductFeature) => {
    setSelectedFeature(feature);
    setIsFeatureDialogOpen(true);
  };

  return (
    <section
      data-component="hero"
      data-hero-layout={shellProps.layout}
      data-hero-viewport-shell={shellProps.viewportShell}
      data-hero-background-mode={shellProps.backgroundMode}
      data-hero-side-gutters={shellProps.sideGutters}
      onClick={() => setOpenHotspotId(null)}
      className={shellProps.className}
      style={{
        backgroundColor: colors.bgColor,
        color: colors.textColor,
      }}
    >
      <Carousel opts={{ align: "start", loop: true }} setApi={setApi} className="w-full">
        <CarouselContent>
          {heroLayerModel.products.map((slide, index) => (
            <CarouselItem
              key={index}
              className="basis-full"
              data-selected-hero-slide={
                selectedHeroSlideIndex === index ? "true" : undefined
              }
            >
              <HeroSlide
                slide={slide}
                index={index}
                selectedHeroLayer={selectedHeroLayer}
                layoutMode={heroLayerModel.layoutMode}
                imageFit={heroLayerModel.imageFit}
                backgroundMode={heroLayerModel.backgroundMode}
                fullImageContentAlign={heroLayerModel.contentAlign}
                imagePosition={fullImageObjectPosition}
                textColor={colors.textColor}
                buttonColor={colors.buttonColor}
                buttonTextColor={colors.buttonTextColor}
                overlayColor={heroLayerModel.overlayColor}
                overlayOpacity={heroLayerModel.overlayOpacity}
                isDarkTheme={colors.isDarkTheme}
                hasActiveTheme={Boolean(activeTheme)}
                selectedHeroHotspotId={selectedHeroHotspotId}
                openHotspotId={openHotspotId}
                hoveredHotspotId={hoveredHotspotId}
                focusedHotspotId={focusedHotspotId}
                setOpenHotspotId={setOpenHotspotId}
                setHoveredHotspotId={setHoveredHotspotId}
                setFocusedHotspotId={setFocusedHotspotId}
                onSelectFeature={handleSelectFeature}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {heroLayerModel.layoutMode !== "full-image" && (
        <div
          data-testid="hero-bottom-bar"
          className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{
            background: getHeroBackgroundGradient({
              barColor: colors.barColor,
              accentColor: colors.accentColor,
              secondaryColor: colors.secondaryColor,
            }),
          }}
        />
      )}

      <HeroFeatureDialog
        feature={selectedFeature}
        open={isFeatureDialogOpen}
        onOpenChange={setIsFeatureDialogOpen}
      />
    </section>
  );
}
