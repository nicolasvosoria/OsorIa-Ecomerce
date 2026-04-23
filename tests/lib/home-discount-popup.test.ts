import { describe, expect, it } from "vitest";

import {
  getHomeDiscountPopupStorageKey,
  isHomeDiscountPopupEligible,
  normalizeHomeDiscountPopupConfig,
} from "@/lib/home-discount-popup";

describe("normalizeHomeDiscountPopupConfig", () => {
  it("applies defaults, sanitizes invalid fields, and keeps supported values", () => {
    const config = normalizeHomeDiscountPopupConfig({
      active: true,
      title: "Oferta relampago",
      text: "Solo por hoy",
      imageUrl: "https://cdn.example.com/popup.png",
      ctaText: "Copiar cupon",
      ctaUrl: "javascript:alert(1)",
      coupon: "HOME10",
      delayMs: -10,
      frequencyHours: 0,
      visibleDurationMs: -100,
      ctaMode: "invalid-mode",
      startsAt: "2026-04-23T10:00:00.000Z",
      endsAt: "2026-04-30T10:00:00.000Z",
    });

    expect(config).toMatchObject({
      active: true,
      title: "Oferta relampago",
      text: "Solo por hoy",
      imageUrl: "https://cdn.example.com/popup.png",
      ctaText: "Copiar cupon",
      ctaUrl: null,
      coupon: "HOME10",
      delayMs: 4000,
      frequencyHours: 24,
      visibleDurationMs: 15000,
      ctaMode: "copy_coupon",
      startsAt: "2026-04-23T10:00:00.000Z",
      endsAt: "2026-04-30T10:00:00.000Z",
    });
  });
});

describe("isHomeDiscountPopupEligible", () => {
  const config = normalizeHomeDiscountPopupConfig({
    active: true,
    title: "Oferta",
    text: "Texto",
    ctaText: "Ver oferta",
    ctaUrl: "https://example.com/sale",
    ctaMode: "redirect",
    coupon: "HOME10",
    startsAt: "2026-04-23T10:00:00.000Z",
    endsAt: "2026-04-24T10:00:00.000Z",
    frequencyHours: 24,
  });

  it("returns eligible only on home route within validity window and after cooldown", () => {
    const fingerprint = "home10-2026";
    const storageKey = getHomeDiscountPopupStorageKey("store-123", fingerprint);

    const eligible = isHomeDiscountPopupEligible({
      config,
      pathname: "/",
      now: new Date("2026-04-23T12:00:00.000Z"),
      storageKey,
      storageSnapshot: {},
    });

    const withinCooldown = isHomeDiscountPopupEligible({
      config,
      pathname: "/",
      now: new Date("2026-04-23T12:00:00.000Z"),
      storageKey,
      storageSnapshot: {
        [storageKey]: JSON.stringify({
          dismissedAt: "2026-04-23T11:30:00.000Z",
        }),
      },
    });

    const wrongRoute = isHomeDiscountPopupEligible({
      config,
      pathname: "/products/cafetera",
      now: new Date("2026-04-23T12:00:00.000Z"),
      storageKey,
      storageSnapshot: {},
    });

    const expired = isHomeDiscountPopupEligible({
      config,
      pathname: "/",
      now: new Date("2026-04-25T12:00:00.000Z"),
      storageKey,
      storageSnapshot: {},
    });

    expect(eligible).toMatchObject({ eligible: true });
    expect(withinCooldown).toMatchObject({
      eligible: false,
      reason: "cooldown",
    });
    expect(wrongRoute).toMatchObject({ eligible: false, reason: "route" });
    expect(expired).toMatchObject({ eligible: false, reason: "schedule" });
  });
});

describe("getHomeDiscountPopupStorageKey", () => {
  it("namespaces the key by store and popup fingerprint", () => {
    expect(getHomeDiscountPopupStorageKey("store-123", "fingerprint-abc")).toBe(
      "osoria.homeDiscountPopup.store-123.fingerprint-abc",
    );
  });
});
