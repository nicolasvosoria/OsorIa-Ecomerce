/* eslint-disable @next/next/no-img-element */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductImageGallery } from "@/app/products/[slug]/components/product-image-gallery";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

vi.mock("embla-carousel-react", () => ({
  default: () => [vi.fn(), { scrollPrev: vi.fn(), scrollNext: vi.fn(), scrollTo: vi.fn(), selectedScrollSnap: () => 0, on: vi.fn(), off: vi.fn() }],
}));

describe("ProductImageGallery", () => {
  it("renders all five product images while keeping the first image primary", () => {
    const images = Array.from({ length: 5 }, (_, index) => ({
      url: `/product-${index + 1}.webp`,
      alt: `Producto imagen ${index + 1}`,
    }));

    render(<ProductImageGallery images={images} />);

    expect(screen.getByText("1/5")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /ver imagen/i })).toHaveLength(5);
    expect(screen.getAllByAltText("Producto imagen 1")).toHaveLength(2);
    expect(screen.getAllByAltText("Producto imagen 5")).toHaveLength(2);
  });

  it("shows an empty image state when no gallery images exist", () => {
    render(<ProductImageGallery images={[]} />);

    expect(screen.getByText("Sin imagen")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ver imagen/i })).not.toBeInTheDocument();
  });
});
