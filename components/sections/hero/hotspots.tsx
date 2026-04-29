import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import type {
  HeroHotspot,
  HeroHotspotTarget,
} from "@/lib/hero/hero-layer-model";

interface HeroHotspotsProps {
  hotspots?: HeroHotspot[];
  target: HeroHotspotTarget;
  selectedHeroHotspotId?: string | null;
  openHotspotId: string | null;
  hoveredHotspotId: string | null;
  focusedHotspotId: string | null;
  setOpenHotspotId: Dispatch<SetStateAction<string | null>>;
  setHoveredHotspotId: Dispatch<SetStateAction<string | null>>;
  setFocusedHotspotId: Dispatch<SetStateAction<string | null>>;
}

export function HeroHotspots({
  hotspots = [],
  target,
  selectedHeroHotspotId,
  openHotspotId,
  hoveredHotspotId,
  focusedHotspotId,
  setOpenHotspotId,
  setHoveredHotspotId,
  setFocusedHotspotId,
}: HeroHotspotsProps) {
  const targetedHotspots = hotspots.filter(
    (hotspot) => (hotspot.target ?? "primary") === target,
  );
  if (targetedHotspots.length === 0) return null;

  return targetedHotspots.map((hotspot) => {
    const isOpen =
      openHotspotId === hotspot.id ||
      hoveredHotspotId === hotspot.id ||
      focusedHotspotId === hotspot.id;
    const detailsId = `hero-hotspot-details-${hotspot.id}`;

    return (
      <div
        key={hotspot.id}
        className="absolute z-50 h-0 w-0 pointer-events-auto"
        data-hero-hotspot-id={hotspot.id}
        data-hero-hotspot-stack="interactive"
        data-selected-hero-hotspot={
          selectedHeroHotspotId === hotspot.id ? "true" : undefined
        }
        style={{
          left: `${hotspot.x ?? 50}%`,
          top: `${hotspot.y ?? 50}%`,
          transform: "translate(-50%, -50%)",
        }}
        onMouseEnter={() => setHoveredHotspotId(hotspot.id)}
        onMouseLeave={(event) => {
          const relatedTarget = event.relatedTarget;
          if (
            relatedTarget instanceof Node &&
            event.currentTarget.contains(relatedTarget)
          ) {
            return;
          }
          setHoveredHotspotId(null);
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label={hotspot.label}
          aria-expanded={isOpen}
          aria-controls={detailsId}
          data-hero-hotspot-trigger="refined"
          data-hero-hotspot-size="compact-plus"
          className="relative flex h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-foreground shadow-md ring-1 ring-black/10 transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 md:h-4 md:w-4"
          onFocus={() => setFocusedHotspotId(hotspot.id)}
          onBlur={() => setFocusedHotspotId(null)}
          onClick={(event) => {
            event.stopPropagation();
            setOpenHotspotId((current) =>
              current === hotspot.id ? null : hotspot.id,
            );
          }}
        >
          <span
            data-testid={`hero-hotspot-pulse-${hotspot.id}`}
            data-hero-hotspot-pulse="subtle"
            className="absolute inset-[-3px] rounded-full border border-white/45 bg-white/15 opacity-75 motion-safe:animate-pulse"
          />
          <span
            data-testid={`hero-hotspot-plus-horizontal-${hotspot.id}`}
            data-hero-hotspot-plus-bar="horizontal"
            className="absolute h-0.5 w-2 rounded-full bg-primary md:w-2"
          />
          <span
            data-testid={`hero-hotspot-plus-vertical-${hotspot.id}`}
            data-hero-hotspot-plus-bar="vertical"
            className="absolute h-2 w-0.5 rounded-full bg-primary md:h-2"
          />
        </button>
        {isOpen && (
          <div
            id={detailsId}
            role="status"
            data-hero-hotspot-bubble="readable"
            data-hero-hotspot-bubble-position="floating"
            className="absolute bottom-full left-1/2 z-50 mb-3 w-60 -translate-x-1/2 rounded-[22px] border border-white/10 bg-gray-900/50 px-3 py-3 text-left text-white shadow-2xl backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs font-semibold">{hotspot.label}</p>
            {hotspot.description && (
              <p className="mt-1 text-[10px] leading-relaxed text-white/80">
                {hotspot.description}
              </p>
            )}
            {hotspot.href && (
              <Link
                href={hotspot.href}
                className="mt-2 inline-flex text-xs font-semibold text-white"
                onClick={(event) => event.stopPropagation()}
              >
                Ver detalle
              </Link>
            )}
          </div>
        )}
      </div>
    );
  });
}
