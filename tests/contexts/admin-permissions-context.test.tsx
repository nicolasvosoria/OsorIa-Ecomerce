import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockIsCurrentUserAdmin = vi.hoisted(() => vi.fn());
const mockGetCurrentUserRole = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({
  isLoading: false,
  isAuthenticated: true,
  user: { id: "admin-1", email: "admin@example.com" },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/supabase/permissions-api", () => ({
  isCurrentUserAdmin: () => mockIsCurrentUserAdmin(),
  getCurrentUserRole: () => mockGetCurrentUserRole(),
}));

import {
  AdminPermissionsProvider,
  useAdminPermissions,
} from "@/contexts/admin-permissions-context";

function Harness() {
  const { isAdmin, role, loading, hasChecked } = useAdminPermissions();

  return (
    <div>
      <div data-testid="is-admin">{String(isAdmin)}</div>
      <div data-testid="role">{role ?? "none"}</div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="has-checked">{String(hasChecked)}</div>
    </div>
  );
}

function renderHarness() {
  return render(
    <AdminPermissionsProvider>
      <Harness />
    </AdminPermissionsProvider>,
  );
}

describe("AdminPermissionsProvider deny-until-verified fallback", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    authState.isLoading = false;
    authState.isAuthenticated = true;
    authState.user = { id: "admin-1", email: "admin@example.com" };
    mockIsCurrentUserAdmin.mockResolvedValue(true);
    mockGetCurrentUserRole.mockResolvedValue("admin");
  });

  it("keeps permissions loading until the authenticated user's admin role is verified", async () => {
    let resolveAdmin!: (value: boolean) => void;
    let resolveRole!: (value: string) => void;
    mockIsCurrentUserAdmin.mockReturnValue(
      new Promise((resolve) => {
        resolveAdmin = resolve;
      }),
    );
    mockGetCurrentUserRole.mockReturnValue(
      new Promise((resolve) => {
        resolveRole = resolve;
      }),
    );

    renderHarness();

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(screen.getByTestId("has-checked")).toHaveTextContent("false");
    expect(screen.getByTestId("is-admin")).toHaveTextContent("false");

    resolveAdmin(true);
    resolveRole("admin");

    await waitFor(() => {
      expect(screen.getByTestId("has-checked")).toHaveTextContent("true");
    });
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("is-admin")).toHaveTextContent("true");
    expect(screen.getByTestId("role")).toHaveTextContent("admin");
  });

  it("rechecks permissions when the authenticated user id changes so stale admin state cannot leak", async () => {
    const { rerender } = renderHarness();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("is-admin")).toHaveTextContent("true");
    expect(mockIsCurrentUserAdmin).toHaveBeenCalledTimes(1);

    mockIsCurrentUserAdmin.mockResolvedValue(false);
    mockGetCurrentUserRole.mockResolvedValue("user");
    authState.user = { id: "customer-1", email: "customer@example.com" };

    rerender(
      <AdminPermissionsProvider>
        <Harness />
      </AdminPermissionsProvider>,
    );

    await waitFor(() => {
      expect(mockIsCurrentUserAdmin).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("has-checked")).toHaveTextContent("true");
    expect(screen.getByTestId("is-admin")).toHaveTextContent("false");
    expect(screen.getByTestId("role")).toHaveTextContent("user");
  });

  it("ignores a stale admin verification that resolves after the authenticated user changes", async () => {
    let resolveFirstAdmin!: (value: boolean) => void;
    let resolveFirstRole!: (value: string) => void;
    mockIsCurrentUserAdmin
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirstAdmin = resolve;
        }),
      )
      .mockResolvedValueOnce(false);
    mockGetCurrentUserRole
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirstRole = resolve;
        }),
      )
      .mockResolvedValueOnce("user");

    const { rerender } = renderHarness();

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    await waitFor(() => {
      expect(mockIsCurrentUserAdmin).toHaveBeenCalledTimes(1);
    });

    authState.user = { id: "customer-1", email: "customer@example.com" };

    rerender(
      <AdminPermissionsProvider>
        <Harness />
      </AdminPermissionsProvider>,
    );

    await waitFor(() => {
      expect(mockIsCurrentUserAdmin).toHaveBeenCalledTimes(2);
    });

    resolveFirstAdmin(true);
    resolveFirstRole("admin");

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("has-checked")).toHaveTextContent("true");
    expect(screen.getByTestId("is-admin")).toHaveTextContent("false");
    expect(screen.getByTestId("role")).toHaveTextContent("user");
  });
});
