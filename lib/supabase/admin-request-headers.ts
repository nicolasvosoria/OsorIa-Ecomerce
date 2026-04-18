import { getSupabaseBrowserClient } from "./client";

export async function getAdminRequestHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const authClient = getSupabaseBrowserClient();
  if (!authClient) {
    return headers;
  }

  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}
