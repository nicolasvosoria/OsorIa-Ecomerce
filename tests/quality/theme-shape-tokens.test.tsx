/** @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyRuntimeTheme } from "@/lib/theme-font/bootstrap";
import { DEFAULT_RUNTIME_THEME } from "@/lib/theme-font/runtime-contract";
import { DEFAULT_THEME_TOKENS } from "@/lib/theme-font/theme-definition";
import { VisualProductCard } from "@/components/products/visual-product-card";
import type { CommerceProductCard } from "@/lib/types/products";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("applyRuntimeTheme shape/shadow tokens (identical-by-default)", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("style");
  });

  it("writes --radius, --button-radius, --card-radius and --shadow-* for the default theme", () => {
    applyRuntimeTheme(DEFAULT_RUNTIME_THEME, "light");

    const root = document.documentElement.style;
    expect(root.getPropertyValue("--radius")).toBe(
      DEFAULT_THEME_TOKENS.radius.base,
    );
    expect(root.getPropertyValue("--button-radius")).toBe(
      DEFAULT_THEME_TOKENS.shape.button,
    );
    expect(root.getPropertyValue("--card-radius")).toBe(
      DEFAULT_THEME_TOKENS.shape.card,
    );
    expect(root.getPropertyValue("--shadow-card")).toBe(
      DEFAULT_THEME_TOKENS.shadow.card,
    );
    expect(root.getPropertyValue("--shadow-elevated")).toBe(
      DEFAULT_THEME_TOKENS.shadow.elevated,
    );

    // The values that matter for VisualProductCard's identical-by-default guarantee.
    expect(root.getPropertyValue("--radius")).toBe("0.5rem");
    expect(root.getPropertyValue("--button-radius")).toBe("var(--radius)");
    expect(root.getPropertyValue("--card-radius")).toBe("1.5rem");
    expect(root.getPropertyValue("--shadow-card")).toBe("none");
  });

  it("falls back to the current defaults when a theme omits radius/shape/shadow", () => {
    const legacyTheme = {
      ...DEFAULT_RUNTIME_THEME,
      radius: undefined,
      shape: undefined,
      shadow: undefined,
    };

    applyRuntimeTheme(legacyTheme, "light");

    const root = document.documentElement.style;
    expect(root.getPropertyValue("--radius")).toBe("0.5rem");
    expect(root.getPropertyValue("--button-radius")).toBe("var(--radius)");
    expect(root.getPropertyValue("--card-radius")).toBe("1.5rem");
    expect(root.getPropertyValue("--shadow-card")).toBe("none");
    expect(root.getPropertyValue("--shadow-elevated")).toBe("none");
  });
});

describe("VisualProductCard shape token wiring", () => {
  const product: CommerceProductCard = {
    id: "smart-speaker",
    title: "SmartSpeak Jessica",
    description: "Reference speaker",
    href: "/products/smartspeak-jessica",
    imageUrl: "/speaker.webp",
    imageAlt: "Smart speaker",
    category: "Speakers",
    price: {
      amount: 389000,
      currencyCode: "COP",
      label: "$ 389.000",
      hasDiscount: false,
    },
    badges: [],
    ctaLabel: "Ver detalles",
  };

  it("uses --card-radius (with the current 1.5rem no-op fallback) by default", () => {
    const { container } = render(<VisualProductCard product={product} />);

    const article = container.querySelector("article");
    expect(article?.className).toContain("var(--card-radius,1.5rem)");
    expect(article?.className).not.toContain("rounded-3xl");
  });
});
