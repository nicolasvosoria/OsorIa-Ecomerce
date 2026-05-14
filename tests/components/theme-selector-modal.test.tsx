/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeSelectorModal } from "@/components/theme/theme-selector-modal";

const changeTheme = vi.fn();

vi.mock("@/contexts/theme-context", () => ({
  useTheme: () => ({
    themes: [
      {
        id: "theme-1",
        theme_name: "Claro Original",
        colors: { primary: "#111111" },
      },
      {
        id: "theme-2",
        theme_name: "Océano",
        colors: { primary: "#0055aa" },
      },
    ],
    activeTheme: { theme_name: "Claro Original" },
    loading: false,
    changeTheme,
  }),
}));

vi.mock("@/contexts/store-context", () => ({
  useStore: () => ({ store: { subdomain: "default" } }),
}));

describe("ThemeSelectorModal publication feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps confirmed publication success visible after activation returns a fingerprint", async () => {
    changeTheme.mockResolvedValue({
      success: true,
      activeTheme: {
        theme_name: "Océano",
        theme_fingerprint: "v1:store-1:version-2:theme-2:stamp:hash",
      },
    });
    const onOpenChange = vi.fn();

    render(<ThemeSelectorModal open onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Océano/i }));

    expect(
      await screen.findByText(/Tema publicado: Océano/i),
    ).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("keeps activation failure visible without closing as published", async () => {
    changeTheme.mockResolvedValue({
      success: false,
      error: "No se pudo confirmar la publicación",
    });
    const onOpenChange = vi.fn();

    render(<ThemeSelectorModal open onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Océano/i }));

    expect(
      await screen.findByText("No se pudo confirmar la publicación"),
    ).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
