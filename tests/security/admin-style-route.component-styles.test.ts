import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/admin/component-styles/route";

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

function makeUserProfilesQuery(
  role: string | null | Record<string, string | null>,
) {
  let currentId: string | null = null;
  const chain: any = {
    select: vi.fn().mockImplementation(() => chain),
    eq: vi.fn().mockImplementation((column: string, value: string) => {
      if (column === "id") {
        currentId = value;
      }

      return chain;
    }),
    single: vi.fn().mockImplementation(async () => {
      const resolvedRole =
        typeof role === "string" || role === null
          ? role
          : currentId
            ? (role[currentId] ?? null)
            : null;

      return {
        data: resolvedRole ? { role: resolvedRole } : null,
        error: null,
      };
    }),
  };

  return chain;
}

function makeExistingStyleQuery(existingId?: string) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: existingId ? { id: existingId } : null,
      error: null,
    }),
  };

  return chain;
}

describe("component styles admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    cookies.mockResolvedValue(makeCookieStore());
  });

  it("rejects non-admin users before writing component styles", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
    });

    const userProfilesQuery = makeUserProfilesQuery("user");
    const serviceSchema = {
      from: vi.fn((table: string) => {
        if (table === "user_profiles") return userProfilesQuery;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(serviceSchema),
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/component-styles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          componentName: "header",
          variables: { bgColor: "#111111" },
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Acceso denegado",
    });
    expect(serviceSchema.from).toHaveBeenCalledWith("user_profiles");
    expect(serviceSchema.from).not.toHaveBeenCalledWith("component_styles");
  });

  it("writes through the service role path for authenticated admins", async () => {
    const getUser = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    createServerClient.mockReturnValue({
      auth: {
        getUser,
      },
    });

    const userProfilesQuery = makeUserProfilesQuery("admin");
    const existingStyleQuery = makeExistingStyleQuery("style-1");
    const updatedRow = {
      id: "style-1",
      component_name: "header",
      store_id: "store-1",
      variables: { bgColor: "#111111" },
      updated_at: "2026-04-17T12:00:00.000Z",
    };
    const updateChain = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
    };
    const componentStylesTable = {
      select: vi.fn().mockReturnValue(existingStyleQuery),
      update: vi.fn().mockReturnValue(updateChain),
    };
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

    const response = await POST(
      new NextRequest("http://localhost/api/admin/component-styles", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer preview-token",
        },
        body: JSON.stringify({
          componentName: "header",
          variables: { bgColor: "#111111" },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: updatedRow });
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role-key",
    );
    expect(componentStylesTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { bgColor: "#111111" },
      }),
    );
    expect(getUser).toHaveBeenCalledWith("preview-token");
  });

  it("accepts cookie-backed admin requests without a bearer token", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "cookie-admin" } },
          error: null,
        }),
      },
    });

    const userProfilesQuery = makeUserProfilesQuery("admin");
    const existingStyleQuery = makeExistingStyleQuery("style-1");
    const updatedRow = {
      id: "style-1",
      component_name: "header",
      store_id: "store-1",
      variables: { bgColor: "#111111" },
      updated_at: "2026-04-17T12:00:00.000Z",
    };
    const updateChain = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
    };
    const componentStylesTable = {
      select: vi.fn().mockReturnValue(existingStyleQuery),
      update: vi.fn().mockReturnValue(updateChain),
    };
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

    const response = await POST(
      new NextRequest("http://localhost/api/admin/component-styles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          componentName: "header",
          variables: { bgColor: "#111111" },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: updatedRow });
  });

  it("accepts drifted bearer requests when the cookie identity is admin", async () => {
    const getUser = vi.fn().mockImplementation(async (token?: string) => {
      if (token === "preview-token") {
        return { data: { user: { id: "stale-user" } }, error: null };
      }

      return { data: { user: { id: "cookie-admin" } }, error: null };
    });

    createServerClient.mockReturnValue({
      auth: {
        getUser,
      },
    });

    const userProfilesQuery = makeUserProfilesQuery({
      "stale-user": "user",
      "cookie-admin": "admin",
    });
    const existingStyleQuery = makeExistingStyleQuery("style-1");
    const updatedRow = {
      id: "style-1",
      component_name: "header",
      store_id: "store-1",
      variables: { bgColor: "#111111" },
      updated_at: "2026-04-17T12:00:00.000Z",
    };
    const updateChain = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
    };
    const componentStylesTable = {
      select: vi.fn().mockReturnValue(existingStyleQuery),
      update: vi.fn().mockReturnValue(updateChain),
    };
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

    const response = await POST(
      new NextRequest("http://localhost/api/admin/component-styles", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer preview-token",
        },
        body: JSON.stringify({
          componentName: "header",
          variables: { bgColor: "#111111" },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: updatedRow });
    expect(getUser).toHaveBeenCalledWith("preview-token");
    expect(getUser).toHaveBeenCalledWith();
  });
});
