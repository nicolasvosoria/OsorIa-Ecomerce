/* eslint-disable @next/next/no-img-element */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MultiImageUpload } from "@/components/admin/multi-image-upload";

const { uploadImageMock, deleteImageMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  uploadImageMock: vi.fn(),
  deleteImageMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

vi.mock("@/lib/supabase/storage-api", () => ({
  uploadImage: uploadImageMock,
  deleteImage: deleteImageMock,
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

function imageFile(name: string, size = 16, type = "image/webp") {
  return new File([new Uint8Array(size)], name, { type });
}

describe("MultiImageUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadImageMock.mockImplementation(async (file: File) => ({
      success: true,
      url: `https://cdn.example.com/${file.name}`,
    }));
  });

  it("allows selecting up to five product images in one file picker action", async () => {
    const onChange = vi.fn();
    render(<MultiImageUpload images={[]} onChange={onChange} label="Imágenes" />);

    const input = screen.getByLabelText(/seleccionar imágenes/i);
    expect(input).toHaveAttribute("multiple");

    await userEvent.upload(input, [
      imageFile("uno.webp"),
      imageFile("dos.webp"),
      imageFile("tres.webp"),
      imageFile("cuatro.webp"),
      imageFile("cinco.webp"),
    ]);

    await waitFor(() => expect(uploadImageMock).toHaveBeenCalledTimes(5));
    expect(onChange).toHaveBeenLastCalledWith([
      "https://cdn.example.com/uno.webp",
      "https://cdn.example.com/dos.webp",
      "https://cdn.example.com/tres.webp",
      "https://cdn.example.com/cuatro.webp",
      "https://cdn.example.com/cinco.webp",
    ]);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("opens the hidden file input from the visible select button", () => {
    const onChange = vi.fn();
    render(<MultiImageUpload images={[]} onChange={onChange} label="Imágenes" />);

    const input = screen.getByLabelText(/seleccionar imágenes/i);
    const inputClick = vi.spyOn(input, "click").mockImplementation(() => undefined);

    fireEvent.click(screen.getByRole("button", { name: /seleccionar imágenes/i }));

    expect(inputClick).toHaveBeenCalledTimes(1);
  });

  it("reports type, size, and limit validation by file without uploading invalid selections", async () => {
    const onChange = vi.fn();
    render(
      <MultiImageUpload
        images={["/a.webp", "/b.webp", "/c.webp", "/d.webp"]}
        onChange={onChange}
        label="Imágenes"
        maxSizeMB={1}
      />,
    );

    fireEvent.change(screen.getByLabelText(/seleccionar imágenes/i), {
      target: {
        files: [
          imageFile("ok.webp"),
          new File(["not-image"], "notes.txt", { type: "text/plain" }),
          imageFile("huge.webp", 1024 * 1024 + 1),
          imageFile("extra.webp"),
        ],
      },
    });

    await waitFor(() => expect(uploadImageMock).toHaveBeenCalledTimes(1));
    expect(uploadImageMock).toHaveBeenCalledWith(expect.objectContaining({ name: "ok.webp" }), "product-images");
    expect(onChange).toHaveBeenLastCalledWith([
      "/a.webp",
      "/b.webp",
      "/c.webp",
      "/d.webp",
      "https://cdn.example.com/ok.webp",
    ]);
    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining("notes.txt"));
    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining("huge.webp"), expect.anything());
    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining("extra.webp"));
  });
});
