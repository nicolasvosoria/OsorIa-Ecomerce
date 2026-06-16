# Issue #35 Safe Role Redirects — Runtime Notes

## Runtime environment

The route guard and return-intent flow reuse the existing Supabase Auth/session setup. Deployments must provide:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` stays server-only and is required for the proxy/server admin role lookup against the existing `ecommerce.user_profiles.role` value.

## Supabase changes

Issue #35 does **not** introduce Supabase migrations, schema changes, storage changes, or RLS changes. It continues to use the current Auth session cookies and the existing `ecommerce.user_profiles.role = 'admin'` contract for admin users.

## Manual QA matrix

| Flow | Expected result |
| --- | --- |
| Guest opens `/admin` or `/admin/orders` | Redirects before admin content renders to `/?auth=login&next=/admin...`. |
| Authenticated non-admin opens `/admin*` | Redirects before admin content renders to `/?admin_access=denied`. |
| Admin opens `/admin*` | Requested admin route renders after admin status is verified; client fallback must not redirect the verified admin home from stale state. |
| Expired or missing session opens `/admin*` | Redirects to login with safe admin return intent and no admin content render. |
| Supabase role lookup fails on `/admin*` | Redirects to safe fallback with `admin_access=error`. |
| Callback/login with safe admin `next` | Admin returns once to the safe `/admin*` destination; non-admin receives `admin_access=denied`. |
| Callback/login with external or `//` next | Unsafe target is rejected; no open redirect occurs. |
| `/dashboard`, `/checkout`, and public routes | Existing behavior remains unchanged by issue #35. |
