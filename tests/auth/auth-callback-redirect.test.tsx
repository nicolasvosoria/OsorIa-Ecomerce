import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routerPush = vi.hoisted(() => vi.fn());
const searchParamsGet = vi.hoisted(() => vi.fn());
const exchangeCodeForSession = vi.hoisted(() => vi.fn());
const getSession = vi.hoisted(() => vi.fn());
const isCurrentUserAdminOrUnverified = vi.hoisted(() => vi.fn());
const currentUserMustChangePassword = vi.hoisted(() => vi.fn());
const finalizeCustomerSignup = vi.hoisted(() => vi.fn());

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

vi.mock("@/lib/supabase/permissions-api", () => ({
  isCurrentUserAdminOrUnverified,
  currentUserMustChangePassword,
}));

// D23: mockeado como un no-op exitoso salvo que un test lo diga -- su
// comportamiento real (idempotencia, consumo de un solo uso) se prueba en
// supabase/checks/verify-email-platform-contract.sql, no aquí (D41).
vi.mock("@/lib/auth/finalize-signup-action", () => ({
  finalizeCustomerSignup,
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
    finalizeCustomerSignup.mockResolvedValue({ ok: true });
    isCurrentUserAdminOrUnverified.mockResolvedValue(true);
    currentUserMustChangePassword.mockResolvedValue(false);
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

  it("does not send a user that manages no store into an admin next destination", async () => {
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
    isCurrentUserAdminOrUnverified.mockResolvedValue(false);

    render(<AuthCallback />);

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/?admin_access=denied");
    });
    expect(routerPush).not.toHaveBeenCalledWith("/admin/orders");
  });

  it("keeps the admin next destination when the admin check is unverified", async () => {
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
    isCurrentUserAdminOrUnverified.mockResolvedValue(true);

    render(<AuthCallback />);

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/admin/orders");
    });
    expect(routerPush).not.toHaveBeenCalledWith("/?error=auth_callback_failed");
  });

  it("forces a minted owner with a temporary password to the change screen before the next path", async () => {
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
    currentUserMustChangePassword.mockResolvedValue(true);

    render(<AuthCallback />);

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/auth/force-password-change");
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

  // D23: la finalización solo se intenta tras un exchangeCodeForSession
  // FRESCO -- nunca en la rama "ya había sesión" (no hay confirmación que
  // atar a un intent ahí), y siempre con lo que traiga `intent` en la URL.
  it("finalizes the customer profile with the intent token after a fresh code exchange", async () => {
    searchParamsGet.mockImplementation((key: string) => {
      const values: Record<string, string | null> = {
        code: "auth-code",
        error: null,
        error_description: null,
        next: null,
        redirect: null,
        intent: "raw-intent-token",
      };
      return values[key] ?? null;
    });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(finalizeCustomerSignup).toHaveBeenCalledWith("raw-intent-token");
    });
  });

  it("never finalizes a profile when the callback only found an existing session (no fresh code)", async () => {
    searchParamsGet.mockImplementation((key: string) => {
      const values: Record<string, string | null> = {
        code: null,
        error: null,
        error_description: null,
        next: null,
        redirect: null,
      };
      return values[key] ?? null;
    });
    getSession.mockResolvedValue({ data: { session: { access_token: "existing" } }, error: null });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalled();
    });
    expect(finalizeCustomerSignup).not.toHaveBeenCalled();
  });
});
