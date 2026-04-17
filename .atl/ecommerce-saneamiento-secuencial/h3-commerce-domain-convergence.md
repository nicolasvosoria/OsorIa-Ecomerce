# H3 Commerce Domain Convergence — ecommerce-saneamiento-secuencial

## Scope and Non-Goals

- This H3 batch is contract/architecture convergence with **low blast radius**.
- It does **not** replace active runtime flows in one shot.
- **No active storefront/cart/checkout behavior change in H3**.

## Active Commerce Domain Map

### Business flows in scope

1. **Storefront discovery and catalog visibility**
2. **Cart mutation and persistence**
3. **Checkout, order creation, and confirmation**

### Source-of-Truth Matrix

| Flow                                   | Current active entrypoints                                                                     | Current source(s) of truth                                                                                                        | Notes                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Storefront listing + product retrieval | `app/shop/page.tsx`, `app/product/[handle]/page.tsx`, `app/products/[slug]/page.tsx`           | `lib/products/index.ts` (Supabase adapter facade), `lib/supabase/products-api.ts`, `lib/products/adapter.ts`                      | Two product detail routes coexist and resolve via adapted Supabase model.      |
| Tenant/store resolution for catalog    | `proxy.ts`, `app/api/store/route.ts`, `contexts/store-context.tsx`                             | Header/cookie contract (`x-store-id` / `store_id`) + `stores_legacy` lookup via `lib/utils/store.ts`, `lib/supabase/store-api.ts` | Resolution logic is duplicated across server/client helpers.                   |
| Cart state and mutations               | `components/cart/cart-context.tsx`, `contexts/cart-context.tsx`, `app/api/cart/clear/route.ts` | Shopify cart lines (`components/cart/*`) + local in-memory cart (`contexts/cart-context.tsx`)                                     | Checkout currently reads both cart providers.                                  |
| Checkout and order write path          | `app/checkout/page.tsx`, `app/checkout/success/page.tsx`                                       | `lib/supabase/orders-api.ts` for order + item persistence, `/api/orders/send-confirmation-email` for confirmation                 | Checkout preserves continuity by tolerating Shopify email/cart clear failures. |

## Minimum Viable Target Architecture

Target is an incremental architecture shell where old callers remain alive while internals converge:

1. **CommerceCore**
   - Pure-domain contracts for product view, cart snapshot, checkout command, and order result.
2. **ResolutionGateway**
   - Single adapter for store/tenant resolution from header/cookie/subdomain.
3. **CatalogGateway**
   - Single adapter for listing/detail retrieval, regardless of legacy route shape.
4. **CartGateway**
   - Unified cart snapshot + mutation contract consumed by checkout.
5. **CheckoutGateway**
   - Unified order command that writes through existing order/email integration points.
6. **Compatibility shell (current UI/API entrypoints)**
   - Existing routes/pages/contexts keep signatures intact and delegate to gateways.

## Safe Convergence Plan (Duplicated Flows/Adapters)

### Duplication hotspots

1. **Dual product-detail routes: /product/[handle] and /products/[slug]**
2. **Dual cart providers in checkout**
3. **Store resolution duplicated across helpers**

### Low-risk convergence sequence

1. Introduce a **Canonical product-detail resolver facade** used by both route trees while keeping both URLs active.
2. Introduce a **Single checkout cart snapshot builder** consumed by `app/checkout/page.tsx`; keep both providers as inputs during transition.
3. Introduce a **Single canonical store resolution adapter** wrapping existing header/cookie/subdomain strategies.
4. Keep current API/page contracts stable; switch internals behind parity assertions before removing any legacy caller.

## Transition and Deprecation Path

### Legacy assets to preserve until parity

- `stores_legacy`
- `store_items_legacy`
- `orders_legacy`
- Product detail dual route surface (`/product/[handle]`, `/products/[slug]`)
- Dual cart-provider inputs in checkout

### Deprecation Stages

1. **Stage 0 — Observe and freeze behavior**
   - Track current storefront/cart/checkout behavior and keep gates green.
2. **Stage 1 — Introduce adapters without flipping callers**
   - Add gateway facades and wire compatibility shell with no public behavior change.
3. **Stage 2 — Migrate callers behind parity checks**
   - Move callers gradually to gateways with contract checks for storefront/cart/checkout continuity.
4. **Stage 3 — Deprecate legacy entrypoints**
   - Remove duplicated routes/helpers only after parity + smoke evidence is stable.

### Safety clauses

- **Rollback rule: keep compatibility shell active** until parity evidence is re-established.
- No destructive migration of legacy tables in H3.
- Any runtime flip must preserve checkout completion and cart-clear continuity.
