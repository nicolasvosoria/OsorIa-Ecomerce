import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: getUserMock },
  })),
}));

function makeRequest() {
  return new NextRequest("http://localhost:3000/admin", {
    headers: { host: "localhost:3000" },
  });
}

// D22: the flag lives in the session's OWN app_metadata (set service-role-
// only by lib/auth/platform-identity-invites.ts, never user_metadata, which
// the client SDK could rewrite itself) -- these prove isInvitedPendingPassword
// reads exactly that field and nothing weaker.
describe("isInvitedPendingPassword", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    getUserMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is true when the session's app_metadata carries the flag", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "invited-1", app_metadata: { invited_pending_password: true } } },
    });
    const { isInvitedPendingPassword } = await import("@/lib/auth/invited-session-gate");

    await expect(isInvitedPendingPassword(makeRequest())).resolves.toBe(true);
  });

  it("is false for a session with no such flag at all", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "regular-1", app_metadata: {} } } });
    const { isInvitedPendingPassword } = await import("@/lib/auth/invited-session-gate");

    await expect(isInvitedPendingPassword(makeRequest())).resolves.toBe(false);
  });

  it("is false once the flag was cleared (D22's own completion path)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "invited-1", app_metadata: { invited_pending_password: false } } },
    });
    const { isInvitedPendingPassword } = await import("@/lib/auth/invited-session-gate");

    await expect(isInvitedPendingPassword(makeRequest())).resolves.toBe(false);
  });

  it("is false for an anonymous request with no session at all", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { isInvitedPendingPassword } = await import("@/lib/auth/invited-session-gate");

    await expect(isInvitedPendingPassword(makeRequest())).resolves.toBe(false);
  });

  it("is false, not a throw, when Supabase is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const { isInvitedPendingPassword } = await import("@/lib/auth/invited-session-gate");

    await expect(isInvitedPendingPassword(makeRequest())).resolves.toBe(false);
    expect(getUserMock).not.toHaveBeenCalled();
  });
});
