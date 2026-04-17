# H4 Store/Tenant Resolution Contract — ecommerce-saneamiento-secuencial

## Scope Guard

- This H4 artifact is a **trace + contract clarification** batch.
- Preserve active behavior. No runtime behavior changes are introduced in this batch.
- Focus is low-blast-radius convergence around existing helpers/contracts already in use.

## Current End-to-End Resolution Trace

### 1) Ingress resolution and propagation (`proxy.ts`)

1. `proxy.ts` reads `host` and derives subdomain (`getSubdomain`).
2. If `DISABLE_SUBDOMAIN_MULTI_TENANT=true`, it bypasses DB resolution and propagates:
   - `x-store-id`
   - `x-store-subdomain`
   - `x-store-name`
   - `store_id` cookie
3. If no subdomain is detected, it attempts `stores_legacy(subdomain=default)`.
4. If default store exists and is active, it propagates the resolved UUID/id through header + cookie.
5. If default store is absent, it still propagates literal fallback values (`default`, `Tienda Principal`) to keep storefront operable.
6. If subdomain exists, it resolves store from `stores_legacy` and:
   - rewrites to `/store-not-found` when unresolved,
   - rewrites to `/store-inactive` when inactive,
   - otherwise propagates resolved store metadata via headers + cookie.

### 2) Runtime consumers (`lib/utils/store.ts`, `lib/supabase/store-api.ts`)

1. `lib/utils/store.ts::getStoreId()` reads `x-store-id` first, then `store_id` cookie.
2. In request-scope/build-time failures it returns `null` (documented as expected during prerender/cache scope).
3. `lib/supabase/store-api.ts::getStoreIdFromServer()` reads the same sources but falls back to `'default'` on errors.
4. `lib/supabase/store-api.ts::getStoreFromServer()` resolves `stores_legacy` by:
   - subdomain when store id equals `default`,
   - id otherwise,
   - enforcing `is_active=true` and `deleted_at is null`.

### 3) Domain/data callers (`lib/supabase/products-api.ts` and peers)

1. `lib/supabase/products-api.ts` attempts `getStoreId()` first.
2. If unresolved, it derives subdomain from host (server path) and queries `stores_legacy`.
3. If still unresolved, it attempts default store UUID lookup from `stores_legacy(subdomain=default)`.
4. If no fallback UUID exists, it returns safe-empty result contracts for listing functions.

### 4) Public API contract (`app/api/store/route.ts` + `lib/security/store-contract.ts`)

1. `parseStoreLookupParams` validates lookup selector (`subdomain` or UUID `id`).
2. Query is restricted to active/non-deleted rows in `stores_legacy`.
3. Response is sanitized through `toPublicStorePayload`.
4. Private columns are not leaked by contract.

## Target Store Resolution Contract

> Target here means **explicit contract to standardize existing behavior** for next phases; it does not imply behavior mutation in this H4 batch.

1. **Single canonical propagation keys at request boundary**:
   - `x-store-id header`
   - `store_id cookie`
2. **Resolution source precedence (read path)**:
   1. environment bypass (`DISABLE_SUBDOMAIN_MULTI_TENANT`)
   2. resolved subdomain store from ingress
   3. `x-store-id`
   4. `store_id` cookie
   5. default-store lookup (`subdomain=default`)
   6. literal default fallback only where already present
3. **Consumer safety contract**:
   - read paths may degrade to safe-empty output when no valid store can be resolved,
   - API contracts must keep explicit 4xx/404/500 semantics,
   - no private store columns in public payloads.

## Valid Store States

| State              | Meaning                             | Current observable behavior                                                         | Allowed fallback                                        |
| ------------------ | ----------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `ACTIVE_PUBLIC`    | Row exists, active, visible         | normal storefront/API response                                                      | none needed                                             |
| `ACTIVE_PRIVATE`   | Row exists, active, non-public      | resolvable for tenant context; visibility rules apply downstream                    | none needed                                             |
| `INACTIVE`         | Row exists but inactive             | ingress rewrite `/store-inactive` on subdomain path                                 | no silent promotion                                     |
| `NOT_FOUND`        | Store not found by subdomain/id     | ingress rewrite `/store-not-found` or API `404`                                     | default-store lookup only in existing fallback branches |
| `SOFT_DELETED`     | Row exists with `deleted_at` set    | treated as unavailable due to `deleted_at is null` filters                          | same as NOT_FOUND                                       |
| `RESOLUTION_ERROR` | Infra/runtime error while resolving | safe fallback (`default` literal or safe-empty results) where currently implemented | preserve current fallback boundaries                    |

