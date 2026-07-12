import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateHomeComposition } from "@/lib/supabase/home-composition-api";
import {
  getSupabaseBrowserClient,
  getSupabaseEcommerce,
} from "@/lib/supabase/client";
import { requireAdmin } from "@/lib/supabase/permissions-api";
import { getRuntimeStoreId } from "@/lib/utils/store";

vi.mock("@/lib/supabase/permissions-api", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: vi.fn(),
  getSupabaseBrowserClient: vi.fn(),
}));

vi.mock("@/lib/utils/store", () => ({
  getRuntimeStoreId: vi.fn(),
}));

const mockedRequireAdmin = vi.mocked(requireAdmin);
const mockedGetSupabaseBrowserClient = vi.mocked(getSupabaseBrowserClient);
const mockedGetSupabaseEcommerce = vi.mocked(getSupabaseEcommerce);
const mockedGetRuntimeStoreId = vi.mocked(getRuntimeStoreId);

describe("home composition admin client contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireAdmin.mockResolvedValue();
    mockedGetRuntimeStoreId.mockResolvedValue("store-1");
    mockedGetSupabaseBrowserClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "live-admin" } },
        }),
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "preview-token",
              user: { id: "live-admin" },
            },
          },
        }),
        refreshSession: vi.fn(),
      },
    } as any);
    mockedGetSupabaseEcommerce.mockImplementation(() => {
      throw new Error("browser client write path should not be used");
    });
  });

  it("routes home composition saves through the admin API instead of browser table writes", async () => {
    const sections = [{ key: "hero", enabled: false }];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: sections }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(updateHomeComposition(sections)).resolves.toEqual(sections);

    expect(mockedRequireAdmin).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/home-composition", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer preview-token",
      },
      body: JSON.stringify({ sections }),
    });
    expect(mockedGetSupabaseEcommerce).not.toHaveBeenCalled();
  });

  it("surfaces API errors without falling back to direct browser writes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Acceso denegado" }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateHomeComposition([{ key: "hero", enabled: true }]),
    ).rejects.toThrow("Acceso denegado");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockedGetSupabaseEcommerce).not.toHaveBeenCalled();
  });
});
