/** @vitest-environment jsdom */

// Debt 5 (Part B) regression: `ContentField` must dispatch the image upload
// control by the field config's declared `type: "image"`, not by sniffing
// `field.key` for the substring "image". This exercises the real
// `component-fields.ts` config (the "about" section, which has both a
// declared image field and a plain text field) through the real renderer.

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SectionContentPanel } from "@/components/theme/theme-editor-section-content-panel";

vi.mock("@/lib/supabase/storage-api", () => ({
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

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
});
