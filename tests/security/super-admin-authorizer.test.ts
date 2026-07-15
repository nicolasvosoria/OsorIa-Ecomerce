import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClient, createClient, cookies } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createClient: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("next/headers", () => ({ cookies, headers: vi.fn() }));

import { authorizeSuperAdmin } from "@/lib/supabase/active-store";

function mockAuthUser(userId: string | null) {
  createServerClient.mockReturnValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  });
}

function mockProfileRole(role: string | null) {
  const profileChain: any = {
    select: vi.fn(() => profileChain),
    eq: vi.fn(() => profileChain),
    single: vi.fn().mockResolvedValue({
      data: role === null ? null : { role },
      error: null,
    }),
  };

  createClient.mockReturnValue({
    schema: vi.fn().mockReturnValue({
      from: vi.fn((table: string) => {
        if (table !== "user_profiles") {
          throw new Error(`unexpected table ${table}`);
        }
        return profileChain;
      }),
    }),
  });
}

describe("authorizeSuperAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    cookies.mockResolvedValue({ get: vi.fn(), set: vi.fn() });
  });

  it("grants the service client to a global super_admin", async () => {
    mockAuthUser("super-1");
    mockProfileRole("super_admin");

    const result = await authorizeSuperAdmin();

    expect(result).toEqual({ supabase: expect.anything(), userId: "super-1" });
  });

  it("denies a store-scoped admin with 403", async () => {
    mockAuthUser("admin-1");
    mockProfileRole("admin");

    const result = await authorizeSuperAdmin();

    expect(result).toEqual({ error: "Acceso denegado", status: 403 });
  });

  it("denies with 401 when there is no authenticated user", async () => {
    mockAuthUser(null);
    mockProfileRole("super_admin");

    const result = await authorizeSuperAdmin();

    expect(result).toEqual({ error: "Acceso denegado", status: 401 });
  });
});
