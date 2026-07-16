import { beforeEach, describe, expect, it, vi } from "vitest";

const { uploadMock } = vi.hoisted(() => ({
  uploadMock: vi.fn(),
}));

vi.mock("@/lib/supabase/permissions-api", () => ({
  isCurrentUserAdmin: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    storage: {
      from: () => ({
        upload: uploadMock,
        getPublicUrl: (objectPath: string) => ({
          data: { publicUrl: `https://cdn.example.com/${objectPath}` },
        }),
      }),
    },
  }),
}));

const STORE_ID = "9b1b807c-de03-438f-a92a-349b9aa64c11";
const OTHER_STORE_ID = "1f4c2d55-7a90-4b21-8c63-0d5e7a1b9f34";

function imageFile(name = "photo.webp", sizeInBytes = 16): File {
  const bytes = new Uint8Array(sizeInBytes);
  return {
    name,
    type: "image/webp",
    size: sizeInBytes,
    arrayBuffer: async () => bytes.buffer,
  } as unknown as File;
}

describe("uploadImage store namespacing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadMock.mockImplementation(async (objectPath: string) => ({
      data: { path: objectPath },
      error: null,
    }));
  });

  it("prefixes the upload path with the {store_id}/ the caller hands over", async () => {
    const { uploadImage } = await import("@/lib/supabase/storage-api");

    const result = await uploadImage({
      file: imageFile(),
      storeId: STORE_ID,
      context: "product-images",
    });

    expect(result.success).toBe(true);
    const [objectPath] = uploadMock.mock.calls[0];
    expect(objectPath).toMatch(new RegExp(`^${STORE_ID}/`));
  });

  // El bug que cierra este slice: el prefijo salía del ambiente del navegador
  // (la cookie `store_id`, que es la del HOST), así que cambiar de tienda en el
  // switcher seguía subiendo a la carpeta de la anterior. Dos subidas seguidas
  // desde el mismo navegador, sin tocar nada del ambiente, tienen que aterrizar
  // en carpetas distintas si el llamador pide tiendas distintas.
  it("follows the store it is given, so switching stores changes the folder", async () => {
    const { uploadImage } = await import("@/lib/supabase/storage-api");

    await uploadImage({ file: imageFile(), storeId: STORE_ID, context: "product-images" });
    await uploadImage({ file: imageFile(), storeId: OTHER_STORE_ID, context: "product-images" });

    const [firstPath] = uploadMock.mock.calls[0];
    const [secondPath] = uploadMock.mock.calls[1];
    expect(firstPath).toMatch(new RegExp(`^${STORE_ID}/`));
    expect(secondPath).toMatch(new RegExp(`^${OTHER_STORE_ID}/`));
  });

  // Sin tienda activa, authorizeActiveStoreAdmin falló: rechazar acá es honesto
  // en vez de dejar que un path plano choque con la RLS como error opaco de storage.
  it("refuses to upload outside a store instead of falling back to a flat path", async () => {
    const { uploadImage } = await import("@/lib/supabase/storage-api");

    const result = await uploadImage({
      file: imageFile(),
      storeId: "",
      context: "product-images",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("tienda activa");
    expect(uploadMock).not.toHaveBeenCalled();
  });
});

describe("uploadImage size limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadMock.mockImplementation(async (objectPath: string) => ({
      data: { path: objectPath },
      error: null,
    }));
  });

  // El límite lo declara quien llama: nombrar el contexto "product-images" ya no
  // baja el máximo a 1MB por sí solo.
  it("enforces the limit the caller passes, not the name of the context", async () => {
    const { uploadImage } = await import("@/lib/supabase/storage-api");
    const twoMegabyteImage = imageFile("grande.webp", 2 * 1024 * 1024);

    const uploadWithLimit = (maxSizeMB: number) =>
      uploadImage({
        file: twoMegabyteImage,
        storeId: STORE_ID,
        context: "product-images",
        maxSizeMB,
      });

    const rejected = await uploadWithLimit(1);
    expect(rejected.success).toBe(false);
    expect(rejected.error).toContain("máximo de 1MB");
    expect(uploadMock).not.toHaveBeenCalled();

    const accepted = await uploadWithLimit(5);
    expect(accepted.success).toBe(true);
  });

  it("defaults to 5MB when the caller states no limit", async () => {
    const { uploadImage } = await import("@/lib/supabase/storage-api");

    const accepted = await uploadImage({
      file: imageFile("mediana.webp", 4 * 1024 * 1024),
      storeId: STORE_ID,
      context: "hero-banner",
    });
    expect(accepted.success).toBe(true);

    const rejected = await uploadImage({
      file: imageFile("enorme.webp", 6 * 1024 * 1024),
      storeId: STORE_ID,
      context: "hero-banner",
    });
    expect(rejected.success).toBe(false);
    expect(rejected.error).toContain("máximo de 5MB");
  });
});

describe("isStoredImageUrl", () => {
  // La heurística anterior buscaba "supabase.co/storage" y fallaba con dominios
  // propios; el marcador de objeto público no depende del host.
  it("recognises a stored object behind a custom domain", async () => {
    const { isStoredImageUrl } = await import("@/lib/supabase/storage-api");

    expect(
      isStoredImageUrl("https://cdn.osoria.tech/storage/v1/object/public/products/foto.webp"),
    ).toBe(true);
    expect(
      isStoredImageUrl("https://project.supabase.co/storage/v1/object/public/products/foto.webp"),
    ).toBe(true);
  });

  it("ignores URLs outside the products bucket", async () => {
    const { isStoredImageUrl } = await import("@/lib/supabase/storage-api");

    expect(isStoredImageUrl("https://cdn.example.com/foto.webp")).toBe(false);
    expect(
      isStoredImageUrl("https://project.supabase.co/storage/v1/object/public/avatars/foto.webp"),
    ).toBe(false);
  });
});
