# Osoria E-commerce

E-commerce storefront built with Next.js 16, React 19, Supabase, and optional Shopify integration.

## Setup

### Prerequisites

- Node.js 20+
- pnpm 10 (official package manager for this repo)
- Supabase account
- (Optional) Shopify store

## 🛠️ Setup

### 1. Install Dependencies

```bash
pnpm install --frozen-lockfile
```

## Environment Variables

Create `.env.local` manually and set the values your environment needs.

Required for app boot:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Common optional variables by feature:

- Multi-tenant toggle (used in `proxy.ts` and store helpers):
  - `DISABLE_SUBDOMAIN_MULTI_TENANT`
  - `DEFAULT_STORE_ID`
  - `NEXT_PUBLIC_DISABLE_SUBDOMAIN_MULTI_TENANT`
  - `NEXT_PUBLIC_DEFAULT_STORE_ID`
- Chat API enrichment (`app/api/chat/route.ts`):
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DEEPSEEK_API_KEY`
- Email confirmation route (`app/api/orders/send-confirmation-email/route.ts`):
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - `NEXT_PUBLIC_APP_URL` (recommended in production)
  - `NEXT_PUBLIC_FACEBOOK_URL`, `NEXT_PUBLIC_INSTAGRAM_URL` (optional)
- Optional storefront/domain:
  - `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`
  - `NEXT_PUBLIC_SITE_URL`

## Run

```bash
pnpm dev
```

App runs at `http://localhost:3000`.

## Test

```bash
pnpm test
pnpm test:coverage
```

More testing details live in `tests/README.md`.

## Deployment

Deploy on Vercel with `pnpm build` (`next build`) and runtime `pnpm start` (`next start`).

Minimum production environment variables:

## ✅ Minimum Quality Gates (H2)

Before promoting changes to later phases, run this exact sequence with pnpm:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Gate policy:

- `pnpm-lock.yaml` is the single lockfile source of truth.
- `lint`, `typecheck`, `test`, and `build` must fail loudly on real errors (no warning-only pass-through).
- Current H2 `lint`/`typecheck`/`test` scripts are **focused quality gates** for hardening surfaces (`app/api/store`, `app/api/orders/send-confirmation-email`, `lib/security`, `tests/security`, `tests/quality`).
- Full-repository visibility remains available via `pnpm lint:full`, `pnpm typecheck:full`, and `pnpm test:full` so hidden issues are explicit instead of ignored.
- If any command fails, stop the lane and fix the issue before continuing.

## 📚 Tech Stack
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If using chat/catalog AI or order confirmation emails in production, also configure the optional feature variables listed above.

After deployment, update Supabase Auth URL settings:

- Site URL: your production domain
- Redirect URLs: include `/auth/callback` and `/auth/reset-password`

## Related scoped docs

- `tests/README.md` — testing structure and commands.
- `lib/email-templates/README.md` — Supabase email template setup.
