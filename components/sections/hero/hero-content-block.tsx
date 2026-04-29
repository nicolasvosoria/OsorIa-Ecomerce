import Link from "next/link";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { toHeroProductSlug } from "./hero-rendering";
import type {
  HeroLayerAttributes,
  HeroSlideContentViewModel,
} from "./hero-view-model";

interface HeroContentBlockProps {
  content: HeroSlideContentViewModel;
  buttonColor: string;
  buttonTextColor: string;
  contentLayerAttributes?: HeroLayerAttributes;
  ctaLayerAttributes?: HeroLayerAttributes;
  compositionStyle: CSSProperties;
  isFullImageLayout: boolean;
  slideIndex: number;
  isFirstSlide: boolean;
  textAlignClass?: string;
  splitBadgeBackground?: string;
}

export function HeroContentBlock({
  content,
  buttonColor,
  buttonTextColor,
  contentLayerAttributes,
  ctaLayerAttributes,
  compositionStyle,
  isFullImageLayout,
  slideIndex,
  isFirstSlide,
  textAlignClass = "",
  splitBadgeBackground = "rgba(255, 255, 255, 0.2)",
}: HeroContentBlockProps) {
  if (isFullImageLayout) {
    return (
      <div
        {...contentLayerAttributes}
        className={`max-w-3xl space-y-4 pointer-events-auto md:space-y-6 md:[transform:translate(var(--hero-content-offset-x),var(--hero-content-offset-y))] ${textAlignClass}`}
        style={{
          ...compositionStyle,
          color: content.slideTextColor,
        }}
        data-testid={
          isFirstSlide ? "hero-full-content-block" : `hero-slide-content-${slideIndex}`
        }
        data-hero-text-size={content.textSize}
      >
        <HeroTextContent
          content={content}
          badgeBackground="rgba(255, 255, 255, 0.16)"
        />
        <div {...ctaLayerAttributes} className={`relative z-20 mt-6 ${textAlignClass}`}>
          <HeroCtaButton
            content={content}
            buttonColor={buttonColor}
            buttonTextColor={buttonTextColor}
            fullImage
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-4 md:space-y-6 text-center md:text-left"
      style={{
        ...compositionStyle,
        color: content.slideTextColor,
      }}
      data-testid={`hero-slide-content-${slideIndex}`}
      data-hero-text-size={content.textSize}
    >
      <HeroTextContent content={content} badgeBackground={splitBadgeBackground} split />
      <HeroCtaButton
        content={content}
        buttonColor={buttonColor}
        buttonTextColor={buttonTextColor}
      />
    </div>
  );
}

function HeroTextContent({
  content,
  badgeBackground,
  split = false,
}: {
  content: HeroSlideContentViewModel;
  badgeBackground: string;
  split?: boolean;
}) {
  return (
    <>
      <span
        className={
          split
            ? "inline-block rounded text-xs md:text-[14.21px] font-inter font-medium rounded-lg px-4 md:px-6 py-1"
            : "inline-block rounded-lg px-4 py-1 text-xs font-inter font-medium md:px-6 md:text-[14.21px]"
        }
        style={{ backgroundColor: badgeBackground }}
      >
        {content.displayLabel}
      </span>
      <div>
        <h1 className={`${content.titleSizeClass} font-inter font-medium tracking-tight leading-tight`}>
          {content.displayTitle}
        </h1>
        <h2 className="text-2xl md:text-4xl lg:text-[51px] font-inter font-light tracking-tight">
          {content.displaySubtitle}
        </h2>
      </div>
      <p
        className={
          split
            ? "text-sm md:text-[16px] font-inter font-medium max-w-md mx-auto md:mx-0 leading-relaxed"
            : "max-w-2xl text-sm font-inter font-medium leading-relaxed md:text-[16px]"
        }
        style={{ opacity: split ? 0.9 : 0.92 }}
      >
        {content.displayDescription}
      </p>
    </>
  );
}

function HeroCtaButton({
  content,
  buttonColor,
  buttonTextColor,
  fullImage = false,
}: {
  content: HeroSlideContentViewModel;
  buttonColor: string;
  buttonTextColor: string;
  fullImage?: boolean;
}) {
  return (
    <Button
      size="lg"
      className="text-sm md:text-[16px] font-inter font-medium rounded px-6 md:px-8 w-full md:w-auto transition-all duration-200 min-h-[44px] touch-manipulation mb-4 md:mb-0"
      style={{
        backgroundColor: buttonColor,
        color: buttonTextColor,
      }}
      onMouseEnter={
        fullImage
          ? undefined
          : (event) => {
              event.currentTarget.style.filter = "brightness(0.85)";
              event.currentTarget.style.transform = "scale(1.02)";
            }
      }
      onMouseLeave={
        fullImage
          ? undefined
          : (event) => {
              event.currentTarget.style.filter = "brightness(1)";
              event.currentTarget.style.transform = "scale(1)";
            }
      }
      asChild
    >
      <Link href={`/products/${toHeroProductSlug(content.displayTitle)}`}>
        {content.displayButtonText} →
      </Link>
    </Button>
  );
}
