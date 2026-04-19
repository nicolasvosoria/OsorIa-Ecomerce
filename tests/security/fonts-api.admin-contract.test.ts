import { beforeEach, describe, expect, it, vi } from "vitest";

import { setActiveFont } from "@/lib/supabase/fonts-api";
import {
  getSupabaseBrowserClient,
  getSupabaseEcommerce,
} from "@/lib/supabase/client";
import { requireAdmin } from "@/lib/supabase/permissions-api";

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

describe("font activation admin client contract", () => {
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

  it("routes font activation through the admin API instead of browser table writes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(setActiveFont("Poppins")).resolves.toEqual({
      success: true,
    });

    expect(mockedRequireAdmin).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/font-activation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer preview-token",
      },
      body: JSON.stringify({
        fontName: "Poppins",
      }),
    });
    expect(mockedGetSupabaseEcommerce).not.toHaveBeenCalled();
  });

  it("surfaces admin route errors without falling back to direct browser writes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Acceso denegado" }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(setActiveFont("Poppins")).resolves.toEqual({
      success: false,
      error: "Acceso denegado",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockedGetSupabaseEcommerce).not.toHaveBeenCalled();
  });

  it("omits the bearer header when no session token is available", async () => {
    mockedGetSupabaseBrowserClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        refreshSession: vi.fn(),
      },
    } as any);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(setActiveFont("Poppins")).resolves.toEqual({
      success: true,
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/font-activation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fontName: "Poppins",
      }),
    });
  });

  it("refreshes a stale session when requireAdmin validated a different live user", async () => {
    const refreshSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "recovered-token",
          user: { id: "live-admin" },
        },
      },
    });

    mockedGetSupabaseBrowserClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "live-admin" } },
        }),
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "stale-token",
              user: { id: "stale-user" },
            },
          },
        }),
        refreshSession,
      },
    } as any);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(setActiveFont("Poppins")).resolves.toEqual({
      success: true,
    });

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/font-activation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer recovered-token",
      },
      body: JSON.stringify({
        fontName: "Poppins",
      }),
    });
  });
});
