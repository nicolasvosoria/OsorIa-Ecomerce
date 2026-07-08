import { useEffect, useRef } from "react";
import type { CarouselApi } from "@/components/ui/carousel";

interface UseHeroAutoplayOptions {
  /** When `false`, no auto-advance interval is scheduled at all. */
  enabled: boolean;
  /** Interval between auto-advances, in milliseconds. */
  intervalMs: number;
}

export function useHeroAutoplay(
  api: CarouselApi | undefined,
  { enabled, intervalMs }: UseHeroAutoplayOptions,
) {
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!api || !enabled) return;

    const startAutoplay = () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }

      autoplayRef.current = setInterval(() => {
        api.scrollNext();
      }, intervalMs);
    };

    startAutoplay();

    const handleSelect = () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }

      setTimeout(() => {
        startAutoplay();
      }, intervalMs);
    };

    api.on("select", handleSelect);

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
      api.off("select", handleSelect);
    };
  }, [api, enabled, intervalMs]);
}
