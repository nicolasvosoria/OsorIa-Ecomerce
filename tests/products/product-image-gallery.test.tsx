/* eslint-disable @next/next/no-img-element */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductImageGallery } from "@/app/products/[slug]/components/product-image-gallery";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

const galleryImages = Array.from({ length: 5 }, (_, index) => ({
  url: `/product-${index + 1}.webp`,
  alt: `Producto imagen ${index + 1}`,
}));

describe("ProductImageGallery", () => {
  it("renders all five thumbnails while keeping the first image primary", () => {
    render(<ProductImageGallery images={galleryImages} />);

    expect(screen.getByText("1/5")).toBeInTheDocument();
    expect(screen.getAllByRole("option", { name: /imagen/i })).toHaveLength(5);
    expect(screen.getAllByAltText("Producto imagen 1")).toHaveLength(2);
    expect(screen.getAllByAltText("Producto imagen 5")).toHaveLength(1);
  });

  it("updates the selected image from the vertical thumbnail rail", () => {
    render(<ProductImageGallery images={galleryImages} />);

    fireEvent.click(screen.getByRole("option", { name: /imagen 3 de 5/i }));

    expect(screen.getByText("3/5")).toBeInTheDocument();
    expect(screen.getAllByAltText("Producto imagen 3")).toHaveLength(2);
  });

  it("opens and closes an accessible zoom dialog", () => {
    render(<ProductImageGallery images={galleryImages.slice(0, 2)} />);

    fireEvent.click(screen.getByRole("button", { name: /ampliar imagen producto imagen 1/i }));
    expect(screen.getByRole("dialog", { name: /imagen ampliada/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cerrar zoom/i }));
    expect(screen.queryByRole("dialog", { name: /imagen ampliada/i })).not.toBeInTheDocument();
  });

  it("shows an empty image state when no gallery images exist", () => {
    render(<ProductImageGallery images={[]} />);

    expect(screen.getByText("Sin imagen")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /imagen/i })).not.toBeInTheDocument();
  });
});
