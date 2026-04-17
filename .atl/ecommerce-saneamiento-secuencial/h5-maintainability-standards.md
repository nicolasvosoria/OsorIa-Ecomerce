# H5 Maintainability Standards — ecommerce-saneamiento-secuencial

## Scope and Guardrails

- This H5 batch targets **change-risk reduction** in critical ecommerce flows.
- It does not introduce feature behavior changes in checkout, orders, or tenant routing.
- Improvements are accepted only when they reduce ambiguity for future modifications.

## Maintainability and Legibility Standards

1. **Risk-reduction first**
   - Prioritize files with high blast radius (checkout/order APIs, tenant resolution).
   - No refactor is accepted unless it lowers incident probability or makes failure modes explicit.
2. **No cosmetic-only refactors in critical flows**
   - Style-only rewrites are out of scope when they do not improve contracts or safeguards.
3. **Typed error handling over `any` catches**
   - Use `unknown` + explicit normalization to avoid unsafe message access and hidden runtime assumptions.
4. **Config contracts must be explicit and deterministic**
   - Centralize SMTP/base URL resolution order to avoid divergent behavior across environments.
5. **Incremental modularization over big-bang rewrites**
   - Extract pure helper slices from monoliths first; keep route/page signatures stable.

## Hotspot Prioritization Matrix

| Priority | Hotspot                                                  | Current Risk                                                                              | H5 Action                                                                               | Why this reduces risk                                                                        |
| -------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| P1       | `app/api/orders/send-confirmation-email/route.ts`        | Monolithic runtime/config logic + historical `any` catches + ambiguous SMTP failure shape | Extract runtime guards and typed error normalization; keep API response contract stable | Failures become diagnosable and consistent, reducing regressions during email/config changes |
| P2       | `app/checkout/page.tsx`                                  | Large mixed-responsibility client flow with local/Shopify cart convergence                | Keep untouched in this batch; queued for next low-risk extraction                       | Avoids broad blast-radius edits while P1 still has unresolved config ambiguity               |
| P3       | Tenant/store helpers (`lib/utils/store*.ts`, API routes) | Repeated fallback logic and env-based branching                                           | Track for follow-up after H4/H6 gates remain stable                                     | Prevents accidental cross-phase behavior drift                                               |

The matrix is intentionally conservative: tackle the highest-risk maintainability point first, then continue sequentially.

## Incremental Modularization Slices

### Slice H5.1 (implemented)

- New module: `lib/security/email-runtime-guards.ts`
- Responsibilities extracted from the order-email route:
  - `resolveSmtpConfig`: explicit config completeness check + deterministic secure/port behavior.
  - `resolveEmailBaseUrl`: single precedence rule (request origin → app URL → Vercel URL).
  - `getErrorMessage`: safe normalization for unknown errors.

### Slice H5.2 (queued)

- Candidate extraction from `app/checkout/page.tsx`:
  - Stock-error normalization and toast decision logic as pure helpers.
  - Order-item payload mapping split by cart source.

## Fallback Behavior Guardrails

- Missing SMTP env must fail with explicit missing-key evidence, never silent defaults.
- Email flow may return non-blocking warning to preserve order completion path.
- Error-message extraction must never assume `error.message` exists.
- Base URL for email assets must be sanitized and deterministic to avoid broken links in production emails.

## Validation for H5

1. `tests/security/email-runtime-guards.test.ts` validates runtime-guard behavior.
2. `tests/security/order-email-contract.test.ts` remains green to preserve existing request contract.
3. `tests/quality/h5-maintainability-standards.test.ts` locks this H5 risk-reduction contract as a repo artifact.
