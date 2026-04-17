# H1 Security Evidence — ecommerce-saneamiento-secuencial

## Scope of this follow-up batch (H1 verify blockers only)

1. Remove runtime-visible internal error leakage from `POST /api/orders/send-confirmation-email`.
2. Add route-level tests for:
   - `/api/store` invalid params => `400`
   - `/api/store` public payload excludes non-public columns
   - `POST /api/orders/send-confirmation-email` invalid payload => `400`
   - send failure path does not expose internal error details
3. Fix nodemailer typing issue in changed files (without broad cleanup).

---

## Implemented fixes

### 1) Internal error leakage removed from runtime response

- **File**: `app/api/orders/send-confirmation-email/route.ts`
- **Change**: failure response no longer returns raw `emailSent.error` (which could include SMTP/DNS/internal messages).
- **Now returns**:
  - `success: false`
  - `message: "Pedido creado pero el correo no pudo ser enviado"`
  - `errorCode: "EMAIL_DELIVERY_FAILED"`
  - `warning: ...`
- **Result**: internal diagnostics remain server-side logs only; runtime JSON is sanitized.

### 2) Route-level security tests added

- **File**: `tests/security/api-routes-security.test.ts`
- **Coverage added**:
  - invalid `/api/store` params => `400`
  - `/api/store` excludes `owner_email`, `metadata` and other non-public fields
  - invalid email-confirmation payload => `400`
  - send failure response omits raw internal error details

### 3) Nodemailer typing issue fixed in changed file

- **File**: `app/api/orders/send-confirmation-email/route.ts`
- **Change**: removed `typeof import("nodemailer")` type dependency (required ambient declarations).
- **Approach**: runtime load through `createRequire(import.meta.url)` plus local `NodemailerLike` interface typing.
- **Result**: avoids TS declaration dependency in this file while preserving behavior.

---

## Strict TDD Evidence (RED → GREEN)

### Safety net (pre-change baseline)

- Command:
  - `npx vitest run -c tests/vitest.security.config.ts tests/security/store-contract.test.ts tests/security/html-sanitization.test.ts tests/security/order-email-contract.test.ts`
- Result: **3 files passed, 9 tests passed**.

### RED phase (new route-level tests written first)

- Command:
  - `npx vitest run -c tests/vitest.security.config.ts tests/security/api-routes-security.test.ts`
- Result: **1 failed, 3 passed**
- Failing assertion (expected, before fix):
  - `expected 'getaddrinfo ENOTFOUND smtp.test.dev' to be undefined`
  - Confirms runtime response leaked internal error content pre-fix.

### GREEN phase (minimal implementation to pass)

- Command:
  - `npx vitest run -c tests/vitest.security.config.ts tests/security/api-routes-security.test.ts`
- Result: **1 file passed, 4 tests passed**.

### Regression check (focused H1 suite)

- Command:
  - `npx vitest run -c tests/vitest.security.config.ts tests/security/store-contract.test.ts tests/security/html-sanitization.test.ts tests/security/order-email-contract.test.ts tests/security/api-routes-security.test.ts`
- Result: **4 files passed, 13 tests passed**.

### TDD Cycle Evidence Table

| Task                                                    | Test File                                    | Layer                                        | Safety Net      | RED                                           | GREEN                                                 | TRIANGULATE                                                           | REFACTOR                                         |
| ------------------------------------------------------- | -------------------------------------------- | -------------------------------------------- | --------------- | --------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| H1.1 Mask internal send error leakage                   | `tests/security/api-routes-security.test.ts` | Route/Integration (node)                     | ✅ 9/9 baseline | ✅ Fails on leaked internal error             | ✅ Passes after sanitized response (`errorCode`)      | ✅ Added multiple route scenarios to force non-trivial behavior paths | ✅ Kept route semantics, only sanitized contract |
| H1.2 Add `/api/store` route contract tests              | `tests/security/api-routes-security.test.ts` | Route/Integration (node)                     | ✅ 9/9 baseline | ✅ New assertions introduced                  | ✅ Passes with existing contract implementation       | ✅ Covers invalid + public-payload-only scenarios                     | ➖ None needed                                   |
| H1.3 Add `send-confirmation-email` route contract tests | `tests/security/api-routes-security.test.ts` | Route/Integration (node)                     | ✅ 9/9 baseline | ✅ New assertions introduced                  | ✅ Passes after masking fix                           | ✅ Covers invalid payload + send-failure path                         | ➖ None needed                                   |
| H1.4 Nodemailer typing in changed file                  | `tests/security/api-routes-security.test.ts` | Build-safety via typed route import in tests | ✅ 9/9 baseline | ✅ Pre-fix changed file had declaration issue | ✅ Passing test import/run with local typing strategy | ➖ Single behavior change (type-only hardening)                       | ✅ Introduced local interface typing only        |

---

## Residual risk after this H1 follow-up

- Send failure still returns HTTP `200` by design (to avoid checkout disruption); clients must handle `success: false` + `errorCode`.
- Internal errors continue to be logged server-side (intentional for observability).
- Broader auth/RBAC/data-minimization items remain out of H1 scope.
