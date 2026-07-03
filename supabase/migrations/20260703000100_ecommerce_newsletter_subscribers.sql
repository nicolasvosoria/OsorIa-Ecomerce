-- Newsletter email capture, backend-only (no anon/authenticated access).
-- Scope: ecommerce schema only.

create table if not exists ecommerce.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table ecommerce.newsletter_subscribers enable row level security;

revoke all on ecommerce.newsletter_subscribers from public, anon, authenticated;
grant all on ecommerce.newsletter_subscribers to service_role;
