-- D3/D5/D6/D27: store-defined shipping zones, their destinations (whole
-- departments or individual municipios, municipio wins) and their rate
-- ladder (one basis per zone, N range rows). Read 20260807000100_ecommerce_
-- co_locations.sql and 20260807000200_ecommerce_store_shipping_settings.sql
-- first -- destinations point at co_locations, and D7's
-- unmatched_destination_action (already modeled there) is what finally
-- means something once these zones exist.
--
-- D3: a destination -- department-only (municipality_code null) or a single
-- municipio -- belongs to at most one zone per store. The partial unique
-- indexes below enforce that at the database, scoped by store; store_id is
-- denormalized onto shipping_zone_destinations (not just reachable through
-- zone_id) purely so those partial indexes can be store-scoped, the same
-- composite-FK technique 20260504000100 already uses to keep a variant's
-- product_id honest against its true parent
-- (product_combo_components_variant_belongs_to_product_fk) -- applied here
-- to keep this table's store_id honest against its owning zone rather than
-- a sibling column. The app layer (lib/supabase/shipping-zones-api.ts)
-- pre-checks the same rule before insert so the rejection can name the
-- conflicting zone; this constraint is the concurrency backstop, not the
-- primary UX.
--
-- The (department_code, municipality_code) FK to co_locations only fires
-- when municipality_code is not null (Postgres' default MATCH SIMPLE skips
-- a composite FK once any referencing column is null), which is exactly the
-- shape we want: a municipio destination is validated against the real
-- Divipola pair, a department-only destination is not FK-checked here
-- (department_code alone has no unique target to reference) and is instead
-- validated in the API layer, which only ever offers departments actually
-- present in co_locations.
--
-- D5/D6: shipping_rates rows are a zone's ladder. basis is chosen once per
-- zone and every row shares it (D5: "one rate ladder per zone"). flat rows
-- have no bounds at all (range_from/range_to stay null -- "no bounds" per
-- D6, not a fabricated 0..infinity); order_value/weight rows are ranges,
-- range_to null on the top rung meaning open-ended (infinity). Whether the
-- ladder actually covers 0..infinity with no gaps is a cross-row invariant
-- a CHECK constraint cannot express (Postgres CHECKs see one row at a time),
-- and D6 frames it as a save-time UI validation ("an incomplete ladder
-- cannot be saved and the screen says so"), so it lives in
-- lib/shipping/schemas.ts, not here -- matching the repo's one-trigger
-- posture: this isn't a decision that demands a second one.
--
-- Scope: ecommerce schema only.

begin;

create table if not exists ecommerce.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references ecommerce.stores(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table ecommerce.shipping_zones is
  'D3/D5: a named shipping zone for a store. Its destinations live in shipping_zone_destinations, its rate ladder in shipping_rates.';

-- Backs the composite FK below: guarantees a destination's denormalized
-- store_id can never drift from the store_id of the zone it belongs to.
create unique index if not exists shipping_zones_id_store_id_key on ecommerce.shipping_zones(id, store_id);

create table if not exists ecommerce.shipping_zone_destinations (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references ecommerce.shipping_zones(id) on delete cascade,
  store_id uuid not null references ecommerce.stores(id) on delete cascade,
  department_code text not null,
  municipality_code text,
  created_at timestamptz not null default now(),
  constraint shipping_zone_destinations_zone_store_fk
    foreign key (zone_id, store_id) references ecommerce.shipping_zones(id, store_id),
  constraint shipping_zone_destinations_municipality_fk
    foreign key (department_code, municipality_code) references ecommerce.co_locations(department_code, municipality_code)
);

comment on table ecommerce.shipping_zone_destinations is
  'D3: one row per department (municipality_code null) or single municipio a zone covers. At most one zone per store may claim a given destination -- see the partial unique indexes below -- and a municipio destination always outranks its department when a checkout resolves which zone a destination belongs to.';
comment on column ecommerce.shipping_zone_destinations.municipality_code is
  'Null means the whole department is the destination; a municipio code narrows it to a single municipio, which wins over any department-level destination covering it (D3).';

create unique index if not exists shipping_zone_destinations_department_key
  on ecommerce.shipping_zone_destinations(store_id, department_code)
  where municipality_code is null;

create unique index if not exists shipping_zone_destinations_municipality_key
  on ecommerce.shipping_zone_destinations(store_id, department_code, municipality_code)
  where municipality_code is not null;

create index if not exists shipping_zone_destinations_zone_idx on ecommerce.shipping_zone_destinations(zone_id);

create table if not exists ecommerce.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references ecommerce.shipping_zones(id) on delete cascade,
  basis text not null
    constraint shipping_rates_basis_chk check (basis in ('flat', 'order_value', 'weight')),
  range_from numeric
    constraint shipping_rates_range_from_nonnegative_chk check (range_from is null or range_from >= 0),
  range_to numeric
    constraint shipping_rates_range_to_after_from_chk check (range_to is null or range_to > range_from),
  amount numeric not null
    constraint shipping_rates_amount_nonnegative_chk check (amount >= 0),
  created_at timestamptz not null default now(),
  constraint shipping_rates_bounds_match_basis_chk check (
    (basis = 'flat' and range_from is null and range_to is null)
    or (basis <> 'flat' and range_from is not null)
  )
);

comment on table ecommerce.shipping_rates is
  'D5/D6: a zone''s rate ladder, one row per range. basis is uniform across a zone''s rows (D5). flat carries a single boundless row; order_value/weight rows range from range_from up to range_to, or to infinity when range_to is null -- the last rung. Free shipping (D6) is an amount=0 row, not a distinct concept.';

create index if not exists shipping_rates_zone_idx on ecommerce.shipping_rates(zone_id);

alter table ecommerce.shipping_zones enable row level security;
alter table ecommerce.shipping_zone_destinations enable row level security;
alter table ecommerce.shipping_rates enable row level security;

-- D27: closed to anon; admin CRUD only. The checkout's quote (slice S9)
-- reads through the service-role client, never anon/authenticated directly
-- -- same posture as store_shipping_settings.
drop policy if exists shipping_zones_admin_write on ecommerce.shipping_zones;
create policy shipping_zones_admin_write on ecommerce.shipping_zones
for all to authenticated
using (ecommerce.can_manage_store(store_id))
with check (ecommerce.can_manage_store(store_id));

-- Child-table policy template: 20260504000100_ecommerce_product_combos.sql's
-- product_combo_components_admin_write (an EXISTS through the parent's
-- store_id, not the denormalized column above -- that column exists only to
-- back the unique indexes; RLS still authorizes through the real ownership
-- chain).
drop policy if exists shipping_zone_destinations_admin_write on ecommerce.shipping_zone_destinations;
create policy shipping_zone_destinations_admin_write on ecommerce.shipping_zone_destinations
for all to authenticated
using (exists (
  select 1 from ecommerce.shipping_zones z
  where z.id = zone_id and ecommerce.can_manage_store(z.store_id)
))
with check (exists (
  select 1 from ecommerce.shipping_zones z
  where z.id = zone_id and ecommerce.can_manage_store(z.store_id)
));

drop policy if exists shipping_rates_admin_write on ecommerce.shipping_rates;
create policy shipping_rates_admin_write on ecommerce.shipping_rates
for all to authenticated
using (exists (
  select 1 from ecommerce.shipping_zones z
  where z.id = zone_id and ecommerce.can_manage_store(z.store_id)
))
with check (exists (
  select 1 from ecommerce.shipping_zones z
  where z.id = zone_id and ecommerce.can_manage_store(z.store_id)
));

-- The baseline's blanket grant only covers tables that existed at baseline
-- time (D27); these are new, so they need their own explicit grants -- same
-- shape as store_shipping_settings and shop_config.
revoke all on ecommerce.shipping_zones, ecommerce.shipping_zone_destinations, ecommerce.shipping_rates from public, anon;
grant select, insert, update, delete on ecommerce.shipping_zones, ecommerce.shipping_zone_destinations, ecommerce.shipping_rates to authenticated;
grant all on ecommerce.shipping_zones, ecommerce.shipping_zone_destinations, ecommerce.shipping_rates to service_role;

commit;
