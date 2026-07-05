/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeSelectorModal } from "@/components/theme/theme-selector-modal";

const changeTheme = vi.fn();
let storeSubdomain = "default";

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
  useStore: () => ({ store: { subdomain: storeSubdomain } }),
}));

async function confirmPendingThemeApply() {
  await userEvent.click(
    screen.getByRole("button", { name: /Continuar/i }),
  );
}

describe("ThemeSelectorModal confirmation before reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeSubdomain = "default";
  });

  it("opens a confirmation dialog instead of applying the theme immediately", async () => {
    render(<ThemeSelectorModal open onOpenChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /Océano/i }));

    expect(
      await screen.findByRole("alertdialog"),
    ).toBeInTheDocument();
    expect(screen.getByText("Aplicar tema")).toBeInTheDocument();
    expect(
      screen.getByText(/los estilos de tus secciones se restablecen al nuevo tema/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/tu contenido \(productos, imágenes y textos\) se mantiene/i),
    ).toBeInTheDocument();
    expect(changeTheme).not.toHaveBeenCalled();
  });

  it("does NOT call changeTheme when the confirmation is cancelled", async () => {
    render(<ThemeSelectorModal open onOpenChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /Océano/i }));
    await screen.findByRole("alertdialog");
    await userEvent.click(screen.getByRole("button", { name: /Cancelar/i }));

    expect(changeTheme).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("calls changeTheme only after the confirmation is accepted", async () => {
    changeTheme.mockResolvedValue({
      success: true,
      activeTheme: {
        theme_name: "Océano",
        theme_fingerprint: "v1:store-1:version-2:theme-2:stamp:hash",
      },
    });

    render(<ThemeSelectorModal open onOpenChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /Océano/i }));
    await screen.findByRole("alertdialog");
    await confirmPendingThemeApply();

    expect(changeTheme).toHaveBeenCalledWith("Océano");
    expect(
      await screen.findByText(/Tema publicado: Océano/i),
    ).toBeInTheDocument();
  });

  it("keeps theme changes disabled for the reposteria subdomain and never opens the confirmation", async () => {
    storeSubdomain = "reposteria";

    render(<ThemeSelectorModal open onOpenChange={vi.fn()} />);

    const oceanoButton = screen.getByRole("button", { name: /Océano/i });
    expect(oceanoButton).toBeDisabled();

    await userEvent.click(oceanoButton);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(changeTheme).not.toHaveBeenCalled();
  });

  it("keeps activation failure visible without closing as published", async () => {
    changeTheme.mockResolvedValue({
      success: false,
      error: "No se pudo confirmar la publicación",
    });
    const onOpenChange = vi.fn();

    render(<ThemeSelectorModal open onOpenChange={onOpenChange} />);

    await userEvent.click(screen.getByRole("button", { name: /Océano/i }));
    await screen.findByRole("alertdialog");
    await confirmPendingThemeApply();

    expect(
      await screen.findByText("No se pudo confirmar la publicación"),
    ).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
