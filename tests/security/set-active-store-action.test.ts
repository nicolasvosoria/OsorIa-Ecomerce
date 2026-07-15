import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClient, createClient, cookies, revalidatePath } =
  vi.hoisted(() => ({
    createServerClient: vi.fn(),
    createClient: vi.fn(),
    cookies: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("next/headers", () => ({ cookies }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { setActiveStore } from "@/app/admin/actions/active-store";
import {
  ACTIVE_STORE_COOKIE,
  verifyActiveStore,
} from "@/lib/admin/active-store-cookie";

const TARGET_STORE = "store-target";

function mockAuthUser(userId: string | null) {
  createServerClient.mockReturnValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  });
}

function mockCookieSetter() {
  const set = vi.fn();
  cookies.mockResolvedValue({ get: vi.fn(), set });
  return set;
}

function mockServiceClient(manageableStores: Record<string, boolean>) {
  const rpc = vi.fn(async (fnName: string, params: { p_store_id: string }) => {
    if (fnName !== "can_user_manage_store") {
      throw new Error(`unexpected rpc ${fnName}`);
    }

    return { data: manageableStores[params.p_store_id] === true, error: null };
  });

  createClient.mockReturnValue({
    schema: vi.fn().mockReturnValue({ rpc }),
  });

  return rpc;
}

describe("setActiveStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.ADMIN_COOKIE_SECRET = "test-cookie-secret";
  });

  it("sets the signed active-store cookie and revalidates the admin layout when the store is manageable", async () => {
    mockAuthUser("admin-1");
    const setCookie = mockCookieSetter();
    mockServiceClient({ [TARGET_STORE]: true });

    const result = await setActiveStore(TARGET_STORE);

    expect(result).toEqual({ success: true });
    expect(setCookie).toHaveBeenCalledTimes(1);
    const [cookieName, cookieValue] = setCookie.mock.calls[0];
    expect(cookieName).toBe(ACTIVE_STORE_COOKIE);
    expect(verifyActiveStore(cookieValue)).toBe(TARGET_STORE);
    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
  });

  it("returns a failure and never sets the cookie when the store is not manageable", async () => {
    mockAuthUser("admin-1");
    const setCookie = mockCookieSetter();
    mockServiceClient({ [TARGET_STORE]: false });

    const result = await setActiveStore(TARGET_STORE);

    expect(result).toEqual({ success: false, error: "Acceso denegado" });
    expect(setCookie).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a failure and never sets the cookie when there is no authenticated user", async () => {
    mockAuthUser(null);
    const setCookie = mockCookieSetter();
    mockServiceClient({ [TARGET_STORE]: true });

    const result = await setActiveStore(TARGET_STORE);

    expect(result).toEqual({ success: false, error: "Acceso denegado" });
    expect(setCookie).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
