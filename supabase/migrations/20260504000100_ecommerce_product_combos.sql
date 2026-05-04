-- First-class purchasable product combos for ecommerce schema.
create table if not exists ecommerce.product_combos (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references ecommerce.stores(id) on delete cascade,
  name varchar not null,
  slug varchar not null,
  description text,
  image_url text,
  is_active boolean not null default true,
  discount_type varchar not null constraint product_combos_discount_type_chk check (discount_type in ('percentage', 'fixed_cop')),
  discount_value numeric not null default 0 constraint product_combos_discount_value_nonnegative_chk check (discount_value >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint product_combos_store_slug_key unique (store_id, slug)
);

create table if not exists ecommerce.product_combo_components (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references ecommerce.product_combos(id) on delete cascade,
  product_id uuid not null references ecommerce.store_items(id) on delete restrict,
  variant_id uuid references ecommerce.item_variants(id) on delete restrict,
  quantity integer not null constraint product_combo_components_quantity_positive_chk check (quantity > 0),
  display_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint product_combo_components_combo_product_variant_key unique (combo_id, product_id, variant_id)
);

create table if not exists ecommerce.order_combo_snapshots (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references ecommerce.orders(id) on delete cascade,
  order_item_id uuid not null references ecommerce.order_items(id) on delete cascade,
  combo_id uuid references ecommerce.product_combos(id) on delete set null,
  combo_name varchar not null,
  combo_slug varchar,
  ordered_quantity integer not null constraint order_combo_snapshots_ordered_quantity_positive_chk check (ordered_quantity > 0),
  component_subtotal numeric not null default 0 constraint order_combo_snapshots_component_subtotal_nonnegative_chk check (component_subtotal >= 0),
  discount_type varchar not null constraint order_combo_snapshots_discount_type_chk check (discount_type in ('percentage', 'fixed_cop')),
  discount_value numeric not null default 0 constraint order_combo_snapshots_discount_value_nonnegative_chk check (discount_value >= 0),
  discount_amount numeric not null default 0 constraint order_combo_snapshots_discount_amount_nonnegative_chk check (discount_amount >= 0),
  charged_unit_price numeric not null default 0 constraint order_combo_snapshots_charged_unit_price_nonnegative_chk check (charged_unit_price >= 0),
  charged_line_total numeric not null default 0 constraint order_combo_snapshots_charged_line_total_nonnegative_chk check (charged_line_total >= 0),
  currency_code varchar not null default 'COP',
  snapshot jsonb not null,
  created_at timestamptz default now(),
  constraint order_combo_snapshots_order_item_key unique (order_item_id)
);

-- Additive integrity for databases where the tables already existed before this migration was hardened.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_combos_discount_type_chk' and conrelid = 'ecommerce.product_combos'::regclass) then
    alter table ecommerce.product_combos add constraint product_combos_discount_type_chk check (discount_type in ('percentage', 'fixed_cop'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'product_combos_discount_value_nonnegative_chk' and conrelid = 'ecommerce.product_combos'::regclass) then
    alter table ecommerce.product_combos add constraint product_combos_discount_value_nonnegative_chk check (discount_value >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'product_combo_components_quantity_positive_chk' and conrelid = 'ecommerce.product_combo_components'::regclass) then
    alter table ecommerce.product_combo_components add constraint product_combo_components_quantity_positive_chk check (quantity > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_combo_snapshots_ordered_quantity_positive_chk' and conrelid = 'ecommerce.order_combo_snapshots'::regclass) then
    alter table ecommerce.order_combo_snapshots add constraint order_combo_snapshots_ordered_quantity_positive_chk check (ordered_quantity > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_combo_snapshots_component_subtotal_nonnegative_chk' and conrelid = 'ecommerce.order_combo_snapshots'::regclass) then
    alter table ecommerce.order_combo_snapshots add constraint order_combo_snapshots_component_subtotal_nonnegative_chk check (component_subtotal >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_combo_snapshots_discount_value_nonnegative_chk' and conrelid = 'ecommerce.order_combo_snapshots'::regclass) then
    alter table ecommerce.order_combo_snapshots add constraint order_combo_snapshots_discount_value_nonnegative_chk check (discount_value >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_combo_snapshots_discount_amount_nonnegative_chk' and conrelid = 'ecommerce.order_combo_snapshots'::regclass) then
    alter table ecommerce.order_combo_snapshots add constraint order_combo_snapshots_discount_amount_nonnegative_chk check (discount_amount >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_combo_snapshots_charged_unit_price_nonnegative_chk' and conrelid = 'ecommerce.order_combo_snapshots'::regclass) then
    alter table ecommerce.order_combo_snapshots add constraint order_combo_snapshots_charged_unit_price_nonnegative_chk check (charged_unit_price >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_combo_snapshots_charged_line_total_nonnegative_chk' and conrelid = 'ecommerce.order_combo_snapshots'::regclass) then
    alter table ecommerce.order_combo_snapshots add constraint order_combo_snapshots_charged_line_total_nonnegative_chk check (charged_line_total >= 0);
  end if;
end $$;

create index if not exists product_combos_store_active_idx on ecommerce.product_combos(store_id, is_active);
create index if not exists product_combo_components_combo_idx on ecommerce.product_combo_components(combo_id, display_order);
create index if not exists product_combo_components_product_idx on ecommerce.product_combo_components(product_id, variant_id);
create unique index if not exists product_combo_components_combo_product_no_variant_unique on ecommerce.product_combo_components(combo_id, product_id) where variant_id is null;
create unique index if not exists product_combo_components_combo_product_variant_unique on ecommerce.product_combo_components(combo_id, product_id, variant_id) where variant_id is not null;
create index if not exists order_combo_snapshots_order_idx on ecommerce.order_combo_snapshots(order_id);
create unique index if not exists item_variants_id_item_id_unique on ecommerce.item_variants(id, item_id);
create unique index if not exists order_items_id_order_id_unique on ecommerce.order_items(id, order_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_combo_components_variant_belongs_to_product_fk' and conrelid = 'ecommerce.product_combo_components'::regclass) then
    alter table ecommerce.product_combo_components
      add constraint product_combo_components_variant_belongs_to_product_fk
      foreign key (variant_id, product_id) references ecommerce.item_variants(id, item_id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_combo_snapshots_item_belongs_to_order_fk' and conrelid = 'ecommerce.order_combo_snapshots'::regclass) then
    alter table ecommerce.order_combo_snapshots
      add constraint order_combo_snapshots_item_belongs_to_order_fk
      foreign key (order_item_id, order_id) references ecommerce.order_items(id, order_id) on delete cascade;
  end if;
end $$;

alter table ecommerce.product_combos enable row level security;
alter table ecommerce.product_combo_components enable row level security;
alter table ecommerce.order_combo_snapshots enable row level security;

revoke all on ecommerce.product_combos, ecommerce.product_combo_components, ecommerce.order_combo_snapshots from public;
grant select on ecommerce.product_combos, ecommerce.product_combo_components to anon, authenticated;
grant select on ecommerce.order_combo_snapshots to authenticated;
grant insert, update, delete on ecommerce.product_combos, ecommerce.product_combo_components to authenticated;
grant insert on ecommerce.order_combo_snapshots to authenticated;
grant all on ecommerce.product_combos, ecommerce.product_combo_components, ecommerce.order_combo_snapshots to service_role;

drop policy if exists product_combos_public_read on ecommerce.product_combos;
create policy product_combos_public_read on ecommerce.product_combos for select to anon, authenticated
using (is_active = true and ecommerce.is_public_store(store_id));

drop policy if exists product_combos_admin_write on ecommerce.product_combos;
create policy product_combos_admin_write on ecommerce.product_combos for all to authenticated
using (ecommerce.can_manage_store(store_id))
with check (ecommerce.can_manage_store(store_id));

drop policy if exists product_combo_components_public_read on ecommerce.product_combo_components;
create policy product_combo_components_public_read on ecommerce.product_combo_components for select to anon, authenticated
using (exists (
  select 1 from ecommerce.product_combos pc
  where pc.id = combo_id and pc.is_active = true and ecommerce.is_public_store(pc.store_id)
));

drop policy if exists product_combo_components_admin_write on ecommerce.product_combo_components;
create policy product_combo_components_admin_write on ecommerce.product_combo_components for all to authenticated
using (exists (
  select 1 from ecommerce.product_combos pc
  where pc.id = combo_id and ecommerce.can_manage_store(pc.store_id)
))
with check (exists (
  select 1 from ecommerce.product_combos pc
  where pc.id = combo_id and ecommerce.can_manage_store(pc.store_id)
));

drop policy if exists order_combo_snapshots_admin_read on ecommerce.order_combo_snapshots;
create policy order_combo_snapshots_admin_read on ecommerce.order_combo_snapshots for select to authenticated
using (exists (
  select 1 from ecommerce.orders o
  where o.id = order_id and ecommerce.can_manage_store(o.store_id)
));

drop policy if exists order_combo_snapshots_service_write on ecommerce.order_combo_snapshots;
create policy order_combo_snapshots_service_write on ecommerce.order_combo_snapshots for insert to authenticated
with check (exists (
  select 1 from ecommerce.orders o
  where o.id = order_id and ecommerce.can_manage_store(o.store_id)
));
