import { useEffect, useRef } from "react";
import type { CarouselApi } from "@/components/ui/carousel";

const HERO_AUTOPLAY_INTERVAL_MS = 10000;

export function useHeroAutoplay(api: CarouselApi | undefined) {
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!api) return;

    const startAutoplay = () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }

      autoplayRef.current = setInterval(() => {
        api.scrollNext();
      }, HERO_AUTOPLAY_INTERVAL_MS);
    };

    startAutoplay();

    const handleSelect = () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }

      setTimeout(() => {
        startAutoplay();
      }, HERO_AUTOPLAY_INTERVAL_MS);
    };

    api.on("select", handleSelect);

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
      api.off("select", handleSelect);
    };
  }, [api]);
}
