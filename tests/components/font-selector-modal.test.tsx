/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FontSelectorModal } from "@/components/font/font-selector-modal";
import type { AppFontPairing } from "@/lib/types/font";

const changePairing = vi.fn();

const pairings: AppFontPairing[] = [
  {
    id: 1,
    pairing_name: "space-grotesk-inter",
    heading_font_name: "Space Grotesk",
    heading_font_family: "'Space Grotesk', sans-serif",
    heading_google_font_url:
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700",
    heading_font_axis: "Space+Grotesk:wght@700",
    body_font_name: "Inter",
    body_font_family: "'Inter', sans-serif",
    body_google_font_url:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400",
    body_font_axis: "Inter:wght@400",
    is_active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: 2,
    pairing_name: "playfair-lora",
    heading_font_name: "Playfair Display",
    heading_font_family: "'Playfair Display', serif",
    heading_google_font_url:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700",
    heading_font_axis: "Playfair+Display:wght@700",
    body_font_name: "Lora",
    body_font_family: "'Lora', serif",
    body_google_font_url: "https://fonts.googleapis.com/css2?family=Lora:wght@400",
    body_font_axis: "Lora:wght@400",
    is_active: false,
    created_at: "",
    updated_at: "",
  },
];

vi.mock("@/contexts/font-context", () => ({
  useFont: () => ({
    pairings,
    activePairing: pairings[0],
    loading: false,
    changePairing,
  }),
}));

describe("FontSelectorModal pairing selector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders one card per pairing with heading/body previews and highlights the active pairing", () => {
    render(<FontSelectorModal open onOpenChange={vi.fn()} />);

    expect(screen.getByText("Space Grotesk")).toBeInTheDocument();
    expect(screen.getByText("Inter")).toBeInTheDocument();
    expect(screen.getByText("Playfair Display")).toBeInTheDocument();
    expect(screen.getByText("Lora")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
  });

  it("activates the clicked pairing", async () => {
    changePairing.mockResolvedValue({ success: true });
    const onOpenChange = vi.fn();

    render(<FontSelectorModal open onOpenChange={onOpenChange} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Playfair Display/i }),
    );

    expect(changePairing).toHaveBeenCalledWith("playfair-lora");
  });
});