## Schema and Compatibility Dependencies

### Required relation and profile dependencies

- `stores_legacy`
- schema/profile compatibility for REST calls: `Accept-Profile: ecommerce`
- active-row filtering contract:
  - `id`
  - `subdomain`
  - `is_active`
  - `deleted_at`

### Public payload compatibility dependencies

`lib/security/store-contract.ts` depends on these columns remaining available in `stores_legacy` query surface for `/api/store`:

- `id`
- `subdomain`
- `store_name`
- `domain`
- `is_active`
- `is_public`
- `logo_url`
- `primary_color`
- `secondary_color`
- `currency_code`

If schema evolves, compatibility must preserve this projection or provide explicit migration adapter before contract changes.

## Fallback and Propagation Rules

1. **Preserve active behavior** in this phase (no routing or fallback mutation).
2. **Ingress is the primary propagation boundary**: emit/store canonical identifiers at proxy level (`x-store-id header` + `store_id cookie`).
3. **Read consumers can degrade safely**:
   - empty collections/null-object responses are acceptable when store cannot be resolved,
   - do not throw user-facing internals from resolution failures.
4. **No implicit fallback in write paths**: any write operation requiring tenant identity should require explicit store resolution (or explicit controlled default-store policy) before mutation.
5. **Do not conflate absence with inactivity**:
   - `NOT_FOUND` and `INACTIVE` remain distinct states with distinct outcomes.

## H4 Compatibility Exceptions (Documented)

These exceptions are intentionally documented as **current compatibility behavior** to avoid accidental drift in later phases.

### Known divergent helpers/routes

1. `app/api/chat/route.ts`
   - Uses a route-local helper (`getStoreIdFromServer`) with **cookie-only read path with literal `default` fallback** when multitenant mode is enabled and no cookie is present.
   - Does not read `x-store-id` directly, unlike canonical server helper precedence.
   - Reads chatbot/store context from `stores` for this route's runtime behavior.

2. `app/api/chatbot-config/route.ts`
   - Uses the same route-local tenant helper semantics (cookie-first, literal `default` fallback, no header read).
   - Uses `stores` for read/update in this route.

3. `lib/supabase/chatbot-api.ts`
   - Browser-side helper resolves `store_id` from `document.cookie` and falls back to `default`.
   - Reads config from `stores_legacy` but persists updates via `stores`.
   - This split (`stores` and `stores_legacy`) is compatibility-preserved in H4 and must not be silently normalized in this batch.

4. `lib/utils/store-server.ts`
   - Server helper reads `x-store-id` first and then `store_id` cookie.
   - On runtime/prerender errors, it degrades to literal `default` (not `null`) to preserve current SSR behavior.

### Compatibility boundaries for H4 follow-up work

- **No behavior expansion in H4**: document and test the divergence; do not alter runtime precedence or fallback semantics.
- **Compatibility scope is read-path tenant resolution only** for the divergent helpers/routes above.
- **Write-path tenant mutation remains explicit-only** per existing fallback rules.
- **Migration target for later phases**:
  - converge to shared canonical helper precedence (`x-store-id` → `store_id` → explicit default-store policy),
  - collapse split usage to a single authoritative store relation via an adapter-backed migration,
  - remove route-local helper duplication only when regression tests for chat/chatbot flows are in place.

## H4 Acceptance Mapping

- Trace path end-to-end: covered by section **Current End-to-End Resolution Trace**.
- Target contract + valid states: covered by sections **Target Store Resolution Contract** + **Valid Store States**.
- Schema/compat dependencies: covered by **Schema and Compatibility Dependencies**.
- Fallback/propagation ambiguity reduction: covered by **Fallback and Propagation Rules**.
- Divergent helper compatibility boundaries: covered by **H4 Compatibility Exceptions (Documented)**.
