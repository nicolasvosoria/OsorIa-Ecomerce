import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateShopConfig } from "@/lib/supabase/shop-config-api";
import {
  getSupabaseBrowserClient,
  getSupabaseEcommerce,
} from "@/lib/supabase/client";
import { requireAdmin } from "@/lib/supabase/permissions-api";
import { DEFAULT_SHOP_CONFIG } from "@/lib/shop/shop-config";

vi.mock("@/lib/supabase/permissions-api", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: vi.fn(),
  getSupabaseBrowserClient: vi.fn(),
}));

const mockedRequireAdmin = vi.mocked(requireAdmin);
const mockedGetSupabaseBrowserClient = vi.mocked(getSupabaseBrowserClient);
const mockedGetSupabaseEcommerce = vi.mocked(getSupabaseEcommerce);

describe("shop config admin client contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireAdmin.mockResolvedValue();
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

  it("routes shop config saves through the admin API instead of browser table writes", async () => {
    const config = DEFAULT_SHOP_CONFIG;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: config }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(updateShopConfig(config)).resolves.toEqual(config);

    expect(mockedRequireAdmin).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/shop-config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer preview-token",
      },
      body: JSON.stringify({ config }),
    });
    expect(mockedGetSupabaseEcommerce).not.toHaveBeenCalled();
  });

  it("surfaces API errors without falling back to direct browser writes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Acceso denegado" }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(updateShopConfig(DEFAULT_SHOP_CONFIG)).rejects.toThrow(
      "Acceso denegado",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockedGetSupabaseEcommerce).not.toHaveBeenCalled();
  });
});
