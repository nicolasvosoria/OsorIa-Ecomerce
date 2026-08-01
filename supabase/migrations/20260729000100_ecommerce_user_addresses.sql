-- Saved address book, global per person: no store_id, because an address belongs
-- to whoever lives there and not to the store they happened to buy from. This
-- mirrors ecommerce.user_profiles, which is also 1:1 with auth.users and whose
-- RLS is identity-based only.
-- ecommerce.order_addresses stays untouched: an order keeps its write-once
-- shipping snapshot, and this table is the editable source the checkout copies
-- from. Columns are exactly what the checkout collects (lib/checkout/schemas.ts)
-- plus a user-facing label, so a saved address can satisfy the checkout without
-- carrying fields nobody asks for.
-- Naming follows order_addresses' canonical spelling (address_line_1), not the
-- legacy addr_type/address_line1 variants that 20260425000300 had to reconcile.
-- Scope: ecommerce schema only.

create table if not exists ecommerce.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  address_line_1 text not null,
  city text,
  postal_code text,
  country text not null default 'Colombia',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_addresses_user_id_idx on ecommerce.user_addresses (user_id);

-- Two defaults for one person are unrepresentable at the database level, so no
-- writer has to be trusted to clear the previous default first.
create unique index if not exists user_addresses_single_default_per_user on ecommerce.user_addresses (user_id) where is_default;

alter table ecommerce.user_addresses enable row level security;

-- Owner-only, and deliberately without the admin escape hatch user_profiles'
-- policies carry: the admin user list has to read profiles, but nothing in the
-- product shows one person's home address to another. service_role still
-- bypasses RLS for backend work.
drop policy if exists user_addresses_owner_read_write on ecommerce.user_addresses;
create policy user_addresses_owner_read_write on ecommerce.user_addresses
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

revoke all on ecommerce.user_addresses from public, anon;
grant select, insert, update, delete on ecommerce.user_addresses to authenticated;
grant all on ecommerce.user_addresses to service_role;

-- The phone identifies the person, not the address, so it lands on the global
-- profile. Nullable: the profile row is written by upsert and may exist long
-- before anyone types a phone number.
alter table ecommerce.user_profiles add column if not exists phone text;

-- Privilege escalation closed: any signed-in customer could make themselves
-- super_admin with a single PATCH on their own profile row.
--
-- The baseline (20260425000100) grants `insert, update, delete on all tables in
-- schema ecommerce to authenticated`, which handed `authenticated` UPDATE over
-- the WHOLE user_profiles table. RLS did not stop it: policy
-- user_profiles_self_or_admin_update scopes the ROW (`id = auth.uid()`) and says
-- nothing about columns, so writing `role = 'super_admin'` into your own row was
-- a legal update. ecommerce.is_global_admin() reads that column from 22 policy
-- positions, including read access to every other person's profile.
--
-- Do NOT "simplify" this into `revoke update (role) ... from authenticated`.
-- Postgres checks a column write against the column ACL OR the table ACL, and a
-- column-level revoke leaves a table-level grant untouched: the statement reports
-- REVOKE, changes nothing, and has_column_privilege still answers true. The
-- table-level privilege has to go first, then the writable columns come back one
-- by one. Re-running is safe in that order because a table-level revoke also
-- clears the column grants the next statement restores.
--
-- Deliberately kept: authenticated INSERT (the profile row is created by upsert
-- on first sign-in), authenticated SELECT on role (a person reads their own
-- role), and service_role UPDATE on role (the admin-only setUserGlobalRole path).
revoke update on ecommerce.user_profiles from authenticated;
grant update (email, first_name, last_name, phone, updated_at)
  on ecommerce.user_profiles to authenticated;

-- anon only ever renders a public name, so role, must_change_password and
-- signup_store_id are none of a logged-out visitor's business. Same shape and
-- same reason as the update above.
revoke select on ecommerce.user_profiles from anon;
grant select (id, email, first_name, last_name, phone, created_at, updated_at)
  on ecommerce.user_profiles to anon;
