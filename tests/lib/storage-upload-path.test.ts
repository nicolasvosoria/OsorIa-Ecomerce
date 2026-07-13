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

function imageFile(name = "photo.webp"): File {
  const bytes = new Uint8Array(16);
  return {
    name,
    type: "image/webp",
    size: bytes.byteLength,
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
