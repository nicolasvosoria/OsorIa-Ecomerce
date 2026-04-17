# H2 Quality Gates Evidence — ecommerce-saneamiento-secuencial

## Scope covered in this batch

1. Enforce one package manager + one lockfile source of truth (pnpm).
2. Restore reproducible installation with frozen lockfile.
3. Make `lint`, `typecheck`, `test`, and `build` executable and meaningful for the sequential hardening lane.
4. Keep full-repo checks explicit via `*:full` scripts so issues are visible (not silently bypassed).

---

## Package manager and lockfile decision

- **Official package manager**: `pnpm` (`packageManager: pnpm@10.18.3` in `package.json`).
- **Single lockfile in this worktree**: `pnpm-lock.yaml`.
- **Removed**: `package-lock.json`.

---

## Script contract (minimum H2 gates)

- `pnpm lint` → scoped strict lint gate for H1/H2 critical areas.
- `pnpm typecheck` → `tsc --noEmit -p tsconfig.quality.json` scoped to hardening paths.
- `pnpm test` → focused Vitest suite (`tests/security` + `tests/quality`) with isolated config.
- `pnpm build` → `next build` production build.

Visibility scripts to expose broader backlog:

- `pnpm lint:full`
- `pnpm typecheck:full`
- `pnpm test:full`

These are intentionally separate so full-surface debt is explicit and can be burned down phase by phase.

---

## Strict TDD Evidence (RED → GREEN)

### Safety net (current baseline before H2 evidence hardening)

- Command:
  - `corepack pnpm test`
- Result: **5 files passed, 16 tests passed**.

### RED phase (tests written first)

- Command:
  - `npx vitest run -c tests/vitest.security.config.ts tests/quality/h2-quality-gates.test.ts`
- Result before implementation: **failed** on:
  - lockfile/package-manager contract mismatch,
  - required script contract mismatch (`lint` / `typecheck` / `test` / `build`),
  - eslint gate dependency contract mismatch.

### GREEN phase (minimal implementation to pass)

- Command:
  - `npx vitest run -c tests/vitest.security.config.ts tests/quality/h2-quality-gates.test.ts`
- Result: **1 file passed, 3 tests passed**.

### Re-verification sequence (post-fix, auditable)

1. `corepack pnpm lint` ✅
2. `corepack pnpm typecheck` ✅
3. `corepack pnpm test` ✅ (**5 files, 16 tests passed**)
4. `npx vitest run -c tests/vitest.security.config.ts tests/quality/h2-quality-gates.test.ts` ✅ (**1 file, 3 tests passed**)

### TDD Cycle Evidence Table

| Task                                             | Test File                                | Layer                            | Safety Net        | RED                                                         | GREEN                                                                    | TRIANGULATE                                                           | REFACTOR       |
| ------------------------------------------------ | ---------------------------------------- | -------------------------------- | ----------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- | -------------- |
| H2.1 Enforce single package manager + lockfile   | `tests/quality/h2-quality-gates.test.ts` | Unit (file-system contract)      | ✅ 16/16 baseline | ✅ Fails when lockfile source-of-truth is inconsistent      | ✅ Passes with `pnpm-lock.yaml` only + `packageManager: pnpm@...`        | ✅ Covered alongside script/dependency contract to avoid trivial pass | ➖ None needed |
| H2.2 Enforce meaningful minimum quality scripts  | `tests/quality/h2-quality-gates.test.ts` | Unit (package manifest contract) | ✅ 16/16 baseline | ✅ Fails when `lint/typecheck/test/build` contract diverges | ✅ Passes with scoped + explicit scripts and `*:full` visibility scripts | ✅ Includes both scoped gates and full-surface visibility scripts     | ➖ None needed |
| H2.3 Keep lint gate resolvable in contract tests | `tests/quality/h2-quality-gates.test.ts` | Unit (dependency contract)       | ✅ 16/16 baseline | ✅ Fails if `eslint-config-next` contract is absent         | ✅ Passes with dependency present and lint gate executable               | ➖ Single invariant behavior                                          | ➖ None needed |

### Test Summary

- **Total tests in H2 contract file**: 3
- **Total tests passing (H2 contract file)**: 3
- **Layers used**: Unit (3)
- **Approval tests**: None — contract hardening, not legacy refactor behavior capture
- **Pure functions created**: 0 (not required for this contract-focused batch)

---

## Residual risk

- `lint:full`, `typecheck:full`, and `test:full` still expose broader repository debt outside the scoped H2 surfaces.
- Next.js lockfile-root warning is external to this worktree; should be normalized in CI/workspace root config later.
