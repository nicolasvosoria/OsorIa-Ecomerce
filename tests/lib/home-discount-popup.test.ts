import { describe, expect, it } from "vitest";

import {
  loadHomeDiscountPopupConfig,
  saveHomeDiscountPopupConfig,
} from "@/app/api/home-discount-popup-config/route";

import {
  getHomeDiscountPopupStorageKey,
  isHomeDiscountPopupEligible,
  normalizeHomeDiscountPopupConfig,
  parseDateTimeLocalValue,
  projectPublicHomeDiscountPopupConfig,
  toDateTimeLocalValue,
} from "@/lib/home-discount-popup";

describe("normalizeHomeDiscountPopupConfig", () => {
  it("applies defaults, sanitizes invalid fields, normalizes legacy milliseconds, and keeps supported values", () => {
    const config = normalizeHomeDiscountPopupConfig({
      active: true,
      title: "Oferta relampago",
      text: "Solo por hoy",
      imageUrl: "https://cdn.example.com/popup.png",
      ctaText: "Copiar cupon",
      ctaUrl: "javascript:alert(1)",
      coupon: "HOME10",
      delayMs: 4500,
      frequencyHours: 0,
      visibleDurationMs: 18000,
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
      delaySeconds: 5,
      frequencyHours: 24,
      visibleDurationSeconds: 18,
      ctaMode: "copy_coupon",
      startsAt: "2026-04-23T10:00:00.000Z",
      endsAt: "2026-04-30T10:00:00.000Z",
    });
  });

  it("prefers seconds fields when both seconds and legacy milliseconds exist", () => {
    const config = normalizeHomeDiscountPopupConfig({
      delaySeconds: 4,
      delayMs: 5000,
      visibleDurationSeconds: 12,
      visibleDurationMs: 18000,
    });

    expect(config.delaySeconds).toBe(4);
    expect(config.visibleDurationSeconds).toBe(12);
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
    delaySeconds: 4,
    visibleDurationSeconds: 15,
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

describe("datetime-local helpers", () => {
  it("formats stored ISO strings using local wall-clock values", () => {
    expect(toDateTimeLocalValue("2026-04-23T10:45:00.000Z")).toBe(
      "2026-04-23T10:45",
    );
  });

  it("parses datetime-local input back to ISO", () => {
    expect(parseDateTimeLocalValue("2026-04-23T10:45")).toBe(
      "2026-04-23T10:45:00.000Z",
    );
  });
});

describe("projectPublicHomeDiscountPopupConfig", () => {
  it("rejects active configs with empty CTA text", () => {
    expect(
      projectPublicHomeDiscountPopupConfig({
        active: true,
        title: "Oferta",
        text: "Texto",
        ctaText: "   ",
        coupon: "HOME10",
        ctaMode: "copy_coupon",
      }),
    ).toBeNull();
  });
});

function createTableQuery(result: { data: unknown; error: unknown }) {
  return {
    select: () => createTableQuery(result),
    eq: () => createTableQuery(result),
    is: () => createTableQuery(result),
    maybeSingle: async () => result,
    single: async () => result,
    upsert: async () => ({ error: null }),
  };
}

describe("home discount popup persistence", () => {
  it("reads popup config from store_integrations metadata and falls back when the row is missing", async () => {
    const storesQuery = createTableQuery({
      data: { id: "store-123" },
      error: null,
    });
    const integrationsQuery = createTableQuery({
      data: null,
      error: null,
    });
    const client = {
      from: (table: string) => {
        if (table === "stores") {
          return storesQuery;
        }

        if (table === "store_integrations") {
          return integrationsQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      },
    };

    const result = await loadHomeDiscountPopupConfig(client as any, "default");

    expect(result.storeId).toBe("store-123");
    expect(result.config.delaySeconds).toBe(4);
    expect(result.config.visibleDurationSeconds).toBe(15);
  });

  it("upserts popup config into store_integrations metadata when the integration row does not exist", async () => {
    let upsertPayload: Record<string, unknown> | null = null;
    const storesQuery = createTableQuery({
      data: { id: "store-123" },
      error: null,
    });
    const integrationsQuery = {
      ...createTableQuery({ data: null, error: null }),
      upsert: async (values: Record<string, unknown>) => {
        upsertPayload = values;
        return { error: null };
      },
    };
    const client = {
      from: (table: string) => {
        if (table === "stores") {
          return storesQuery;
        }

        if (table === "store_integrations") {
          return integrationsQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      },
    };

    const result = await saveHomeDiscountPopupConfig(client as any, "default", {
      active: true,
      title: "Promo home",
      text: "Texto",
      ctaText: "Copiar cupon",
      coupon: "HOME10",
      ctaMode: "copy_coupon",
      delaySeconds: 5,
      visibleDurationSeconds: 18,
    });

    expect(result.config.delaySeconds).toBe(5);
    expect(result.config.visibleDurationSeconds).toBe(18);
    expect(upsertPayload).toMatchObject({
      store_id: "store-123",
      metadata: {
        homeDiscountPopup: {
          delaySeconds: 5,
          visibleDurationSeconds: 18,
        },
      },
    });
  });
});

describe("getHomeDiscountPopupStorageKey", () => {
  it("namespaces the key by store and popup fingerprint", () => {
    expect(getHomeDiscountPopupStorageKey("store-123", "fingerprint-abc")).toBe(
      "osoria.homeDiscountPopup.store-123.fingerprint-abc",
    );
  });
});
