/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockUseMode = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/mode-context", () => ({
  useMode: () => mockUseMode(),
}));

import { ModeToggle } from "@/components/mode-toggle";

describe("ModeToggle", () => {
  it("labels itself for switching to dark mode while light and calls setMode('dark')", () => {
    const setMode = vi.fn();
    mockUseMode.mockReturnValue({ mode: "light", isDark: false, setMode });

    render(<ModeToggle />);

    const button = screen.getByRole("button", { name: "Cambiar a modo oscuro" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);

    expect(setMode).toHaveBeenCalledWith("dark");
  });

  it("labels itself for switching to light mode while dark and calls setMode('light')", () => {
    const setMode = vi.fn();
    mockUseMode.mockReturnValue({ mode: "dark", isDark: true, setMode });

    render(<ModeToggle />);

    const button = screen.getByRole("button", { name: "Cambiar a modo claro" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button);

    expect(setMode).toHaveBeenCalledWith("light");
  });
});
