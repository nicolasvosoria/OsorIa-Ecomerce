import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroBanner } from "@/components/sections/hero-banner";

const mockUseComponentStyle = vi.fn();
const mockUseAdmin = vi.fn();
const mockUseTheme = vi.fn();

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/contexts/styles-context", () => ({
  useComponentStyle: (...args: any[]) => mockUseComponentStyle(...args),
}));

vi.mock("@/contexts/admin-context", () => ({
  useAdmin: () => mockUseAdmin(),
}));

vi.mock("@/contexts/theme-context", () => ({
  useTheme: () => mockUseTheme(),
}));

vi.mock("@/components/ui/carousel", () => ({
  Carousel: ({ children }: any) => <div>{children}</div>,
  CarouselContent: ({ children }: any) => <div>{children}</div>,
  CarouselItem: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
}));

describe("HeroBanner", () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({
      activeTheme: {
        theme_name: "Claro",
        colors: {
          background: "#ffffff",
          accent: "#005aa1",
          secondary: "#c4faff",
        },
      },
    });

    mockUseAdmin.mockReturnValue({
      componentEdits: new Map(),
    });
  });

  it("keeps the existing split layout as the default mode", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "split",
        products: [
          {
            label: "Audio",
            title: "PREMIUM",
            subtitle: "HEADPHONES",
            description: "Auriculares premium",
            buttonText: "Comprar ahora",
            image: "/premium-headphones.png",
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);
    const hero = container.querySelector('[data-component="hero"]');

    expect(hero).toHaveAttribute("data-hero-layout", "split");
    expect(screen.getByText("PREMIUM")).toBeInTheDocument();
    expect(screen.getByAltText("PREMIUM")).toHaveClass("object-contain");
  });

  it("renders the new full-image layout with a full-bleed image layer", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        overlayColor: "#101828",
        overlayOpacity: "0.55",
        products: [
          {
            label: "Audio",
            title: "PREMIUM",
            subtitle: "HEADPHONES",
            description: "Auriculares premium",
            buttonText: "Comprar ahora",
            image: "/premium-headphones.png",
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);
    const hero = container.querySelector('[data-component="hero"]');

    expect(hero).toHaveAttribute("data-hero-layout", "full-image");
    expect(screen.getByTestId("hero-full-background-image")).toHaveAttribute(
      "src",
      "/premium-headphones.png",
    );
    expect(screen.getByText("HEADPHONES")).toBeInTheDocument();
  });

  it("removes the boxed frame styling from the full-image layout", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        products: [
          {
            label: "Audio",
            title: "PREMIUM",
            subtitle: "HEADPHONES",
            description: "Auriculares premium",
            buttonText: "Comprar ahora",
            image: "/premium-headphones.png",
          },
        ],
      },
    });

    const { container } = render(<HeroBanner />);
    const hero = container.querySelector('[data-component="hero"]');

    expect(hero).not.toHaveClass("max-w-7xl");
    expect(hero).not.toHaveClass("rounded-2xl");
    expect(hero).not.toHaveClass("md:rounded-3xl");
    expect(hero).not.toHaveClass("px-2");
    expect(hero).not.toHaveClass("md:px-4");
  });

  it("applies full-image fit, position and content alignment controls", () => {
    mockUseComponentStyle.mockReturnValue({
      styles: {
        layoutMode: "full-image",
        imageFit: "contain",
        imagePositionX: "left",
        imagePositionY: "top",
        fullImageContentAlign: "right",
        products: [
          {
            label: "Audio",
            title: "PREMIUM",
            subtitle: "HEADPHONES",
            description: "Auriculares premium",
            buttonText: "Comprar ahora",
            image: "/premium-headphones.png",
          },
        ],
      },
    });

    render(<HeroBanner />);

    const backgroundImage = screen.getByTestId("hero-full-background-image");
    expect(backgroundImage).toHaveClass("object-contain");
    expect(backgroundImage).toHaveStyle({ objectPosition: "left top" });

    const contentContainer = screen.getByTestId("hero-full-content-container");
    expect(contentContainer).toHaveClass("justify-end");

    const contentBlock = screen.getByTestId("hero-full-content-block");
    expect(contentBlock).toHaveClass("text-right");
  });
});
