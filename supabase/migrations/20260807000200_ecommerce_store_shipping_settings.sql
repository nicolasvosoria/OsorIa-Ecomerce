-- Per-store shipping settings (D4, D7, D11, D17, D27, A3): replaces the dead
-- ecommerce.store_commerce_settings, whose tax/shipping columns had zero
-- application readers (grep across the codebase confirms it -- only this
-- migration's own predecessor and the seed script ever wrote them).
--
-- D11/D17: every store, existing and new, is born mode='coordinate' -- the
-- only mode the one live public store uses today -- so this migration changes
-- zero live behavior. 'own_rates' and 'auto_quote' round out the model now;
-- 'auto_quote' has no strategy behind it yet, so the admin selector never
-- offers it (an owner must not be able to pick a mode with nothing behind it).
--
-- D7's unmatched_destination_action rides on this same table because D7 says
-- it belongs here, the same way 'auto_quote' rides in the mode check before
-- either has a UI: a later, zones-owning slice is what makes a destination
-- ever fail to match a zone, so this column is modeled now and surfaced then.
--
-- D4: dropping store_commerce_settings loses one row of unread values -- the
-- demo store's free_shipping_threshold=150000 and tax_rate=0. tax_rate is not
-- resurrected here; the future tax plan owns whatever replaces it.
--
-- ecommerce.stores_legacy is redefined without its three store_commerce_settings
-- columns, the same shape 20260715000100 already used to drop a column out
-- from under this view (security_invoker and grants preserved verbatim).
--
-- Scope: ecommerce schema only.

begin;

-- stores_legacy joins store_commerce_settings; drop the view before the table.
drop view if exists ecommerce.stores_legacy;

create table if not exists ecommerce.store_shipping_settings (
  store_id uuid primary key references ecommerce.stores(id) on delete cascade,
  mode text not null default 'coordinate'
    check (mode in ('coordinate', 'own_rates', 'auto_quote')),
  unmatched_destination_action text not null default 'block'
    check (unmatched_destination_action in ('block', 'allow_with_coordination')),
  updated_at timestamptz not null default now()
);

comment on table ecommerce.store_shipping_settings is
  'D4: replaces the dropped ecommerce.store_commerce_settings. One row per store; a missing row reads as mode=coordinate, the same "missing row = default" shape ecommerce.shop_config already uses -- never a backfilled row per store.';
comment on column ecommerce.store_shipping_settings.mode is
  'D11/D17, A3: coordinate (born default) | own_rates | auto_quote. auto_quote has no strategy behind it yet, so the admin selector never offers it.';
comment on column ecommerce.store_shipping_settings.unmatched_destination_action is
  'D7: what a checkout quote does when a destination matches no configured zone -- block the purchase, or let it through at 0 with the coordination message. Not editable from the mode-only admin screen; a later zones slice makes either outcome reachable.';

alter table ecommerce.store_shipping_settings enable row level security;

-- D27: closed to anon entirely -- no public_read policy like most store_*
-- satellite tables carry here. Admin CRUD goes through can_manage_store, the
-- same admin-write template every other table in this schema uses; the
-- checkout will read this table later through the service-role client, never
-- anon directly.
drop policy if exists store_shipping_settings_admin_write on ecommerce.store_shipping_settings;
create policy store_shipping_settings_admin_write on ecommerce.store_shipping_settings
for all to authenticated
using (ecommerce.can_manage_store(store_id))
with check (ecommerce.can_manage_store(store_id));

revoke all on ecommerce.store_shipping_settings from public, anon;
grant select, insert, update, delete on ecommerce.store_shipping_settings to authenticated;
grant all on ecommerce.store_shipping_settings to service_role;

drop table if exists ecommerce.store_commerce_settings;

-- Recreate stores_legacy WITHOUT tax_rate / shipping_enabled / free_shipping_threshold
-- (security_invoker and grants preserved, same shape as 20260715000100).
create view ecommerce.stores_legacy
with (security_invoker = true)
as
select
  s.id, s.subdomain, s.store_name, s.domain, s.is_active, s.is_public,
  b.logo_url, b.favicon_url, b.primary_color, b.secondary_color,
  c.contact_email, c.contact_phone, c.address,
  s.currency_code,
  seo.seo_title, seo.seo_description,
  coalesce(k.seo_keywords, array[]::varchar[]) as seo_keywords,
  coalesce(i.metadata, '{}'::jsonb) as metadata,
  s.created_at, s.updated_at, s.deleted_at
from ecommerce.stores s
left join ecommerce.store_branding b on b.store_id = s.id
left join ecommerce.store_contact c on c.store_id = s.id
left join ecommerce.store_seo seo on seo.store_id = s.id
left join ecommerce.store_integrations i on i.store_id = s.id
left join (
  select store_id, array_agg(keyword order by keyword) as seo_keywords
  from ecommerce.store_seo_keywords
  group by store_id
) k on k.store_id = s.id;

grant select on ecommerce.stores_legacy to anon, authenticated, service_role;

commit;
