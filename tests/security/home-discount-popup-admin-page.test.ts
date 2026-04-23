import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomeDiscountPopupConfigPage from "@/app/admin/home-discount-popup/page";

const mockUseAdminPermissions = vi.fn();
const mockPush = vi.fn();
const mockGetAdminRequestHeaders = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

vi.mock("@/contexts/admin-permissions-context", () => ({
  useAdminPermissions: () => mockUseAdminPermissions(),
}));

vi.mock("@/lib/supabase/admin-request-headers", () => ({
  getAdminRequestHeaders: (...args: unknown[]) =>
    mockGetAdminRequestHeaders(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) =>
    createElement("a", { href }, children),
}));

vi.mock("lucide-react", () => {
  const Icon = () => createElement("span");

  return {
    ArrowLeft: Icon,
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

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
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

describe("home discount popup admin page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockReturnValue("blob:preview-image");
    mockUseAdminPermissions.mockReturnValue({
      isAdmin: true,
      loading: false,
    });
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        config: {
          active: true,
          title: "Promo home",
          text: "Texto",
          imageUrl: "https://cdn.example.com/original.png",
          ctaText: "Copiar cupon",
          coupon: "HOME10",
          ctaMode: "copy_coupon",
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    render(createElement(HomeDiscountPopupConfigPage));

    await screen.findByRole("button", { name: /guardar popup/i });
    expect(fetchMock).toHaveBeenCalledWith("/api/home-discount-popup-config", {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer preview-token",
      },
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Seleccionar imagen pendiente" }),
      );
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/admin/home-discount-popup/upload",
      expect.anything(),
    );
    expect(
      screen.getByText(/hay una nueva imagen pendiente/i),
    ).toBeInTheDocument();
  });

  it("uploads the pending image on save and then persists the popup config", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          config: {
            active: true,
            title: "Promo home",
            text: "Texto",
            imageUrl: "https://cdn.example.com/original.png",
            ctaText: "Copiar cupon",
            coupon: "HOME10",
            ctaMode: "copy_coupon",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          url: "https://cdn.example.com/uploaded.png",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

    vi.stubGlobal("fetch", fetchMock);

    render(createElement(HomeDiscountPopupConfigPage));

    await screen.findByRole("button", { name: /guardar popup/i });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Seleccionar imagen pendiente" }),
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /guardar popup/i }));
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/admin/home-discount-popup/upload",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer preview-token",
        },
        body: expect.any(FormData),
      }),
    );

    const saveCall = fetchMock.mock.calls[2];
    expect(saveCall?.[0]).toBe("/api/home-discount-popup-config");
    expect(saveCall?.[1]).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer preview-token",
      },
    });
    expect(JSON.parse(String(saveCall?.[1]?.body))).toMatchObject({
      config: {
        imageUrl: "https://cdn.example.com/uploaded.png",
      },
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Popup promocional guardado");
  });

  it("opens a local preview with unsaved content and the staged image without uploading", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        config: {
          active: true,
          title: "Promo home",
          text: "Texto original",
          imageUrl: "https://cdn.example.com/original.png",
          ctaText: "Copiar cupon",
          coupon: "HOME10",
          ctaMode: "copy_coupon",
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    render(createElement(HomeDiscountPopupConfigPage));

    await screen.findByRole("button", { name: /vista previa/i });

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

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText("Texto sin guardar para preview", { selector: "p" }),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Promo preview")).toHaveAttribute(
      "src",
      "blob:preview-image",
    );
  });
});
