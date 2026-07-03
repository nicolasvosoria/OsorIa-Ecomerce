import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ImgHTMLAttributes, type ReactNode } from "react";
import { NewsletterSection } from "@/components/sections/newsletter-section";
import { SpecialOffer } from "@/components/sections/special-offer";
import type { StoreItemWithDetails } from "@/lib/types/products";

const mockUseComponentStyle = vi.fn();
const mockUseAdmin = vi.fn();

const { getItemByIdMock } = vi.hoisted(() => ({
  getItemByIdMock: vi.fn(),
}));

type MockImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  priority?: boolean;
};

vi.mock("next/image", () => ({
  default: ({ fill: _fill, priority: _priority, ...props }: MockImageProps) =>
    createElement("img", props),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/contexts/styles-context", () => ({
  useComponentStyle: (...args: unknown[]) => mockUseComponentStyle(...args),
}));

vi.mock("@/contexts/admin-context", () => ({
  useAdmin: () => mockUseAdmin(),
}));

vi.mock("@/lib/supabase/products-api", () => ({
  getItemById: getItemByIdMock,
}));

function makeItem(overrides: Partial<StoreItemWithDetails> = {}): StoreItemWithDetails {
  return {
    id: "item-w00dy",
    item_name: "W00DY CX700",
    item_slug: "w00dy-cx700",
    base_price: 699000,
    compare_at_price: 875000,
    currency_code: "COP",
    is_active: true,
    is_featured: false,
    is_available_for_sale: true,
    track_inventory: false,
    inventory_quantity: 0,
    low_stock_threshold: 0,
    display_order: 1,
    view_count: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

describe("reference home sections", () => {
  beforeEach(() => {
    mockUseAdmin.mockReturnValue({ componentEdits: new Map(), isEditMode: false });
    getItemByIdMock.mockReset();
    mockUseComponentStyle.mockImplementation(
      (componentName: string, defaults: Record<string, unknown>) => {
        if (componentName === "specialOffer") {
          return {
            styles: {
              ...defaults,
              productId: "item-w00dy",
              linkText: "BUY NOW",
              claimedPercent: 45,
            },
          };
        }

        if (componentName === "newsletter") {
          return {
            styles: {
              ...defaults,
              title: "Unite a Nuestro Newsletter",
              discountText: "Obtené un 10% de descuento en tu próxima compra",
            },
          };
        }

        return { styles: defaults };
      },
    );
  });

  it("renders the configurable special offer, hydrated from the selected catalog product", async () => {
    getItemByIdMock.mockResolvedValue(makeItem());

    render(<SpecialOffer />);

    expect(await screen.findByRole("heading", { name: /w00dy cx700/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /oferta especial/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /buy now/i })).toHaveAttribute(
      "href",
      "/products/w00dy-cx700",
    );
  });

  it("hides the special offer on the live site when no product is selected", () => {
    mockUseComponentStyle.mockImplementation(
      (componentName: string, defaults: Record<string, unknown>) => {
        if (componentName === "specialOffer") {
          return { styles: { ...defaults, productId: "" } };
        }
        return { styles: defaults };
      },
    );

    const { container } = render(<SpecialOffer />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the configurable newsletter and handles local submit without navigation", () => {
    render(<NewsletterSection />);

    expect(
      screen.getByRole("heading", { name: /unite a nuestro newsletter/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/obtené un 10% de descuento/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/newsletter email/i)).toHaveAttribute(
      "placeholder",
      "Correo electrónico",
    );

    const form = screen.getByRole("button", { name: /suscribirse/i }).closest("form");
    expect(form).not.toBeNull();

    const submitEvent = fireEvent.submit(form as HTMLFormElement);

    expect(submitEvent).toBe(false);
  });
});
