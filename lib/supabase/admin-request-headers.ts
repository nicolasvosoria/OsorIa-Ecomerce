import { getSupabaseBrowserClient } from "./client";

async function resolveLiveAdminSession(authClient: any) {
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const liveUserId = user?.id ?? null;

  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!liveUserId) {
    return session ?? null;
  }

  if (session?.access_token && session.user?.id === liveUserId) {
    return session;
  }

  if (typeof authClient.auth.refreshSession !== "function") {
    return null;
  }

  const { data: refreshData } = await authClient.auth.refreshSession();
  const refreshedSession = refreshData?.session ?? null;

  if (
    refreshedSession?.access_token &&
    refreshedSession.user?.id === liveUserId
  ) {
    return refreshedSession;
  }

  return null;
}

export async function getAdminRequestHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const authClient = getSupabaseBrowserClient();
  if (!authClient) {
    return headers;
  }

  const session = await resolveLiveAdminSession(authClient);

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}
