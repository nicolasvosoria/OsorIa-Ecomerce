# Osoria E-commerce

E-commerce storefront built with Next.js 16, React 19, Supabase, and optional Shopify integration.

## Setup

### Prerequisites

- Node.js 22+
- `pnpm` (via Corepack is fine)
- A Supabase project

### Install dependencies

```bash
corepack pnpm install
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

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If using chat/catalog AI or order confirmation emails in production, also configure the optional feature variables listed above.

After deployment, update Supabase Auth URL settings:

- Site URL: your production domain
- Redirect URLs: include `/auth/callback` and `/auth/reset-password`

## Related scoped docs

- `tests/README.md` — testing structure and commands.
- `lib/email-templates/README.md` — Supabase email template setup.
