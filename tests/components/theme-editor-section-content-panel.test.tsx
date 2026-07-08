/** @vitest-environment jsdom */

// Debt 5 (Part B) regression: `ContentField` must dispatch the image upload
// control by the field config's declared `type: "image"`, not by sniffing
// `field.key` for the substring "image". This exercises the real
// `component-fields.ts` config (the "about" section, which has both a
// declared image field and a plain text field) through the real renderer.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { SectionContentPanel } from "@/components/theme/theme-editor-section-content-panel";
import { SectionDesignFieldList } from "@/components/theme/theme-editor-section-design-panel";

vi.mock("@/lib/supabase/storage-api", () => ({
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const { getCategoriesMock } = vi.hoisted(() => ({ getCategoriesMock: vi.fn() }));

vi.mock("@/lib/supabase/products-api", () => ({
  getCategories: getCategoriesMock,
}));

// jsdom doesn't implement ResizeObserver or scrollIntoView; the underlying
// `cmdk` Command list (CategoryPicker) needs both once its popover mounts.
beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverStub;
  Element.prototype.scrollIntoView = vi.fn();
});

describe("SectionContentPanel content field dispatch", () => {
  it("renders the image control for a declared type:\"image\" field and a text input otherwise", () => {
    render(
      <SectionContentPanel
        sectionName="about"
        persistedContent={{}}
        stagedContent={{}}
        onFieldChange={vi.fn()}
      />,
    );

    // `ceoImage` (component-fields.ts) is declared `type: "image"`: renders
    // the ImageUpload control (its own "Subir Imagen" trigger).
    expect(screen.getByRole("button", { name: /subir imagen/i })).toBeInTheDocument();

    // `ceoName` is a plain `type: "text"` field in the same section: renders
    // as a text Input, not the image control.
    expect(screen.getByLabelText("Nombre del CEO")).toHaveAttribute("type", "text");
  });

  it("renders a CategoryPicker for a declared type:\"category\" array sub-field", async () => {
    getCategoriesMock.mockResolvedValue([
      { id: "cat-speakers", category_name: "Bocinas Bluetooth", display_order: 1, is_active: true, created_at: "", updated_at: "" },
    ]);

    render(
      <SectionContentPanel
        sectionName="popular"
        persistedContent={{ categoryTiles: [{ categoryId: "cat-speakers", imageUrl: "" }] }}
        stagedContent={{}}
        onFieldChange={vi.fn()}
      />,
    );

    // `categoryTiles[].categoryId` (component-fields.ts) is declared
    // `type: "category"` and stays a CONTENT-group field (unlike popular's
    // other new fields): renders the CategoryPicker here, showing the
    // already-picked category's name once categories load.
    await waitFor(() => expect(screen.getByText("Bocinas Bluetooth")).toBeInTheDocument());
  });

  it("selecting a category on an existing tile propagates the updated array through onFieldChange", async () => {
    getCategoriesMock.mockResolvedValue([
      { id: "cat-speakers", category_name: "Bocinas Bluetooth", display_order: 1, is_active: true, created_at: "", updated_at: "" },
      { id: "cat-headphones", category_name: "Audífonos", display_order: 2, is_active: true, created_at: "", updated_at: "" },
    ]);

    const onFieldChange = vi.fn();
    render(
      <SectionContentPanel
        sectionName="popular"
        persistedContent={{ categoryTiles: [{ categoryId: "cat-speakers", imageUrl: "" }] }}
        stagedContent={{}}
        onFieldChange={onFieldChange}
      />,
    );

    await waitFor(() => expect(screen.getByText("Bocinas Bluetooth")).toBeInTheDocument());
    const categoryTrigger = (await screen.findAllByRole("combobox")).find((el) =>
      el.textContent?.includes("Bocinas Bluetooth"),
    )!;
    fireEvent.click(categoryTrigger);
    fireEvent.click(await screen.findByText("Audífonos"));

    // The array sub-field edit flows `updateArrayItem` -> the WHOLE updated
    // `categoryTiles` array, not just the changed cell — this is what
    // `workingContent` stages and posts to the live preview.
    expect(onFieldChange).toHaveBeenCalledWith("categoryTiles", [
      { categoryId: "cat-headphones", imageUrl: "" },
    ]);
  });
});

// `showCategory` (products) is a `group: "design"` field (Diseño tab — see
// `lib/section-editor/component-fields.ts`), so its dispatch is exercised
// through `SectionDesignFieldList`, not `SectionContentPanel`.
describe("SectionDesignFieldList content field dispatch", () => {
  it("renders a declared type:\"toggle\" field as a Switch, checked from a legacy 'si' value", () => {
    render(
      <SectionDesignFieldList
        sectionName="products"
        persistedContent={{ showCategory: "si" }}
        stagedContent={{}}
        onContentFieldChange={vi.fn()}
      />,
    );

    // `showCategory` (component-fields.ts) is declared `type: "toggle"`:
    // renders a Switch, not the legacy "si"/"no" select.
    expect(screen.getByRole("switch", { name: "Mostrar Categoría" })).toBeChecked();
  });

  it("writes a real boolean when a toggle field is flipped", () => {
    const onContentFieldChange = vi.fn();
    render(
      <SectionDesignFieldList
        sectionName="products"
        persistedContent={{ showCategory: "no" }}
        stagedContent={{}}
        onContentFieldChange={onContentFieldChange}
      />,
    );

    const toggle = screen.getByRole("switch", { name: "Mostrar Categoría" });
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);

    expect(onContentFieldChange).toHaveBeenCalledWith("showCategory", true);
  });
});
