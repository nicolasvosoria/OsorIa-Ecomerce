import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getActiveTheme,
  getThemes,
  setActiveTheme,
} from "@/lib/supabase/themes-api";
import {
  getSupabaseBrowserClient,
  getSupabaseEcommerce,
} from "@/lib/supabase/client";
import { requireAdmin } from "@/lib/supabase/permissions-api";
import { getStoreId } from "@/lib/utils/store";

vi.mock("@/lib/supabase/permissions-api", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: vi.fn(),
  getSupabaseBrowserClient: vi.fn(),
}));

vi.mock("@/lib/utils/store", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/utils/store")>(
      "@/lib/utils/store",
    );

  return {
    ...actual,
    getStoreId: vi.fn(),
  };
});

const mockedRequireAdmin = vi.mocked(requireAdmin);
const mockedGetSupabaseBrowserClient = vi.mocked(getSupabaseBrowserClient);
const mockedGetSupabaseEcommerce = vi.mocked(getSupabaseEcommerce);
const mockedGetStoreId = vi.mocked(getStoreId);

describe("theme activation admin client contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRequireAdmin.mockResolvedValue();
    mockedGetStoreId.mockResolvedValue(null);
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

  it("routes theme activation through the admin API instead of browser table writes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(setActiveTheme("Claro Original")).resolves.toEqual({
      success: true,
    });

    expect(mockedRequireAdmin).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/theme-activation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer preview-token",
      },
      body: JSON.stringify({
        themeName: "Claro Original",
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

    await expect(setActiveTheme("Claro Original")).resolves.toEqual({
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

    await expect(setActiveTheme("Claro Original")).resolves.toEqual({
      success: true,
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/theme-activation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        themeName: "Claro Original",
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

    await expect(setActiveTheme("Claro Original")).resolves.toEqual({
      success: true,
    });

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/theme-activation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer recovered-token",
      },
      body: JSON.stringify({
        themeName: "Claro Original",
      }),
    });
  });

  it("reads app_themes without emitting store_id filters", async () => {
    mockedGetStoreId.mockResolvedValue("store-123");

    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "theme-1",
          theme_name: "Claro Original",
          colors: {
            primary: "#111111",
            secondary: "#222222",
            accent: "#333333",
            background: "#ffffff",
            foreground: "#000000",
            card: "#f5f5f5",
            cardForeground: "#101010",
            border: "#dedede",
            muted: "#eeeeee",
            mutedForeground: "#444444",
          },
        },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn((table: string) => {
      expect(table).toBe("app_themes");
      return { select };
    });

    mockedGetSupabaseEcommerce.mockReturnValue({ from } as any);

    await expect(getThemes()).resolves.toEqual([
      expect.objectContaining({ theme_name: "Claro Original" }),
    ]);

    expect(from).toHaveBeenCalledWith("app_themes");
    expect(select).toHaveBeenCalledWith("*");
    expect(order).toHaveBeenCalledWith("theme_name");
  });

  it("prefers current app_theme_versions and returns publication fingerprint metadata", async () => {
    mockedGetStoreId.mockResolvedValue("store-123");

    const currentVersion = {
      id: "version-1",
      store_id: "store-123",
      theme_id: "theme-1",
      created_at: "2026-05-14T10:05:00Z",
    };
    const themeRow = {
      id: "theme-1",
      theme_name: "Claro Original",
      updated_at: "2026-05-14T10:00:00Z",
      colors: {
        primary: "#111111",
        secondary: "#222222",
        accent: "#333333",
        background: "#ffffff",
        foreground: "#000000",
        card: "#f5f5f5",
        cardForeground: "#101010",
        border: "#dedede",
        muted: "#eeeeee",
        mutedForeground: "#444444",
      },
    };

    const versionMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: currentVersion, error: null });
    const versionEq2 = vi
      .fn()
      .mockReturnValue({ maybeSingle: versionMaybeSingle });
    const versionEq1 = vi.fn().mockReturnValue({ eq: versionEq2 });
    const versionSelect = vi.fn().mockReturnValue({ eq: versionEq1 });

    const themeMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: themeRow, error: null });
    const themeEq = vi.fn().mockReturnValue({ maybeSingle: themeMaybeSingle });
    const themeSelect = vi.fn().mockReturnValue({ eq: themeEq });

    const from = vi.fn((table: string) => {
      if (table === "app_theme_versions") return { select: versionSelect };
      if (table === "app_themes") return { select: themeSelect };
      throw new Error(`unexpected table ${table}`);
    });

    mockedGetSupabaseEcommerce.mockReturnValue({ from } as any);

    await expect(getActiveTheme()).resolves.toEqual(
      expect.objectContaining({
        theme_name: "Claro Original",
        store_id: "store-123",
        theme_version_id: "version-1",
        theme_published_at: "2026-05-14T10:05:00Z",
        theme_fingerprint: expect.stringMatching(
          /^v1:store-123:version-1:theme-1:2026-05-14T10:00:00Z:/,
        ),
      }),
    );
    expect(versionSelect).toHaveBeenCalledWith(
      "id, store_id, theme_id, created_at",
    );
  });

  it("returns the confirmed active theme from successful activation", async () => {
    const activeTheme = {
      theme_name: "Claro Original",
      theme_fingerprint: "v1:store-1:version-1:theme-1:stamp:hash",
      colors: { primary: "#111111" },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, activeTheme }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(setActiveTheme("Claro Original")).resolves.toEqual({
      success: true,
      activeTheme,
    });
  });

  it("falls back to active theme without store_id filters when version lookup misses", async () => {
    mockedGetStoreId.mockResolvedValue("store-123");

    const maybeSingleVersion = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const appThemeVersionsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: maybeSingleVersion,
        }),
      }),
    });

    const maybeSingleTheme = vi.fn().mockResolvedValue({
      data: {
        id: "theme-1",
        theme_name: "Claro Original",
        colors: {
          primary: "#111111",
          secondary: "#222222",
          accent: "#333333",
          background: "#ffffff",
          foreground: "#000000",
          card: "#f5f5f5",
          cardForeground: "#101010",
          border: "#dedede",
          muted: "#eeeeee",
          mutedForeground: "#444444",
        },
      },
      error: null,
    });
    const limit = vi.fn().mockReturnValue({ maybeSingle: maybeSingleTheme });
    const eqIsActive = vi.fn().mockReturnValue({ limit });
    const appThemesSelect = vi.fn().mockReturnValue({ eq: eqIsActive });

    const from = vi.fn((table: string) => {
      if (table === "app_theme_versions") {
        return { select: appThemeVersionsSelect };
      }

      if (table === "app_themes") {
        return { select: appThemesSelect };
      }

      throw new Error(`unexpected table ${table}`);
    });

    mockedGetSupabaseEcommerce.mockReturnValue({ from } as any);

    await expect(getActiveTheme()).resolves.toEqual(
      expect.objectContaining({ theme_name: "Claro Original" }),
    );

    expect(from).toHaveBeenCalledWith("app_theme_versions");
    expect(from).toHaveBeenCalledWith("app_themes");
    expect(eqIsActive).toHaveBeenCalledWith("is_active", true);
    expect(limit).toHaveBeenCalledWith(1);
  });
});
