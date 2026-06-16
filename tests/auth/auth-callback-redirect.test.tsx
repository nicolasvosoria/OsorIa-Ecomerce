import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routerPush = vi.hoisted(() => vi.fn());
const searchParamsGet = vi.hoisted(() => vi.fn());
const exchangeCodeForSession = vi.hoisted(() => vi.fn());
const getSession = vi.hoisted(() => vi.fn());
const getCurrentUser = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
  useSearchParams: () => ({ get: searchParamsGet }),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      exchangeCodeForSession,
      getSession,
    },
  }),
}));

vi.mock("@/lib/supabase/auth-api", () => ({
  getCurrentUser,
}));

import AuthCallback from "@/app/auth/callback/page";

describe("auth callback safe return destinations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsGet.mockImplementation((key: string) => {
      const values: Record<string, string | null> = {
        code: "auth-code",
        error: null,
        error_description: null,
        next: null,
        redirect: null,
      };
      return values[key] ?? null;
    });
    exchangeCodeForSession.mockResolvedValue({ data: { session: { access_token: "token" } }, error: null });
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    getCurrentUser.mockResolvedValue({ success: true, user: { id: "admin-1", email: "admin@example.com", role: "admin" } });
  });

  it("returns an admin to a safe admin next destination after code exchange", async () => {
    searchParamsGet.mockImplementation((key: string) => {
      const values: Record<string, string | null> = {
        code: "auth-code",
        error: null,
        error_description: null,
        next: "/admin/orders?status=open",
        redirect: null,
      };
      return values[key] ?? null;
    });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/admin/orders?status=open");
    });
  });

  it.each([
    "https://evil.example/admin/orders",
    "//evil.example/admin/orders",
  ])("rejects unsafe external next destination %s and preserves confirmation success", async (unsafeNext) => {
    searchParamsGet.mockImplementation((key: string) => {
      const values: Record<string, string | null> = {
        code: "auth-code",
        error: null,
        error_description: null,
        next: unsafeNext,
        redirect: null,
      };
      return values[key] ?? null;
    });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/auth/cuenta-confirmada");
    });
    expect(routerPush).not.toHaveBeenCalledWith(expect.stringContaining("evil"));
  });

  it("does not send a non-admin user into an admin next destination", async () => {
    searchParamsGet.mockImplementation((key: string) => {
      const values: Record<string, string | null> = {
        code: "auth-code",
        error: null,
        error_description: null,
        next: "/admin/orders",
        redirect: null,
      };
      return values[key] ?? null;
    });
    getCurrentUser.mockResolvedValue({ success: true, user: { id: "user-1", email: "user@example.com", role: "user" } });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/?admin_access=denied");
    });
    expect(routerPush).not.toHaveBeenCalledWith("/admin/orders");
  });

  it("preserves the callback error branch", async () => {
    searchParamsGet.mockImplementation((key: string) => {
      const values: Record<string, string | null> = {
        code: null,
        error: "access_denied",
        error_description: "Denied",
        next: "/admin/orders",
        redirect: null,
      };
      return values[key] ?? null;
    });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/?error=auth_callback_failed");
    });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("preserves the no-session branch when there is no code and no active session", async () => {
    searchParamsGet.mockImplementation((key: string) => {
      const values: Record<string, string | null> = {
        code: null,
        error: null,
        error_description: null,
        next: "/admin/orders",
        redirect: null,
      };
      return values[key] ?? null;
    });
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/?error=no_session");
    });
  });

  it("uses a safe admin next destination for an existing admin session", async () => {
    searchParamsGet.mockImplementation((key: string) => {
      const values: Record<string, string | null> = {
        code: null,
        error: null,
        error_description: null,
        next: "/admin/orders",
        redirect: null,
      };
      return values[key] ?? null;
    });
    getSession.mockResolvedValue({ data: { session: { access_token: "existing" } }, error: null });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/admin/orders");
    });
  });
});
