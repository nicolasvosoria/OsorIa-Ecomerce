/* eslint-disable @next/next/no-img-element */
import { fireEvent, isInaccessible, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ImageUpload } from "@/components/admin/image-upload";

const { uploadImageMock, deleteImageMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  uploadImageMock: vi.fn(),
  deleteImageMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src, onError }: { alt: string; src: string; onError?: () => void }) => (
    <img alt={alt} src={src} onError={onError} />
  ),
}));

const STORED_IMAGE_MARKER = "/storage/v1/object/public/products/";

vi.mock("@/lib/supabase/storage-api", () => ({
  uploadImage: uploadImageMock,
  deleteImage: deleteImageMock,
  isStoredImageUrl: (url: string) => url.includes(STORED_IMAGE_MARKER),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

const STORED_IMAGE_URL = `https://project.supabase.co${STORED_IMAGE_MARKER}uno.webp`;
const PRODUCT_CONTEXT = "product-images";

function imageFile(name: string, size = 16, type = "image/webp") {
  return new File([new Uint8Array(size)], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  uploadImageMock.mockImplementation(async (file: File) => ({
    success: true,
    url: `https://cdn.example.com/${file.name}`,
  }));
  deleteImageMock.mockResolvedValue({ success: true });
});

describe("ImageUpload single mode", () => {
  it("uploads the chosen file and publishes the resulting URL", async () => {
    const onChange = vi.fn();
    render(
      <ImageUpload value="" onChange={onChange} label="Imagen de fondo" context="hero-background" />,
    );

    await userEvent.upload(screen.getByLabelText("Imagen de fondo"), imageFile("fondo.webp"));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("https://cdn.example.com/fondo.webp"));
    expect(uploadImageMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "fondo.webp" }),
      "hero-background",
      5,
    );
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("passes its own size limit down to the upload instead of letting it be guessed", async () => {
    render(
      <ImageUpload value="" onChange={vi.fn()} context={PRODUCT_CONTEXT} maxSizeMB={1} />,
    );

    await userEvent.upload(screen.getByLabelText("Imagen"), imageFile("foto.webp"));

    await waitFor(() =>
      expect(uploadImageMock).toHaveBeenCalledWith(expect.anything(), PRODUCT_CONTEXT, 1),
    );
  });

  // Con fireEvent, no userEvent: userEvent respeta el `accept` del input y
  // descartaría el archivo antes de que el componente pudiera validarlo.
  it("rejects a file that is not an image without uploading it", async () => {
    const onChange = vi.fn();
    render(<ImageUpload value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Imagen"), {
      target: { files: [new File(["notas"], "notas.txt", { type: "text/plain" })] },
    });

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
    expect(uploadImageMock).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining("notas.txt"));
  });

  it("rejects a file over the limit without uploading it", async () => {
    render(<ImageUpload value="" onChange={vi.fn()} maxSizeMB={1} />);

    fireEvent.change(screen.getByLabelText("Imagen"), {
      target: { files: [imageFile("enorme.webp", 1024 * 1024 + 1)] },
    });

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining("máximo de 1MB")),
    );
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("surfaces the upload error and keeps the previous value", async () => {
    const onChange = vi.fn();
    uploadImageMock.mockResolvedValue({ success: false, error: "Acceso denegado" });
    render(<ImageUpload value="" onChange={onChange} />);

    await userEvent.upload(screen.getByLabelText("Imagen"), imageFile("foto.webp"));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Acceso denegado"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("deletes the stored image from storage when it is removed", async () => {
    const onChange = vi.fn();
    render(<ImageUpload value={STORED_IMAGE_URL} onChange={onChange} label="Imagen del combo" />);

    fireEvent.click(await screen.findByRole("button", { name: "Quitar imagen del combo" }));

    await waitFor(() => expect(deleteImageMock).toHaveBeenCalledWith(STORED_IMAGE_URL));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("leaves an external URL untouched in storage when it is removed", async () => {
    render(<ImageUpload value="https://cdn.example.com/externa.webp" onChange={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Quitar imagen" }));

    await waitFor(() => expect(deleteImageMock).not.toHaveBeenCalled());
  });

  it("reports a failed deletion instead of swallowing it", async () => {
    deleteImageMock.mockResolvedValue({ success: false, error: "Objeto no encontrado" });
    render(<ImageUpload value={STORED_IMAGE_URL} onChange={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Quitar imagen" }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Objeto no encontrado"));
  });

  // El `aria-label` genérico que traía el input ganaba sobre el <label htmlFor>
  // visible, así que dos campos con nombres distintos se anunciaban igual: el
  // nombre accesible ahora se deriva de `label`, como pide F10.
  it("announces its own domain name instead of a shared generic one", () => {
    render(
      <>
        <ImageUpload value="" onChange={vi.fn()} label="Imagen del combo" />
        <ImageUpload value="" onChange={vi.fn()} label="Imagen" />
      </>,
    );

    expect(screen.getByLabelText("Imagen del combo")).toBeInTheDocument();
    expect(screen.getByLabelText("Imagen")).toBeInTheDocument();
    expect(screen.queryByLabelText("Seleccionar imagen")).not.toBeInTheDocument();
  });

  // getByLabelText encuentra el input aunque esté display:none, así que por sí solo
  // no habría detectado que el <label htmlFor> apuntaba a un elemento inalcanzable
  // para un lector de pantalla. jsdom tampoco aplica el CSS real del proyecto (usa
  // @layer, que su motor no resuelve), así que replicamos aquí la regla real de la
  // utilidad "hidden" para que la comprobación de accesibilidad no sea un no-op.
  it("keeps the file input reachable in the accessibility tree instead of display:none", () => {
    const hiddenUtilityStyle = document.createElement("style");
    hiddenUtilityStyle.textContent = ".hidden { display: none }";
    document.head.appendChild(hiddenUtilityStyle);

    try {
      render(<ImageUpload value="" onChange={vi.fn()} label="Imagen de fondo" />);

      expect(isInaccessible(screen.getByLabelText("Imagen de fondo"))).toBe(false);
    } finally {
      hiddenUtilityStyle.remove();
    }
  });
});

describe("ImageUpload deferred upload", () => {
  it("hands the file to the caller instead of uploading it", async () => {
    const onFileSelect = vi.fn();
    const onChange = vi.fn();
    render(
      <ImageUpload value="" onChange={onChange} onFileSelect={onFileSelect} deferUpload />,
    );

    await userEvent.upload(screen.getByLabelText("Imagen"), imageFile("combo.webp"));

    expect(onFileSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "combo.webp" }));
    expect(uploadImageMock).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/se sube al guardar/i)).toBeInTheDocument();
  });

  it("still validates the file before handing it over", async () => {
    const onFileSelect = vi.fn();
    render(
      <ImageUpload value="" onChange={vi.fn()} onFileSelect={onFileSelect} deferUpload maxSizeMB={1} />,
    );

    fireEvent.change(screen.getByLabelText("Imagen"), {
      target: { files: [imageFile("enorme.webp", 1024 * 1024 + 1)] },
    });

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  // El registro que apunta a la imagen todavía no se ha guardado, así que quitarla
  // del formulario no puede borrar el objeto que sigue vivo en storage.
  it("does not delete from storage, because the caller owns the pending save", async () => {
    const onFileSelect = vi.fn();
    const onChange = vi.fn();
    render(
      <ImageUpload
        value={STORED_IMAGE_URL}
        onChange={onChange}
        onFileSelect={onFileSelect}
        deferUpload
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Quitar imagen" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(""));
    expect(deleteImageMock).not.toHaveBeenCalled();
    expect(onFileSelect).toHaveBeenCalledWith(null);
  });
});

describe("ImageUpload pasted URL", () => {
  it("stays hidden unless the caller opts in", () => {
    render(<ImageUpload value="" onChange={vi.fn()} />);

    expect(screen.queryByLabelText(/pegar URL/i)).not.toBeInTheDocument();
  });

  it("publishes the pasted URL and drops any file staged for upload", async () => {
    const onChange = vi.fn();
    const onFileSelect = vi.fn();
    render(
      <ImageUpload
        value=""
        onChange={onChange}
        onFileSelect={onFileSelect}
        deferUpload
        allowUrlInput
      />,
    );

    fireEvent.change(screen.getByLabelText(/pegar URL/i), {
      target: { value: "https://cdn.example.com/existente.webp" },
    });

    expect(onChange).toHaveBeenCalledWith("https://cdn.example.com/existente.webp");
    expect(onFileSelect).toHaveBeenCalledWith(null);
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  // Los ids literales del componente anterior chocaban al montar dos instancias.
  it("keeps its field ids unique across instances", () => {
    render(
      <>
        <ImageUpload value="" onChange={vi.fn()} label="Imagen A" allowUrlInput />
        <ImageUpload value="" onChange={vi.fn()} label="Imagen B" allowUrlInput />
      </>,
    );

    const [first, second] = screen.getAllByLabelText(/pegar URL/i);

    expect(first.id).not.toBe(second.id);
  });
});

describe("ImageUpload multiple mode", () => {
  function renderMultiple({ values = [] }: { values?: string[] } = {}) {
    const onChange = vi.fn();
    render(
      <ImageUpload
        multiple
        values={values}
        onChange={onChange}
        maxImages={5}
        maxSizeMB={1}
        context={PRODUCT_CONTEXT}
        label="Imágenes"
      />,
    );
    return onChange;
  }

  it("allows selecting up to five product images in one file picker action", async () => {
    const onChange = renderMultiple();

    const input = screen.getByLabelText(/imágenes \(/i);
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
    renderMultiple();

    const input = screen.getByLabelText(/imágenes \(/i);
    const inputClick = vi.spyOn(input, "click").mockImplementation(() => undefined);

    fireEvent.click(screen.getByRole("button", { name: /seleccionar imágenes/i }));

    expect(inputClick).toHaveBeenCalledTimes(1);
  });

  it("reports type, size, and limit validation by file without uploading invalid selections", async () => {
    const onChange = renderMultiple({ values: ["/a.webp", "/b.webp", "/c.webp", "/d.webp"] });

    fireEvent.change(screen.getByLabelText(/imágenes \(/i), {
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
    expect(uploadImageMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ok.webp" }),
      PRODUCT_CONTEXT,
      1,
    );
    expect(onChange).toHaveBeenLastCalledWith([
      "/a.webp",
      "/b.webp",
      "/c.webp",
      "/d.webp",
      "https://cdn.example.com/ok.webp",
    ]);
    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining("notes.txt"));
    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining("huge.webp"));
    expect(toastErrorMock).toHaveBeenCalledWith(
      expect.stringContaining("máximo 5 imágenes"),
    );
  });

  it("stops offering new slots once the limit is reached", () => {
    renderMultiple({
      values: ["/a.webp", "/b.webp", "/c.webp", "/d.webp", "/e.webp"],
    });

    expect(screen.getByRole("button", { name: /seleccionar imágenes/i })).toBeDisabled();
    expect(screen.getByLabelText("Imágenes (5/5)")).toBeDisabled();
  });

  it("replaces a single slot without counting against the limit", async () => {
    const onChange = renderMultiple({
      values: ["/a.webp", "/b.webp", "/c.webp", "/d.webp", "/e.webp"],
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Reemplazar" })[1]);
    fireEvent.change(screen.getByLabelText(/imágenes \(/i), {
      target: { files: [imageFile("nueva.webp")] },
    });

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith([
        "/a.webp",
        "https://cdn.example.com/nueva.webp",
        "/c.webp",
        "/d.webp",
        "/e.webp",
      ]),
    );
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("shows a broken-image fallback on load failure without deleting from storage or the form", async () => {
    const onChange = renderMultiple({ values: [STORED_IMAGE_URL] });

    fireEvent.error(screen.getByAltText("Imagen 1"));

    expect(await screen.findByText(/no se pudo cargar/i)).toBeInTheDocument();
    expect(deleteImageMock).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /eliminar imagen 1/i }));

    await waitFor(() => expect(deleteImageMock).toHaveBeenCalledWith(STORED_IMAGE_URL));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  // Mismo defecto que en modo single: el `aria-label` genérico ganaba sobre
  // el <label htmlFor> visible y ocultaba el nombre real del campo.
  it("announces its own domain name instead of a shared generic one", () => {
    renderMultiple();

    expect(screen.getByLabelText("Imágenes (0/5)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Seleccionar imágenes")).not.toBeInTheDocument();
  });
});
