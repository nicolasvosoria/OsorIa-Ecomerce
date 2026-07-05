import { beforeEach, describe, expect, it, vi } from "vitest";

import { setActivePairing } from "@/lib/supabase/fonts-api";
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

describe("font pairing activation admin client contract", () => {
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

  it("routes pairing activation through the admin API instead of browser table writes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      setActivePairing("todo-serif-heading-sans-body"),
    ).resolves.toEqual({
      success: true,
    });

    expect(mockedRequireAdmin).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/font-pairing-activation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer preview-token",
        },
        body: JSON.stringify({
          pairingName: "todo-serif-heading-sans-body",
        }),
      },
    );
    expect(mockedGetSupabaseEcommerce).not.toHaveBeenCalled();
  });

  it("surfaces admin route errors without falling back to direct browser writes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Acceso denegado" }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      setActivePairing("todo-serif-heading-sans-body"),
    ).resolves.toEqual({
      success: false,
      error: "Acceso denegado",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockedGetSupabaseEcommerce).not.toHaveBeenCalled();
  });

  it("does not call the admin route when the caller is not an admin", async () => {
    mockedRequireAdmin.mockRejectedValue(
      new Error("Acceso denegado: Se requieren permisos de administrador"),
    );

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      setActivePairing("todo-serif-heading-sans-body"),
    ).resolves.toEqual({
      success: false,
      error: "Acceso denegado: Se requieren permisos de administrador",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedGetSupabaseEcommerce).not.toHaveBeenCalled();
  });
});
