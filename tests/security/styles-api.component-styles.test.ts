import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateComponentStyle } from "@/lib/supabase/styles-api";
import { getSupabaseEcommerce } from "@/lib/supabase/client";
import { requireAdmin } from "@/lib/supabase/permissions-api";

vi.mock("@/lib/supabase/permissions-api", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: vi.fn(),
  getSupabaseBrowserClient: vi.fn(),
}));

const mockedRequireAdmin = vi.mocked(requireAdmin);
const mockedGetSupabaseEcommerce = vi.mocked(getSupabaseEcommerce);

describe("component styles admin client contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireAdmin.mockResolvedValue();
    mockedGetSupabaseEcommerce.mockImplementation(() => {
      throw new Error("browser client write path should not be used");
    });
  });

  it("routes component style saves through the admin API instead of browser table writes", async () => {
    const payload = {
      id: "style-1",
      component_name: "header",
      store_id: "store-1",
      variables: { bgColor: "#111111" },
      updated_at: "2026-04-17T12:00:00.000Z",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: payload }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateComponentStyle("header", { bgColor: "#111111" }),
    ).resolves.toEqual(payload);

    expect(mockedRequireAdmin).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/component-styles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        componentName: "header",
        variables: { bgColor: "#111111" },
      }),
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
      updateComponentStyle("header", { bgColor: "#111111" }),
    ).rejects.toThrow("Acceso denegado");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockedGetSupabaseEcommerce).not.toHaveBeenCalled();
  });
});
