"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/contexts/admin-context";
import { useComponentStyle } from "@/contexts/styles-context";
import { VisualProductCardImage } from "@/components/products/visual-product-card-image";
import { useHydratedProductCard } from "@/lib/products/use-hydrated-product-card";

export const SPECIAL_OFFER_DEFAULTS = {
  title: "Oferta Especial",
  productId: "",
  showcaseImage: "",
  endDate: "",
  description:
    "Una oferta por tiempo limitado configurada como referencia visual para paridad de staging.",
  countdownLabel: "La oferta termina en:",
  linkText: "Comprar ahora",
  bgColor: "",
  sectionBgColor: "",
  textColor: "",
  productBgColor: "",
  accentColor: "",
  claimedPercent: 32,
};

const COUNTDOWN_UNIT_LABELS = ["days", "hours", "minutes", "seconds"] as const;

const COUNTDOWN_PLACEHOLDER_VALUES: Record<
  (typeof COUNTDOWN_UNIT_LABELS)[number],
  string
> = { days: "--", hours: "--", minutes: "--", seconds: "--" };

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function padTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

// remainingMs ya llega sin negativos (la expiración se resuelve aparte).
function buildCountdownValues(remainingMs: number) {
  return {
    days: padTwoDigits(Math.floor(remainingMs / MS_PER_DAY)),
    hours: padTwoDigits(Math.floor((remainingMs % MS_PER_DAY) / MS_PER_HOUR)),
    minutes: padTwoDigits(
      Math.floor((remainingMs % MS_PER_HOUR) / MS_PER_MINUTE),
    ),
    seconds: padTwoDigits(
      Math.floor((remainingMs % MS_PER_MINUTE) / MS_PER_SECOND),
    ),
  };
}

