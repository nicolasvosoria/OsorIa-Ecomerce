import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CreateProductPage from "@/app/admin/products/create/page";

const mockUseAdminPermissions = vi.fn();
const mockPush = vi.fn();
const mockCreateItem = vi.fn();
const mockGetCategories = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("@/contexts/admin-permissions-context", () => ({
  useAdminPermissions: () => mockUseAdminPermissions(),
}));

vi.mock("@/lib/supabase/products-api", () => ({
  createItem: (...args: unknown[]) => mockCreateItem(...args),
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
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
    Loader2: Icon,
    Save: Icon,
    ShieldAlert: Icon,
  };
});

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value?: string; onValueChange?: (value: string) => void }) =>
    createElement("div", { "data-value": value },
      children,
      createElement("button", {
        type: "button",
        onClick: () => onValueChange?.("category-1"),
      }, "Elegir categoría de prueba"),
    ),
  SelectContent: ({ children }: { children: ReactNode }) =>
    createElement("div", {}, children),
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) =>
    createElement("div", { "data-value": value }, children),
  SelectTrigger: ({ children }: { children: ReactNode }) =>
    createElement("button", { type: "button" }, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) =>
    createElement("span", {}, placeholder),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
  }: {
    id: string;
    checked: boolean;
    onCheckedChange: (value: boolean) => void;
  }) =>
    createElement("input", {
      id,
      type: "checkbox",
      checked,
      onChange: (event: Event) =>
        onCheckedChange((event.target as HTMLInputElement).checked),
    }),
}));

vi.mock("@/components/admin/multi-image-upload", () => ({
  MultiImageUpload: ({
    images,
    onChange,
  }: {
    images: string[];
    onChange: (images: string[]) => void;
  }) =>
    createElement(
      "section",
      { "aria-label": "mock-image-upload" },
      createElement("output", { "data-testid": "selected-images" }, images.join("|")),
      createElement(
        "button",
        {
          type: "button",
          onClick: () =>
            onChange([
              "https://cdn.example.com/first.webp",
              "https://cdn.example.com/second.webp",
            ]),
        },
        "Agregar imágenes de prueba",
      ),
    ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

function setupSuccessfulCreate() {
  mockUseAdminPermissions.mockReturnValue({ isAdmin: true, loading: false });
  mockGetCategories.mockResolvedValue([
    { id: "category-1", category_name: "Cafés" },
  ]);
  mockCreateItem.mockResolvedValue({
    success: true,
    item: { id: "item-1", item_name: "Café Especial" },
  });
}

async function fillRequiredProductFields() {
  fireEvent.change(screen.getByLabelText(/nombre del producto/i), {
    target: { value: "Café Especial" },
  });
  fireEvent.change(screen.getByLabelText(/precio base/i), {
    target: { value: "12000" },
  });
  fireEvent.change(screen.getByLabelText(/descripción$/i), {
    target: { value: "Café molido premium" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Agregar imágenes de prueba" }));

  await waitFor(() =>
    expect(screen.getByTestId("selected-images")).toHaveTextContent(
      "first.webp|https://cdn.example.com/second.webp",
    ),
  );
}

describe("admin product create form reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSuccessfulCreate();
  });

  it("clears form values and selected images after Guardar y crear otro", async () => {
    render(createElement(CreateProductPage));

    await fillRequiredProductFields();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /guardar y crear otro/i }));
    });

    await waitFor(() => expect(mockCreateItem).toHaveBeenCalledTimes(1));

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Producto creado exitosamente. Puedes crear otro producto.",
    );
    expect(screen.getByLabelText(/nombre del producto/i)).toHaveValue("");
    expect(screen.getByLabelText(/precio base/i)).toHaveValue(null);
    expect(screen.getByLabelText(/descripción$/i)).toHaveValue("");
    expect(screen.getByTestId("selected-images")).toHaveTextContent("");

    expect(mockCreateItem).toHaveBeenCalledWith(
      expect.objectContaining({
        item_name: "Café Especial",
        primary_image_url: "https://cdn.example.com/first.webp",
      }),
      ["https://cdn.example.com/second.webp"],
    );
  });

  it("requires valid native form fields before Guardar y crear otro creates a product", async () => {
    render(createElement(CreateProductPage));

    fireEvent.change(screen.getByLabelText(/nombre del producto/i), {
      target: { value: "Café Especial" },
    });
    fireEvent.change(screen.getByLabelText(/precio base/i), {
      target: { value: "12000" },
    });
    fireEvent.change(screen.getByLabelText(/cantidad en stock/i), {
      target: { value: "" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /guardar y crear otro/i }));
    });

    expect(mockCreateItem).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("navigates after Guardar and a later create page mount starts with defaults", async () => {
    const { unmount } = render(createElement(CreateProductPage));

    await fillRequiredProductFields();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^crear producto$/i }));
    });

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/admin/products"));

    unmount();
    await act(async () => {
      render(createElement(CreateProductPage));
    });

    expect(screen.getByLabelText(/nombre del producto/i)).toHaveValue("");
    expect(screen.getByLabelText(/precio base/i)).toHaveValue(null);
    expect(screen.getByTestId("selected-images")).toHaveTextContent("");
  });

  it("keeps a double click on save from creating duplicate products", async () => {
    let resolveCreate: (value: unknown) => void = () => undefined;
    mockCreateItem.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );

    render(createElement(CreateProductPage));

    await fillRequiredProductFields();

    const actions = screen.getByRole("button", { name: /^crear producto$/i }).closest("div");
    expect(actions).not.toBeNull();
    const saveButton = within(actions as HTMLElement).getByRole("button", {
      name: /^crear producto$/i,
    });

    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    expect(mockCreateItem).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate({ success: true, item: { id: "item-1" } });
    });
  });
});
