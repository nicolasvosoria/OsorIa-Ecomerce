import { describe, expect, it } from "vitest";
import { currentHeroSlide, legacyHeroSlide } from "@/tests/fixtures/hero";
import {
  getContentCompositionStyle,
  getHeroBackgroundGradient,
  getProductCompositionStyle,
  isDarkHeroTheme,
  resolveHeroProductFrames,
  toHeroProductSlug,
} from "@/components/sections/hero/hero-rendering";
import {
  getHeroLayerAttributes,
  resolveFullImageAlignmentClasses,
  resolveHeroColors,
  resolveHeroShellProps,
  resolveHeroSlideContent,
} from "@/components/sections/hero/hero-view-model";

describe("hero rendering helpers", () => {
  it("keeps product slugs and theme darkness decisions equivalent", () => {
    expect(toHeroProductSlug("Mini Proyector Ñandú 4K")).toBe(
      "mini-proyector-nandu-4k",
    );
    expect(isDarkHeroTheme({ theme_name: "Modo Oscuro", colors: { background: "#ffffff" } })).toBe(true);
    expect(isDarkHeroTheme({ theme_name: "Claro", colors: { background: "#101010" } })).toBe(true);
    expect(isDarkHeroTheme({ theme_name: "Claro", colors: { background: "#fefefe" } })).toBe(false);
  });

  it("returns CSS variables for desktop-bounded product and content composition", () => {
    expect(getProductCompositionStyle(currentHeroSlide)).toEqual({
      "--hero-product-scale": "0.92",
      "--hero-product-offset-x": "-12%",
      "--hero-product-offset-y": "8%",
    });
    expect(getContentCompositionStyle(currentHeroSlide)).toEqual({
      "--hero-content-offset-x": "7%",
      "--hero-content-offset-y": "-6%",
    });

    expect(getProductCompositionStyle(legacyHeroSlide)).toEqual({
      "--hero-product-scale": "1",
      "--hero-product-offset-x": "0%",
      "--hero-product-offset-y": "0%",
    });
  });

  it("resolves primary and secondary product frames without inventing hidden media", () => {
    expect(
      resolveHeroProductFrames({
        slide: currentHeroSlide,
        layoutMode: "full-image",
        contentAlign: "center",
      }),
    ).toEqual([
      expect.objectContaining({ target: "primary", src: "/primary.png", placement: "left" }),
      expect.objectContaining({ target: "secondary", src: "/secondary.png", placement: "right" }),
    ]);

    expect(
      resolveHeroProductFrames({
        slide: currentHeroSlide,
        layoutMode: "split",
        contentAlign: "left",
      }),
    ).toEqual([
      expect.objectContaining({ target: "primary", src: "/primary.png", placement: "left" }),
    ]);
  });

  it("keeps split background gradient fallbacks compatible with theme colors", () => {
    expect(getHeroBackgroundGradient({ accentColor: "#005aa1", secondaryColor: "#c4faff" })).toBe(
      "linear-gradient(to bottom, rgba(0, 90, 161, 0.8), rgba(196, 250, 255, 0.6))",
    );
    expect(
      getHeroBackgroundGradient({
        barColor: "bad",
        accentColor: "#005aa1",
        secondaryColor: "#c4faff",
      }),
    ).toBe("linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.4))");
  });

  it("resolves theme/edit colors and shell attributes without leaking renderer state into HeroBanner", () => {
    expect(
      resolveHeroColors({
        activeTheme: {
          theme_name: "Claro",
          colors: {
            background: "#ffffff",
            accent: "#005aa1",
            secondary: "#c4faff",
          },
        },
        styleData: {
          bgColor: "#101828",
          textColor: "#f8fafc",
          buttonColor: "#0ea5e9",
          buttonTextColor: "#082f49",
          barColor: "#123456",
        },
        edits: {
          textColor: "#ffffff",
          buttonColor: "#f97316",
        },
      }),
    ).toEqual({
      bgColor: "#101828",
      textColor: "#ffffff",
      buttonColor: "#f97316",
      buttonTextColor: "#082f49",
      barColor: "#123456",
      accentColor: "#005aa1",
      secondaryColor: "#c4faff",
      isDarkTheme: false,
    });

    expect(resolveHeroShellProps("full-image", "fill")).toEqual({
      layout: "full-image",
      viewportShell: "full-image",
      backgroundMode: "fill",
      sideGutters: "24px",
      className:
        "container relative mx-6 w-auto max-w-none overflow-hidden rounded-2xl md:rounded-3xl mt-2 md:mt-4 mb-4 md:mb-8",
    });
  });

  it("resolves slide copy/media and layer selection attributes for both layout branches", () => {
    expect(resolveHeroSlideContent(currentHeroSlide, "#ffffff")).toEqual(
      expect.objectContaining({
        displayLabel: "Audio",
        displayTitle: "HERO ACTUAL",
        displaySubtitle: "CAPAS",
        displayDescription: "Hero con capas actuales",
        displayButtonText: "Ver oferta",
        displayImage: "/layered-bg.jpg",
        productMediaImage: "/primary.png",
        slideTextColor: "#22cc88",
        titleSizeClass: "text-4xl md:text-6xl lg:text-7xl",
        productPresence: "subtle",
        productPlacement: "left",
        productMediaOrderClass: "order-first",
      }),
    );

    expect(resolveFullImageAlignmentClasses("right")).toEqual({
      contentPositionClass: "justify-end",
      textAlignClass: "text-right",
    });

    expect(getHeroLayerAttributes("product", "product")).toEqual({
      "data-hero-layer": "product",
      "data-selected-hero-layer": "true",
    });
    expect(getHeroLayerAttributes("content", "product")).toEqual({
      "data-hero-layer": "content",
      "data-selected-hero-layer": undefined,
    });
  });
});
