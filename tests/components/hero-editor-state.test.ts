import { describe, expect, it } from "vitest";
import { currentHeroSlide, legacyHeroSlide } from "@/tests/fixtures/hero";
import {
  addHeroSlide,
  createHeroHotspotDraft,
  deleteHeroHotspot,
  deleteHeroSlide,
  getActiveHeroSlideIndex,
  updateHeroHotspot,
  updateHeroSlide,
} from "@/components/admin/hero-editor/hero-editor-state";

describe("hero editor state helpers", () => {
  it("keeps active slide selection bounded when slides are added or deleted", () => {
    const slides = [legacyHeroSlide, currentHeroSlide];

    expect(getActiveHeroSlideIndex(slides, -2)).toBe(0);
    expect(getActiveHeroSlideIndex(slides, 8)).toBe(1);

    const added = addHeroSlide(slides);
    expect(added.products).toHaveLength(3);
    expect(added.products[2]).toMatchObject({
      title: "Slide 3",
      productPresence: "balanced",
      productScale: 100,
      hotspots: [],
    });
    expect(added.nextSlideIndex).toBe(2);
    expect(added.nextHotspotId).toBeNull();

    const deleted = deleteHeroSlide(added.products, 2);
    expect(deleted.products).toEqual(slides);
    expect(deleted.nextSlideIndex).toBe(1);
    expect(deleted.nextHotspotId).toBeNull();
  });

  it("updates only the selected slide while preserving normalized compatibility fields", () => {
    const slides = [legacyHeroSlide, currentHeroSlide];
    const updated = updateHeroSlide(slides, 1, { title: "EDITADO" });

    expect(updated[0]).toMatchObject({
      title: "PREMIUM",
      backgroundImage: "/legacy-background.jpg",
    });
    expect(updated[1]).toMatchObject({
      title: "EDITADO",
      backgroundImage: "/layered-bg.jpg",
      productImage: "/primary.png",
    });
  });

  it("creates deterministic hotspot drafts and edits/deletes one hotspot by id", () => {
    const draft = createHeroHotspotDraft(currentHeroSlide.hotspots ?? []);
    expect(draft).toMatchObject({
      id: "hotspot-1",
      label: "Nuevo hotspot",
      anchor: "center-right",
      x: 75,
      y: 50,
      target: "primary",
    });

    const edited = updateHeroHotspot(
      [...(currentHeroSlide.hotspots ?? []), draft],
      "driver",
      { label: "Confort", target: "secondary" },
    );
    expect(edited).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "driver",
          label: "Confort",
          target: "secondary",
        }),
        expect.objectContaining({ id: "hotspot-1", label: "Nuevo hotspot" }),
      ]),
    );

    expect(deleteHeroHotspot(edited, "driver")).toEqual([
      expect.objectContaining({ id: "secondary-chip" }),
      expect.objectContaining({ id: "hotspot-1" }),
    ]);
  });
});
