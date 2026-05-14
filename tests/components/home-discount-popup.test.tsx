import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { HomeDiscountPopup } from "@/components/home-discount-popup";
import type { PublicHomeDiscountPopupConfig } from "@/lib/home-discount-popup";

const mockUseStore = vi.fn();
const mockUsePathname = vi.fn();
const mockToastSuccess = vi.fn();
const mockClipboardWriteText = vi.fn();

vi.mock("@/contexts/store-context", () => ({
  useStore: () => mockUseStore(),
}));

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    usePathname: () => mockUsePathname(),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

const baseConfig: PublicHomeDiscountPopupConfig = {
  active: true,
  title: "Descuento de bienvenida",
  text: "Usa este cupon en tu primera compra.",
  imageUrl: "https://cdn.example.com/popup.png",
  ctaText: "Copiar cupon",
  ctaUrl: null,
  coupon: "HOME10",
  ctaMode: "copy_coupon",
  delaySeconds: 3,
  frequencyHours: 24,
  visibleDurationSeconds: 15,
  startsAt: null,
  endsAt: null,
  fingerprint: "fingerprint-abc",
};

describe("HomeDiscountPopup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T12:00:00.000Z"));
    localStorage.clear();
    mockUseStore.mockReturnValue({
      store: {
        id: "store-123",
        store_name: "Osoria",
        homeDiscountPopup: baseConfig,
      },
    });
    mockUsePathname.mockReturnValue("/");
    mockClipboardWriteText.mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: mockClipboardWriteText,
      },
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("shows after the configured delay and dismisses until the frequency elapses", () => {
    render(<HomeDiscountPopup />);

    expect(screen.queryByText(baseConfig.title)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText(baseConfig.title)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cerrar popup/i }));

    expect(screen.queryByText(baseConfig.title)).not.toBeInTheDocument();

    render(<HomeDiscountPopup />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText(baseConfig.title)).not.toBeInTheDocument();
  });

  it("copies the coupon when CTA mode is copy_coupon", async () => {
    render(<HomeDiscountPopup />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copiar cupon/i }));
      await Promise.resolve();
    });

    expect(mockClipboardWriteText).toHaveBeenCalledWith("HOME10");
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  it("does not render on non-home routes even when the popup is active", () => {
    mockUsePathname.mockReturnValue("/products/cafetera");

    render(<HomeDiscountPopup />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText(baseConfig.title)).not.toBeInTheDocument();
  });

  it("shows a changed campaign fingerprint even when the previous campaign is in cooldown", () => {
    const oldStorageKey =
      "osoria.homeDiscountPopup.store-123.previous-fingerprint";
    localStorage.setItem(
      oldStorageKey,
      JSON.stringify({ dismissedAt: "2026-04-23T11:59:00.000Z" }),
    );

    mockUseStore.mockReturnValue({
      store: {
        id: "store-123",
        store_name: "Osoria",
        homeDiscountPopup: {
          ...baseConfig,
          title: "Nueva campaña",
          fingerprint: "new-fingerprint",
        },
      },
    });

    render(<HomeDiscountPopup />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("Nueva campaña")).toBeInTheDocument();
  });

  it("does not render active popup data when its CTA is invalid", () => {
    mockUseStore.mockReturnValue({
      store: {
        id: "store-123",
        store_name: "Osoria",
        homeDiscountPopup: {
          ...baseConfig,
          ctaMode: "redirect",
          ctaUrl: null,
        },
      },
    });

    render(<HomeDiscountPopup />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText(baseConfig.title)).not.toBeInTheDocument();
  });
});
