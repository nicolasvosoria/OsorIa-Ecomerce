import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { normalizeHomeDiscountPopupConfig } from "@/lib/home-discount-popup";

const mockGetAdminRequestHeaders = vi.fn();
const mockSaveAction = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

vi.mock("@/lib/supabase/admin-request-headers", () => ({
  getAdminRequestHeaders: (...args: unknown[]) =>
    mockGetAdminRequestHeaders(...args),
}));

vi.mock("@/app/admin/home-discount-popup/actions", () => ({
  saveHomeDiscountPopupConfigAction: (...args: unknown[]) =>
    mockSaveAction(...args),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) =>
    createElement("a", { href }, children),
}));

vi.mock("lucide-react", () => {
  const Icon = () => createElement("span");

  return {
    ChevronDownIcon: Icon,
    Loader2: Icon,
    Percent: Icon,
    Save: Icon,
    ShieldAlert: Icon,
    X: Icon,
  };
});

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) =>
    createElement("div", {}, children),
  SelectContent: ({ children }: { children: ReactNode }) =>
    createElement("div", {}, children),
  SelectItem: ({ children }: { children: ReactNode }) =>
    createElement("div", {}, children),
  SelectTrigger: ({ children }: { children: ReactNode }) =>
    createElement("button", { type: "button" }, children),
  SelectValue: () => createElement("span"),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: (value: boolean) => void;
  }) =>
    createElement("input", {
      type: "checkbox",
      checked,
      onChange: (event: Event) =>
        onCheckedChange((event.target as HTMLInputElement).checked),
    }),
}));

vi.mock("@/components/admin/image-upload", () => ({
  ImageUpload: ({
    value,
    onChange,
    onFileSelect,
  }: {
    value: string;
    onChange: (value: string) => void;
    onFileSelect?: (file: File | null) => void;
  }) =>
    createElement(
      "div",
      {},
      createElement("div", { "data-testid": "image-upload-value" }, value),
      createElement(
        "button",
        {
          type: "button",
          onClick: () =>
            onFileSelect?.(
              new File(["promo"], "banner.png", { type: "image/png" }),
            ),
        },
        "Seleccionar imagen pendiente",
      ),
      createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            onFileSelect?.(null);
            onChange("");
          },
        },
        "Quitar imagen",
      ),
    ),
}));

import { HomeDiscountPopupForm } from "@/app/admin/home-discount-popup/components/home-discount-popup-form";

const COUPON_CAMPAIGN = normalizeHomeDiscountPopupConfig({
  active: true,
  title: "Promo home",
  text: "Texto",
  imageUrl: "https://cdn.example.com/original.png",
  ctaText: "Copiar cupon",
  coupon: "HOME10",
  ctaMode: "copy_coupon",
});

function renderForm(defaultValues = COUPON_CAMPAIGN) {
  return render(createElement(HomeDiscountPopupForm, { defaultValues }));
}

describe("home discount popup admin form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockReturnValue("blob:preview-image");
    mockSaveAction.mockResolvedValue({ success: true });
    mockGetAdminRequestHeaders.mockResolvedValue({
      "Content-Type": "application/json",
      Authorization: "Bearer preview-token",
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: mockCreateObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: mockRevokeObjectURL,
    });
  });

  it("stages the selected image locally without uploading immediately", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderForm();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Seleccionar imagen pendiente" }),
      );
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockSaveAction).not.toHaveBeenCalled();
    expect(screen.getByText(/hay una nueva imagen pendiente/i)).not.toBeNull();
  });

  it("uploads the pending image on save and then persists the popup config", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        url: "https://cdn.example.com/uploaded.png",
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    renderForm();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Seleccionar imagen pendiente" }),
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /guardar popup/i }));
    });

    await waitFor(() => expect(mockSaveAction).toHaveBeenCalledTimes(1));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/home-discount-popup/upload",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer preview-token",
        },
        body: expect.any(FormData),
      }),
    );
    expect(mockSaveAction).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: "https://cdn.example.com/uploaded.png" }),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith("Popup promocional guardado");
  });

  it("keeps the config unsaved and reports the error when the image upload fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Tipo de archivo no permitido." }),
    });

    vi.stubGlobal("fetch", fetchMock);

    renderForm();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Seleccionar imagen pendiente" }),
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /guardar popup/i }));
    });

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Tipo de archivo no permitido."),
    );
    expect(mockSaveAction).not.toHaveBeenCalled();
  });

  it("surfaces the server action error instead of reporting a false success", async () => {
    vi.stubGlobal("fetch", vi.fn());
    mockSaveAction.mockResolvedValue({ success: false, error: "Acceso denegado" });

    renderForm();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /guardar popup/i }));
    });

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Acceso denegado"),
    );
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("shows an actionable admin alert when the active popup config cannot publish", async () => {
    renderForm(
      normalizeHomeDiscountPopupConfig({
        active: true,
        title: "Promo home",
        text: "Texto",
        ctaText: "Ir ahora",
        ctaMode: "redirect",
        ctaUrl: "",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La promo activa no se publicará",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Agrega una URL HTTPS");
  });

  it("opens a local preview with unsaved content and the staged image without uploading", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderForm();

    fireEvent.change(screen.getByLabelText(/titulo/i), {
      target: { value: "Promo preview" },
    });
    fireEvent.change(screen.getByLabelText(/mensaje principal/i), {
      target: { value: "Texto sin guardar para preview" },
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Seleccionar imagen pendiente" }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /vista previa/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("Texto sin guardar para preview", { selector: "p" }),
    ).not.toBeNull();
    expect(screen.getByAltText("Promo preview").getAttribute("src")).toBe(
      "blob:preview-image",
    );
  });
});
