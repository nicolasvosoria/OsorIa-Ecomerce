import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/admin/theme-activation/route";

const { createServerClient, createClient, cookies } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createClient: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

vi.mock("next/headers", () => ({
  cookies,
}));

function makeCookieStore(storeId = "store-1") {
  return {
    get: vi.fn((name: string) => {
      if (name === "store_id") {
        return { value: storeId };
      }

      return undefined;
    }),
    set: vi.fn(),
  };
}

function makeUserProfilesQuery(role: string | null) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue({
      data: role ? { role } : null,
      error: null,
    }),
  };

  return chain;
}

function makeThemeQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
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
    }),
  };
}

function makeThemeVersionsTable() {
  const existingQuery = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: { id: "version-1" }, error: null }),
  };
  const deactivateChain = { eq: vi.fn().mockResolvedValue({ error: null }) };
  const activateChain = { eq: vi.fn().mockResolvedValue({ error: null }) };
  const update = vi.fn((payload: { is_current?: boolean }) =>
    payload.is_current === false ? deactivateChain : activateChain,
  );

  return {
    update,
    activateChain,
    select: vi.fn().mockReturnValue(existingQuery),
  };
}

function makeComponentStylesTable(options: {
  rows?: unknown[];
  readError?: unknown;
  updateError?: unknown;
} = {}) {
  const { rows = [], readError = null, updateError = null } = options;

  const selectEq = vi.fn().mockResolvedValue({ data: rows, error: readError });
  const updateEqById = vi.fn().mockResolvedValue({ error: updateError });
  const updateEqByStore = vi.fn(() => ({ eq: updateEqById }));

  return {
    select: vi.fn(() => ({ eq: selectEq })),
    update: vi.fn(() => ({ eq: updateEqByStore })),
    selectEq,
    updateEqByStore,
    updateEqById,
  };
}

function makeRequest(themeName = "Claro Original", headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/theme-activation", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ themeName }),
  });
}

describe("theme activation route: reset + backup (D3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    cookies.mockResolvedValue(makeCookieStore());
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      },
    });
  });

  it("backs up component_styles into variables.backup_component_styles, then strips only the products style keys (content preserved, rows never deleted)", async () => {
    const userProfilesQuery = makeUserProfilesQuery("admin");
    const themeQuery = makeThemeQuery();
    const themeVersionsTable = makeThemeVersionsTable();
    const backupRows = [
      {
        id: "row-1",
        component_name: "products",
        store_id: "store-1",
        variables: {
          title: "Productos populares",
          eyebrow: "Electrónica",
          cardBgColor: "#f2f2f2",
          cornerRadius: "xl",
        },
      },
      {
        id: "row-2",
        component_name: "footer",
        store_id: "store-1",
        variables: { color: "red" },
      },
    ];
    const componentStylesTable = makeComponentStylesTable({ rows: backupRows });

    const serviceSchema = {
      from: vi.fn((table: string) => {
        if (table === "user_profiles") return userProfilesQuery;
        if (table === "app_themes") return themeQuery;
        if (table === "app_theme_versions") return themeVersionsTable;
        if (table === "component_styles") return componentStylesTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    // Read happens before any modification, and it is store-scoped.
    expect(componentStylesTable.select).toHaveBeenCalledWith("*");
    expect(componentStylesTable.selectEq).toHaveBeenCalledWith(
      "store_id",
      "store-1",
    );

    // The backup snapshot is nested under `variables.backup_component_styles`
    // in the same `app_theme_versions` write, and never as its own top-level
    // column (so the Slice-4 definition parser safely ignores it).
    expect(themeVersionsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_current: true,
        variables: expect.objectContaining({
          backup_component_styles: expect.objectContaining({
            snapshot: backupRows,
            backedUpAt: expect.any(String),
          }),
        }),
      }),
    );

    // Only the products row has registered style keys, so it is the only
    // one updated: its style keys are stripped but its content survives.
    expect(componentStylesTable.update).toHaveBeenCalledTimes(1);
    expect(componentStylesTable.update).toHaveBeenCalledWith({
      variables: { title: "Productos populares", eyebrow: "Electrónica" },
    });

    // The update is scoped to both the store and the specific row: never a
    // global wipe, and rows are never deleted.
    expect(componentStylesTable.updateEqByStore).toHaveBeenCalledWith(
      "store_id",
      "store-1",
    );
    expect(componentStylesTable.updateEqById).toHaveBeenCalledWith(
      "id",
      "row-1",
    );
  });

  it("stays admin-guarded: non-admin requests never reach the backup or reset step", async () => {
    const userProfilesQuery = makeUserProfilesQuery("user");
    const componentStylesTable = makeComponentStylesTable({ rows: [] });

    const serviceSchema = {
      from: vi.fn((table: string) => {
        if (table === "user_profiles") return userProfilesQuery;
        if (table === "component_styles") return componentStylesTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Acceso denegado",
    });
    expect(componentStylesTable.select).not.toHaveBeenCalled();
    expect(componentStylesTable.update).not.toHaveBeenCalled();
  });

  it("does NOT modify component_styles when the backup read fails (fail safe)", async () => {
    const userProfilesQuery = makeUserProfilesQuery("admin");
    const themeQuery = makeThemeQuery();
    const themeVersionsTable = makeThemeVersionsTable();
    const componentStylesTable = makeComponentStylesTable({
      readError: { message: "boom" },
    });

    const serviceSchema = {
      from: vi.fn((table: string) => {
        if (table === "user_profiles") return userProfilesQuery;
        if (table === "app_themes") return themeQuery;
        if (table === "app_theme_versions") return themeVersionsTable;
        if (table === "component_styles") return componentStylesTable;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(makeRequest());

    // Theme activation itself still succeeds...
    expect(response.status).toBe(200);
    // ...but the reset is skipped entirely: no update call at all.
    expect(componentStylesTable.update).not.toHaveBeenCalled();
    // And the version row never carries a backup key it can't vouch for.
    expect(themeVersionsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_current: true,
        variables: expect.not.objectContaining({
          backup_component_styles: expect.anything(),
        }),
      }),
    );
  });
});
