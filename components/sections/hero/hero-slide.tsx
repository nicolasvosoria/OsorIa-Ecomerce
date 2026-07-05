import type { Dispatch, SetStateAction } from "react";
import type {
  HeroBackgroundMode,
  HeroContentAlign,
  HeroImageFit,
  HeroLayerId,
  HeroSlideLayerFields,
} from "@/lib/hero/hero-layer-model";
import {
  HERO_FULL_IMAGE_PRODUCT_SIDE_CLASSES,
  HERO_FULL_IMAGE_STAGE_SIZE_CLASS,
  getContentCompositionStyle,
  getProductCompositionStyle,
  resolveHeroProductFrames,
} from "./hero-rendering";
import { HeroFullImageBackground } from "./hero-background";
import { HeroContentBlock } from "./hero-content-block";
import {
  HeroFeatureCallouts,
  type HeroProductFeature,
} from "./feature-callouts";
import { HeroProductFrame } from "./product-frame";
import {
  getHeroLayerAttributes,
  resolveFullImageAlignmentClasses,
  resolveHeroBackgroundObjectFit,
  resolveHeroSlideContent,
} from "./hero-view-model";

interface HeroHotspotInteractionProps {
  selectedHeroHotspotId?: string | null;
  openHotspotId: string | null;
  hoveredHotspotId: string | null;
  focusedHotspotId: string | null;
  setOpenHotspotId: Dispatch<SetStateAction<string | null>>;
  setHoveredHotspotId: Dispatch<SetStateAction<string | null>>;
  setFocusedHotspotId: Dispatch<SetStateAction<string | null>>;
}

interface HeroSlideProps extends HeroHotspotInteractionProps {
  slide: HeroSlideLayerFields;
  index: number;
  selectedHeroLayer?: HeroLayerId | null;
  layoutMode: "split" | "full-image";
  imageFit: HeroImageFit;
  backgroundMode: HeroBackgroundMode;
  fullImageContentAlign: HeroContentAlign;
  imagePosition: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  overlayColor: string;
  overlayOpacity: number;
  isDarkTheme: boolean;
  hasActiveTheme: boolean;
  onSelectFeature: (feature: HeroProductFeature) => void;
}

export function HeroSlide({
  slide,
  index,
  selectedHeroLayer,
  layoutMode,
  imageFit,
  backgroundMode,
  fullImageContentAlign,
  imagePosition,
  textColor,
  buttonColor,
  buttonTextColor,
  overlayColor,
  overlayOpacity,
  isDarkTheme,
  hasActiveTheme,
  onSelectFeature,
  ...hotspotProps
}: HeroSlideProps) {
  const content = resolveHeroSlideContent(slide, textColor);

  if (layoutMode === "full-image") {
    return (
      <HeroFullImageSlide
        slide={slide}
        index={index}
        selectedHeroLayer={selectedHeroLayer}
        imageFit={imageFit}
        backgroundMode={backgroundMode}
        fullImageContentAlign={fullImageContentAlign}
        imagePosition={imagePosition}
        content={content}
        buttonColor={buttonColor}
        buttonTextColor={buttonTextColor}
        overlayColor={overlayColor}
        overlayOpacity={overlayOpacity}
        {...hotspotProps}
      />
    );
  }

  return (
    <HeroSplitSlide
      slide={slide}
      index={index}
      selectedHeroLayer={selectedHeroLayer}
      content={content}
      buttonColor={buttonColor}
      buttonTextColor={buttonTextColor}
      splitBadgeBackground={resolveSplitBadgeBackground({
        hasActiveTheme,
        isDarkTheme,
      })}
      onSelectFeature={onSelectFeature}
      {...hotspotProps}
    />
  );
}