export function SpecialOffer() {
  const { styles: styleData } = useComponentStyle(
    "specialOffer",
    SPECIAL_OFFER_DEFAULTS,
  );
  const { componentEdits, isEditMode } = useAdmin();
  const edits = componentEdits.get("specialOffer") || {};
  const offer = { ...SPECIAL_OFFER_DEFAULTS, ...styleData, ...edits };

  const sectionBg =
    offer.sectionBgColor ||
    "var(--sec-specialOffer-section-bg, var(--background))";
  const panelBg =
    offer.bgColor || "var(--sec-specialOffer-bg, var(--secondary))";
  const accentColor =
    offer.accentColor || "var(--sec-specialOffer-accent, var(--primary))";
  const productBg =
    offer.productBgColor || "var(--sec-specialOffer-product-bg, var(--muted))";
  const textColor =
    offer.textColor ||
    "var(--sec-specialOffer-text, var(--secondary-foreground))";
  // Translucent accents (badges, progress track, countdown chips) tint from the
  // panel's own text color so they keep contrast on any theme surface, instead
  // of assuming a dark panel with white overlays.
  const subtleAccentBg = "color-mix(in srgb, currentColor 12%, transparent)";
  const claimedPercent = Number.isFinite(Number(offer.claimedPercent))
    ? Math.min(Math.max(Number(offer.claimedPercent), 0), 100)
    : SPECIAL_OFFER_DEFAULTS.claimedPercent;

  const { card } = useHydratedProductCard(offer.productId);
  const originalPrice =
    card && card.price.hasDiscount ? (card.price.compareAtLabel ?? null) : null;

  // Reloj vivo: arranca en null para que el primer render del cliente
  // coincida con el del servidor (evita mismatch de hidratación) y recién
  // después del mount empieza a tickear cada segundo.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!offer.endDate) return;

    const tick = () => setNow(Date.now());
    const startId = setTimeout(tick, 0);
    const intervalId = setInterval(tick, 1000);
    return () => {
      clearTimeout(startId);
      clearInterval(intervalId);
    };
  }, [offer.endDate]);

  const deadlineMs = offer.endDate ? new Date(offer.endDate).getTime() : null;
  const remainingMs =
    deadlineMs !== null && now !== null ? deadlineMs - now : null;
  const isExpired = remainingMs !== null && remainingMs <= 0;
  const countdownValues =
    remainingMs !== null && !isExpired
      ? buildCountdownValues(remainingMs)
      : COUNTDOWN_PLACEHOLDER_VALUES;

  if (!card && !isEditMode) {
    return null;
  }

  return (
    <section
      data-component="specialOffer"
      style={{ backgroundColor: sectionBg }}
    >
      {/* Márgenes alineados con la sección Destacado (mx-2/md:mx-4). */}
      <div
        className="mx-2 my-3 overflow-hidden rounded-card p-4 md:mx-4 md:my-4 md:p-6 lg:p-8"
        style={{
          backgroundColor: panelBg,
          color: textColor,
        }}
      >
          <div className="mb-4 md:mb-6">
            {card?.category ? (
              <span
                className="mb-3 inline-block rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] opacity-80"
                style={{ backgroundColor: subtleAccentBg }}
              >
                {card.category}
              </span>
            ) : null}
            <h2 className="font-heading text-2xl font-normal leading-tight md:text-4xl">
              {offer.title}
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 md:items-center md:gap-6 lg:gap-8">
            <div
              className="relative flex min-h-[180px] items-center justify-center rounded-card p-4 md:min-h-[240px]"
              style={{ backgroundColor: productBg }}
            >
              <VisualProductCardImage
                src={offer.showcaseImage || card?.imageUrl}
                alt={card?.title ?? "Producto de oferta sin elegir"}
                title={card?.title ?? "Producto de oferta sin elegir"}
                isOverlay={false}
              />
            </div>

            <div className="flex flex-col gap-4">
              {card ? (
                <div>
                  <h3 className="mb-2 text-2xl font-semibold tracking-tight md:text-3xl lg:text-4xl">
                    {card.title}
                  </h3>
                  <div className="flex flex-wrap items-baseline gap-3">
                    {originalPrice ? (
                      <span className="text-base opacity-60 line-through">
                        {originalPrice}
                      </span>
                    ) : null}
                    <span
                      className="text-2xl font-bold md:text-3xl"
                      style={{ color: accentColor }}
                    >
                      {card.price.label}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm opacity-70 md:text-base">
                  Selecciona un producto del catálogo para mostrarlo aquí
                </p>
              )}

              <p className="text-sm leading-relaxed opacity-70 md:text-base">
                {offer.description}
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-semibold uppercase tracking-wide">
                  <span>Ya reclamado</span>
                  <span>{claimedPercent}%</span>
                </div>
                <div
                  className="h-0.5 w-full"
                  style={{ backgroundColor: subtleAccentBg }}
                >
                  <div
                    className="h-0.5"
                    style={{
                      width: `${claimedPercent}%`,
                      backgroundColor: accentColor,
                    }}
                  />
                </div>
              </div>

              {offer.endDate ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold opacity-70">
                    {offer.countdownLabel}
                  </p>
                  {isExpired ? (
                    <p className="text-base font-semibold">Oferta finalizada</p>
                  ) : (
                    <div className="flex flex-wrap items-start gap-2">
                      {COUNTDOWN_UNIT_LABELS.map((label, index) => (
                        <Fragment key={label}>
                          {index > 0 ? (
                            <span className="px-1 pt-2 text-xl font-semibold opacity-40">
                              :
                            </span>
                          ) : null}
                          <span
                            className="rounded-lg px-3 py-2 text-center"
                            style={{ backgroundColor: subtleAccentBg }}
                          >
                            <span className="block text-xl font-semibold">
                              {countdownValues[label]}
                            </span>
                            <span className="text-[10px] uppercase tracking-wide opacity-60">
                              {label}
                            </span>
                          </span>
                        </Fragment>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {card && !isExpired ? (
                <Button
                  asChild
                  className="w-fit rounded-[var(--button-radius)] px-8"
                  style={{ backgroundColor: accentColor }}
                >
                  <Link href={card.href}>
                    {offer.linkText} <span aria-hidden>→</span>
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
    </section>
  );
}
