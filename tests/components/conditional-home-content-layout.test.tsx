import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { ConditionalHomeContent } from "@/components/sections/conditional-home-content";

const { mockGetStoreFromServer } = vi.hoisted(() => ({
  mockGetStoreFromServer: vi.fn(),
}));

function MockSection({ testId }: { testId: string }) {
  return <div data-testid={testId} />;
}

vi.mock("@/lib/supabase/store-api", () => ({
  getStoreFromServer: () => mockGetStoreFromServer(),
}));

vi.mock("@/components/admin/editable-wrapper", () => ({
  EditableWrapper: ({
    componentName,
    children,
  }: {
    componentName: string;
    children: ReactNode;
  }) => (
    <section data-component-name={componentName}>
      {children}
    </section>
  ),
}));

vi.mock("@/components/sections/hero-banner", () => ({
  HeroBanner: () => <MockSection testId="hero-banner" />,
}));

vi.mock("@/components/sections/popular-items-wrapper", () => ({
  PopularItemsWrapper: () => <MockSection testId="popular-items" />,
}));

vi.mock("@/components/sections/products-grid-wrapper", () => ({
  ProductsGridWrapper: () => <MockSection testId="products-grid" />,
}));

vi.mock("@/components/sections/featured-product", () => ({
  FeaturedProduct: () => <MockSection testId="featured-product" />,
}));

vi.mock("@/components/sections/special-offer", () => ({
  SpecialOffer: () => <MockSection testId="special-offer" />,
}));

vi.mock("@/components/sections/why-us", () => ({
  WhyUs: () => <MockSection testId="why-us" />,
}));

vi.mock("@/components/sections/newsletter-section", () => ({
  NewsletterSection: () => <MockSection testId="newsletter" />,
}));

vi.mock("@/components/sections/footer-new", () => ({
  FooterNew: () => <MockSection testId="footer" />,
}));

vi.mock("@/components/home-discount-popup", () => ({
  HomeDiscountPopup: () => <MockSection testId="discount-popup" />,
}));

vi.mock("@/components/sections/reposteria-hero", () => ({
  ReposteriaHero: () => <MockSection testId="reposteria-hero" />,
}));

vi.mock("@/components/sections/reposteria-gallery", () => ({
  ReposteriaGallery: () => <MockSection testId="reposteria-gallery" />,
}));

vi.mock("@/components/sections/reposteria-about", () => ({
  ReposteriaAbout: () => <MockSection testId="reposteria-about" />,
}));

describe("ConditionalHomeContent layout", () => {
  beforeEach(() => {
    mockGetStoreFromServer.mockReset();
  });

  it("includes reference special offer and newsletter sections on the default home path", async () => {
    mockGetStoreFromServer.mockResolvedValue({ subdomain: "default" });

    render(await ConditionalHomeContent());

    expect(screen.getByTestId("hero-banner")).toBeInTheDocument();
    expect(screen.getByTestId("special-offer")).toBeInTheDocument();
    expect(screen.getByTestId("newsletter")).toBeInTheDocument();
    expect(screen.getByTestId("discount-popup")).toBeInTheDocument();
    expect(screen.queryByTestId("reposteria-hero")).not.toBeInTheDocument();
  });

  it("keeps the reposteria path on its dedicated layout", async () => {
    mockGetStoreFromServer.mockResolvedValue({ subdomain: "reposteria" });

    render(await ConditionalHomeContent());

    expect(screen.getByTestId("reposteria-hero")).toBeInTheDocument();
    expect(screen.getByTestId("reposteria-gallery")).toBeInTheDocument();
    expect(screen.queryByTestId("special-offer")).not.toBeInTheDocument();
    expect(screen.queryByTestId("newsletter")).not.toBeInTheDocument();
  });
});