function HeroFullImageSlide({
  slide,
  index,
  selectedHeroLayer,
  imageFit,
  backgroundMode,
  fullImageContentAlign,
  imagePosition,
  content,
  buttonColor,
  buttonTextColor,
  overlayColor,
  overlayOpacity,
  ...hotspotProps
}: Omit<
  HeroSlideProps,
  | "layoutMode"
  | "textColor"
  | "isDarkTheme"
  | "hasActiveTheme"
  | "onSelectFeature"
> & {
  content: ReturnType<typeof resolveHeroSlideContent>;
}) {
  const isFirstSlide = index === 0;
  const alignment = resolveFullImageAlignmentClasses(fullImageContentAlign);
  const frames = resolveHeroProductFrames({
    slide,
    layoutMode: "full-image",
    contentAlign: fullImageContentAlign,
  });
  const primaryFrame = frames.find((frame) => frame.target === "primary");
  const secondaryFrame = frames.find((frame) => frame.target === "secondary");
  const secondaryPreset =
    slide.secondaryProductPreset ?? "primary-right-secondary-left";

  return (
    <div className={`relative w-full ${HERO_FULL_IMAGE_STAGE_SIZE_CLASS}`}>
      <div
        data-testid={isFirstSlide ? "hero-full-content-container" : undefined}
        data-hero-mobile-sizing="content-safe"
        className={`absolute inset-0 z-30 mx-auto flex w-full max-w-7xl items-start px-6 py-8 pointer-events-none md:h-full md:items-center md:px-10 md:py-12 lg:px-16 ${alignment.contentPositionClass}`}
      >
        <HeroContentBlock
          content={content}
          buttonColor={buttonColor}
          buttonTextColor={buttonTextColor}
          contentLayerAttributes={getHeroLayerAttributes(
            "content",
            selectedHeroLayer,
          )}
          ctaLayerAttributes={getHeroLayerAttributes(
            "cta",
            selectedHeroLayer,
          )}
          compositionStyle={getContentCompositionStyle(slide)}
          isFullImageLayout
          slideIndex={index}
          isFirstSlide={isFirstSlide}
          textAlignClass={alignment.textAlignClass}
          contentMaxWidthClass={alignment.contentMaxWidthClass}
        />
      </div>

      <HeroFullImageBackground
        backgroundMode={backgroundMode}
        displayImage={content.displayImage}
        displayTitle={content.displayTitle}
        objectFit={resolveHeroBackgroundObjectFit(backgroundMode, imageFit)}
        objectPosition={imagePosition}
        overlayColor={overlayColor}
        overlayOpacity={overlayOpacity}
        priority={isFirstSlide}
        backgroundLayerAttributes={getHeroLayerAttributes(
          "background",
          selectedHeroLayer,
        )}
        overlayLayerAttributes={getHeroLayerAttributes(
          "overlay",
          selectedHeroLayer,
        )}
      />
      {primaryFrame && (
        <div
          data-hero-stage="foreground"
          {...getHeroLayerAttributes("product", selectedHeroLayer)}
          data-testid={`hero-product-media-${index}`}
          data-product-placement={primaryFrame.placement}
          data-secondary-preset={secondaryFrame ? secondaryPreset : undefined}
          data-product-presence={content.productPresence}
          className="absolute inset-0 z-10 mx-auto max-w-7xl pointer-events-none"
        >
          <div
            className={`absolute inset-x-6 bottom-1 mx-auto flex max-w-xl items-end justify-center opacity-95 md:bottom-10 md:w-1/2 ${HERO_FULL_IMAGE_PRODUCT_SIDE_CLASSES[primaryFrame.placement]}`}
          >
            <HeroProductFrame
              src={primaryFrame.src}
              alt={primaryFrame.alt}
              width={primaryFrame.width}
              height={primaryFrame.height}
              imageClassName={primaryFrame.imageClassName}
              sizes={primaryFrame.sizes}
              priority={isFirstSlide}
              hotspots={slide.hotspots}
              frameTarget={primaryFrame.target}
              presence={content.productPresence}
              productCompositionStyle={getProductCompositionStyle(slide)}
              {...hotspotProps}
            />
          </div>
          {secondaryFrame && (
            <div
              data-hero-secondary-product="true"
              data-secondary-preset={secondaryPreset}
              className={`absolute inset-x-6 bottom-1 mx-auto hidden max-w-sm items-end justify-center opacity-90 md:flex md:bottom-10 md:w-1/3 ${HERO_FULL_IMAGE_PRODUCT_SIDE_CLASSES[secondaryFrame.placement]}`}
            >
              <HeroProductFrame
                src={secondaryFrame.src}
                alt={secondaryFrame.alt}
                width={secondaryFrame.width}
                height={secondaryFrame.height}
                imageClassName={secondaryFrame.imageClassName}
                sizes={secondaryFrame.sizes}
                priority={isFirstSlide}
                hotspots={slide.hotspots}
                frameTarget={secondaryFrame.target}
                presence={content.productPresence}
                productCompositionStyle={getProductCompositionStyle(slide)}
                {...hotspotProps}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HeroSplitSlide({
  slide,
  index,
  selectedHeroLayer,
  content,
  buttonColor,
  buttonTextColor,
  splitBadgeBackground,
  onSelectFeature,
  ...hotspotProps
}: Omit<
  HeroSlideProps,
  | "layoutMode"
  | "imageFit"
  | "backgroundMode"
  | "fullImageContentAlign"
  | "imagePosition"
  | "textColor"
  | "overlayColor"
  | "overlayOpacity"
  | "isDarkTheme"
  | "hasActiveTheme"
> & {
  content: ReturnType<typeof resolveHeroSlideContent>;
  splitBadgeBackground: string;
}) {
  return (
    <div className="container mx-auto px-4 md:px-8 py-8 pb-20 md:py-16 lg:py-24">
      <div className="grid lg:grid-cols-2 gap-6 md:gap-12 items-center">
        <HeroContentBlock
          content={content}
          buttonColor={buttonColor}
          buttonTextColor={buttonTextColor}
          compositionStyle={getContentCompositionStyle(slide)}
          isFullImageLayout={false}
          slideIndex={index}
          isFirstSlide={index === 0}
          splitBadgeBackground={splitBadgeBackground}
        />
        <div
          {...getHeroLayerAttributes("product", selectedHeroLayer)}
          data-testid={`hero-product-media-${index}`}
          data-product-placement={content.productPlacement}
          className={`relative h-[250px] md:h-[400px] lg:h-[500px] ${content.productMediaOrderClass}`}
        >
          <HeroProductFrame
            src={content.productMediaImage}
            alt={content.displayTitle || "Product image"}
            width={800}
            height={600}
            imageClassName="w-full h-full object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
            priority={index === 0}
            hotspots={slide.hotspots}
            frameTarget="primary"
            presence={content.productPresence}
            productCompositionStyle={getProductCompositionStyle(slide)}
            {...hotspotProps}
          />
          <HeroFeatureCallouts
            productTitle={content.displayTitle}
            onSelectFeature={onSelectFeature}
          />
        </div>
      </div>
    </div>
  );
}

function resolveSplitBadgeBackground({
  hasActiveTheme,
  isDarkTheme,
}: {
  hasActiveTheme: boolean;
  isDarkTheme: boolean;
}) {
  if (!hasActiveTheme) return "rgba(255, 255, 255, 0.2)";
  return isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.2)";
}
