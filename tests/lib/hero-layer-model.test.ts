import { describe, expect, it } from "vitest";
import {
  currentHeroPayload,
  legacyHeroPayload,
  malformedLegacyHeroPayload,
} from "@/tests/fixtures/hero";
import {
  DEFAULT_HERO_LAYER_MODEL,
  toFlatHeroVariables,
  toHeroLayerModel,
} from "@/lib/hero/hero-layer-model";

describe("hero layer model compatibility", () => {
  it("normalizes legacy flat hero payloads without requiring a schema migration", () => {
    const model = toHeroLayerModel(legacyHeroPayload);

    expect(model).toMatchObject({
      layoutMode: "full-image",
      imageFit: "contain",
      contentAlign: "right",
      overlayOpacity: 0.55,
    });
    expect(model.products[0]).toMatchObject({
      title: "PREMIUM",
      image: "/legacy-background.jpg",
      backgroundImage: "/legacy-background.jpg",
      textSize: "feature",
      productPlacement: "right",
      productPresence: "balanced",
      productScale: 100,
      hotspots: [],
    });
  });

  it("clamps malformed optional values while preserving editable slide meaning", () => {
    const model = toHeroLayerModel(malformedLegacyHeroPayload);

    expect(model).toMatchObject({
      layoutMode: DEFAULT_HERO_LAYER_MODEL.layoutMode,
      imageFit: DEFAULT_HERO_LAYER_MODEL.imageFit,
      backgroundMode: DEFAULT_HERO_LAYER_MODEL.backgroundMode,
      contentAlign: DEFAULT_HERO_LAYER_MODEL.contentAlign,
      overlayOpacity: 0.9,
    });
    expect(model.products[0]).toMatchObject({
      title: "PREMIUM",
      textSize: "feature",
      productPlacement: "right",
      productScale: 140,
      productOffsetX: -20,
      productOffsetY: 20,
      contentOffsetX: 16,
      contentOffsetY: -16,
      hotspots: [
        {
          id: "valid",
          label: "Visible",
          anchor: "center-left",
          x: 25,
          y: 50,
          target: "primary",
        },
      ],
    });
  });

  it("round-trips current layered payloads through flat-compatible save variables", () => {
    const model = toHeroLayerModel(currentHeroPayload);
    const flatPayload = toFlatHeroVariables(model);
    const reloadedModel = toHeroLayerModel(flatPayload);

    expect(flatPayload).toMatchObject({
      layoutMode: "full-image",
      fullImageContentAlign: "center",
      overlayColor: "#111827",
      overlayOpacity: "0.65",
      products: [
        expect.objectContaining({
          backgroundImage: "/layered-bg.jpg",
          productImage: "/primary.png",
          secondaryProductImage: "/secondary.png",
          secondaryProductPreset: "primary-left-secondary-right",
          hotspots: expect.arrayContaining([
            expect.objectContaining({ id: "driver", target: "primary" }),
            expect.objectContaining({ id: "secondary-chip", target: "secondary" }),
          ]),
        }),
      ],
    });
    expect(reloadedModel).toEqual(model);
  });
});
