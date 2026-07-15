import { beforeEach, describe, expect, it, vi } from "vitest";

const { uploadMock, getStoreIdMock } = vi.hoisted(() => ({
  uploadMock: vi.fn(),
  getStoreIdMock: vi.fn(),
}));

vi.mock("@/lib/supabase/permissions-api", () => ({
  isCurrentUserAdmin: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/utils/store", () => ({
  getRuntimeStoreIdSync: getStoreIdMock,
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

  it("prefixes the upload path with {store_id}/ when a store is resolved", async () => {
    getStoreIdMock.mockReturnValue(STORE_ID);
    const { uploadImage } = await import("@/lib/supabase/storage-api");

    const result = await uploadImage(imageFile(), "product-images");

    expect(result.success).toBe(true);
    const [objectPath] = uploadMock.mock.calls[0];
    expect(objectPath).toMatch(new RegExp(`^${STORE_ID}/`));
  });

  it("keeps a flat path when no store is resolved", async () => {
    getStoreIdMock.mockReturnValue(null);
    const { uploadImage } = await import("@/lib/supabase/storage-api");

    await uploadImage(imageFile(), "product-images");

    const [objectPath] = uploadMock.mock.calls[0];
    expect(objectPath).not.toContain("/");
  });
});

describe("uploadImage size limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStoreIdMock.mockReturnValue(STORE_ID);
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

    const rejected = await uploadImage(twoMegabyteImage, "product-images", 1);
    expect(rejected.success).toBe(false);
    expect(rejected.error).toContain("máximo de 1MB");
    expect(uploadMock).not.toHaveBeenCalled();

    const accepted = await uploadImage(twoMegabyteImage, "product-images", 5);
    expect(accepted.success).toBe(true);
  });

  it("defaults to 5MB when the caller states no limit", async () => {
    const { uploadImage } = await import("@/lib/supabase/storage-api");

    const accepted = await uploadImage(imageFile("mediana.webp", 4 * 1024 * 1024), "hero-banner");
    expect(accepted.success).toBe(true);

    const rejected = await uploadImage(imageFile("enorme.webp", 6 * 1024 * 1024), "hero-banner");
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
