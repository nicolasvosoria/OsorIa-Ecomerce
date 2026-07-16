import { createClient } from "@supabase/supabase-js";

import { ECOMMERCE_SCHEMA } from "@/lib/supabase/contract";

export function getServiceEcommerceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).schema(ECOMMERCE_SCHEMA);
}

// Client left on the default schema so `auth.admin` stays reachable: pinning a
// schema returns a PostgrestClient with no auth surface. Used to invite platform
// identities, never for ecommerce table reads or writes.
export function getServiceAuthAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
