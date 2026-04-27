-- Harden exposed ecommerce schema before production.
-- Scope: ecommerce schema + ecommerce-owned storage buckets only. Never touch public ecommerce-like tables.

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Auth helpers used by RLS policies. SECURITY DEFINER is intentional here so RLS
-- checks can evaluate role membership without recursive policy failures.
-- -----------------------------------------------------------------------------
create or replace function ecommerce.is_global_admin()
returns boolean
language sql
stable
security definer
set search_path to 'ecommerce', 'auth', 'pg_temp'
as $$
  select exists (
    select 1
    from ecommerce.user_profiles up
    where up.id = auth.uid()
      and lower(coalesce(up.role, '')) in ('admin', 'super_admin')
  );
$$;

create or replace function ecommerce.can_manage_store(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'ecommerce', 'auth', 'pg_temp'
as $$
  select ecommerce.is_global_admin()
    or exists (
      select 1
      from ecommerce.store_users su
      join ecommerce.store_user_roles sur on sur.store_user_id = su.id
      join ecommerce.roles r on r.id = sur.role_id
      where su.store_id = p_store_id
        and su.user_id = auth.uid()
        and lower(coalesce(r.role_name, '')) in ('owner', 'admin', 'super_admin', 'store_admin')
    );
$$;

create or replace function ecommerce.is_public_store(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
  select exists (
    select 1
    from ecommerce.stores s
    where s.id = p_store_id
      and s.is_active is true
      and s.is_public is true
      and s.deleted_at is null
  );
$$;

create or replace function ecommerce.is_public_item(p_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
  select exists (
    select 1
    from ecommerce.store_items si
    where si.id = p_item_id
      and si.is_active is true
      and si.is_available_for_sale is true
      and ecommerce.is_public_store(si.store_id)
  );
$$;

create or replace function ecommerce.increment_item_views(p_item_id uuid)
returns integer
language plpgsql
set search_path to 'ecommerce', 'pg_temp'
as $$
declare
  v_new_count integer;
begin
  if not exists (select 1 from ecommerce.store_items where id = p_item_id) then
    raise exception 'store item % does not exist in ecommerce.store_items', p_item_id;
  end if;

  insert into ecommerce.item_metrics as im (item_id, view_count, updated_at)
  values (p_item_id, 1, timezone('utc', now()))
  on conflict (item_id) do update
    set view_count = im.view_count + 1,
        updated_at = excluded.updated_at
  returning view_count into v_new_count;

  return v_new_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Compatibility views must obey caller RLS. Also remove secret-bearing columns
-- from the public stores adapter; shopify_access_token must never be readable
-- through anon/authenticated APIs.
-- -----------------------------------------------------------------------------
alter view if exists ecommerce.app_fonts_legacy set (security_invoker = true);
alter view if exists ecommerce.app_themes_legacy set (security_invoker = true);
alter view if exists ecommerce.component_styles_legacy set (security_invoker = true);
alter view if exists ecommerce.item_options_legacy set (security_invoker = true);
alter view if exists ecommerce.orders_legacy set (security_invoker = true);
alter view if exists ecommerce.store_items_legacy set (security_invoker = true);

drop view if exists ecommerce.stores_legacy;
create view ecommerce.stores_legacy
with (security_invoker = true)
as
select
  s.id,
  s.subdomain,
  s.store_name,
  s.domain,
  s.is_active,
  s.is_public,
  b.logo_url,
  b.favicon_url,
  b.primary_color,
  b.secondary_color,
  c.contact_email,
  c.contact_phone,
  c.address,
  s.currency_code,
  cs.tax_rate,
  cs.shipping_enabled,
  cs.free_shipping_threshold,
  seo.seo_title,
  seo.seo_description,
  coalesce(k.seo_keywords, array[]::varchar[]) as seo_keywords,
  coalesce(i.metadata, '{}'::jsonb) as metadata,
  i.shopify_store_domain,
  s.created_at,
  s.updated_at,
  s.deleted_at
from ecommerce.stores s
left join ecommerce.store_branding b on b.store_id = s.id
left join ecommerce.store_contact c on c.store_id = s.id
left join ecommerce.store_commerce_settings cs on cs.store_id = s.id
left join ecommerce.store_seo seo on seo.store_id = s.id
left join ecommerce.store_integrations i on i.store_id = s.id
left join (
  select store_id, array_agg(keyword order by keyword) as seo_keywords
  from ecommerce.store_seo_keywords
  group by store_id
) k on k.store_id = s.id;

grant select on ecommerce.app_fonts_legacy, ecommerce.app_themes_legacy, ecommerce.component_styles_legacy,
  ecommerce.item_options_legacy, ecommerce.orders_legacy, ecommerce.store_items_legacy, ecommerce.stores_legacy
  to anon, authenticated, service_role;

-- Column-level privilege tightening for secret-bearing integration rows.
revoke select on ecommerce.store_integrations from anon, authenticated;
grant select (store_id, shopify_store_domain, metadata, updated_at) on ecommerce.store_integrations to anon, authenticated;
grant all on ecommerce.store_integrations to service_role;

-- -----------------------------------------------------------------------------
-- Enable RLS on every exposed ecommerce table.
-- -----------------------------------------------------------------------------
alter table ecommerce.app_fonts enable row level security;
alter table ecommerce.app_theme_versions enable row level security;
alter table ecommerce.app_themes enable row level security;
alter table ecommerce.cart_items enable row level security;
alter table ecommerce.carts enable row level security;
alter table ecommerce.component_styles enable row level security;
alter table ecommerce.inventory_movements enable row level security;
alter table ecommerce.item_categories enable row level security;
alter table ecommerce.item_images enable row level security;
alter table ecommerce.item_metrics enable row level security;
alter table ecommerce.item_option_values enable row level security;
alter table ecommerce.item_options enable row level security;
alter table ecommerce.item_seo enable row level security;
alter table ecommerce.item_tags enable row level security;
alter table ecommerce.item_variants enable row level security;
alter table ecommerce.order_addresses enable row level security;
alter table ecommerce.order_items enable row level security;
alter table ecommerce.orders enable row level security;
alter table ecommerce.payment_transactions enable row level security;
alter table ecommerce.permissions enable row level security;
alter table ecommerce.role_permissions enable row level security;
alter table ecommerce.roles enable row level security;
alter table ecommerce.shipments enable row level security;
alter table ecommerce.store_branding enable row level security;
alter table ecommerce.store_commerce_settings enable row level security;
alter table ecommerce.store_contact enable row level security;
alter table ecommerce.store_integrations enable row level security;
alter table ecommerce.store_items enable row level security;
alter table ecommerce.store_seo enable row level security;
alter table ecommerce.store_seo_keywords enable row level security;
alter table ecommerce.store_user_roles enable row level security;
alter table ecommerce.store_users enable row level security;
alter table ecommerce.stores enable row level security;
alter table ecommerce.user_profiles enable row level security;

-- -----------------------------------------------------------------------------
-- Public storefront read policies.
-- -----------------------------------------------------------------------------
drop policy if exists stores_public_read on ecommerce.stores;
create policy stores_public_read on ecommerce.stores
for select to anon, authenticated
using ((is_active is true and is_public is true and deleted_at is null) or ecommerce.is_global_admin());

drop policy if exists store_branding_public_read on ecommerce.store_branding;
create policy store_branding_public_read on ecommerce.store_branding
for select to anon, authenticated
using (ecommerce.is_public_store(store_id) or ecommerce.can_manage_store(store_id));

drop policy if exists store_contact_public_read on ecommerce.store_contact;
create policy store_contact_public_read on ecommerce.store_contact
for select to anon, authenticated
using (ecommerce.is_public_store(store_id) or ecommerce.can_manage_store(store_id));

drop policy if exists store_commerce_settings_public_read on ecommerce.store_commerce_settings;
create policy store_commerce_settings_public_read on ecommerce.store_commerce_settings
for select to anon, authenticated
using (ecommerce.is_public_store(store_id) or ecommerce.can_manage_store(store_id));

drop policy if exists store_seo_public_read on ecommerce.store_seo;
create policy store_seo_public_read on ecommerce.store_seo
for select to anon, authenticated
using (ecommerce.is_public_store(store_id) or ecommerce.can_manage_store(store_id));

drop policy if exists store_seo_keywords_public_read on ecommerce.store_seo_keywords;
create policy store_seo_keywords_public_read on ecommerce.store_seo_keywords
for select to anon, authenticated
using (ecommerce.is_public_store(store_id) or ecommerce.can_manage_store(store_id));

drop policy if exists store_integrations_public_metadata_read on ecommerce.store_integrations;
create policy store_integrations_public_metadata_read on ecommerce.store_integrations
for select to anon, authenticated
using (ecommerce.is_public_store(store_id) or ecommerce.can_manage_store(store_id));

drop policy if exists app_fonts_public_read on ecommerce.app_fonts;
create policy app_fonts_public_read on ecommerce.app_fonts
for select to anon, authenticated
using (is_active is true or ecommerce.is_global_admin());

drop policy if exists app_themes_public_read on ecommerce.app_themes;
create policy app_themes_public_read on ecommerce.app_themes
for select to anon, authenticated
using (is_active is true or ecommerce.is_global_admin());

drop policy if exists app_theme_versions_public_read on ecommerce.app_theme_versions;
create policy app_theme_versions_public_read on ecommerce.app_theme_versions
for select to anon, authenticated
using ((is_current is true and ecommerce.is_public_store(store_id)) or ecommerce.can_manage_store(store_id));

drop policy if exists component_styles_public_read_scoped on ecommerce.component_styles;
create policy component_styles_public_read_scoped on ecommerce.component_styles
for select to anon, authenticated
using (ecommerce.is_public_store(store_id) or ecommerce.can_manage_store(store_id));

drop policy if exists item_categories_public_read on ecommerce.item_categories;
create policy item_categories_public_read on ecommerce.item_categories
for select to anon, authenticated
using ((is_active is true and ecommerce.is_public_store(store_id)) or ecommerce.can_manage_store(store_id));

drop policy if exists store_items_public_read on ecommerce.store_items;
create policy store_items_public_read on ecommerce.store_items
for select to anon, authenticated
using ((is_active is true and is_available_for_sale is true and ecommerce.is_public_store(store_id)) or ecommerce.can_manage_store(store_id));

drop policy if exists item_variants_public_read on ecommerce.item_variants;
create policy item_variants_public_read on ecommerce.item_variants
for select to anon, authenticated
using (ecommerce.is_public_item(item_id) or exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id)));

drop policy if exists item_images_public_read on ecommerce.item_images;
create policy item_images_public_read on ecommerce.item_images
for select to anon, authenticated
using ((item_id is not null and ecommerce.is_public_item(item_id)) or exists (select 1 from ecommerce.item_variants iv join ecommerce.store_items si on si.id = iv.item_id where iv.id = variant_id and (ecommerce.is_public_item(si.id) or ecommerce.can_manage_store(si.store_id))));

drop policy if exists item_metrics_public_read on ecommerce.item_metrics;
create policy item_metrics_public_read on ecommerce.item_metrics
for select to anon, authenticated
using (ecommerce.is_public_item(item_id) or exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id)));

drop policy if exists item_seo_public_read on ecommerce.item_seo;
create policy item_seo_public_read on ecommerce.item_seo
for select to anon, authenticated
using (ecommerce.is_public_item(item_id) or exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id)));

drop policy if exists item_tags_public_read on ecommerce.item_tags;
create policy item_tags_public_read on ecommerce.item_tags
for select to anon, authenticated
using (ecommerce.is_public_item(item_id) or exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id)));

drop policy if exists item_options_public_read on ecommerce.item_options;
create policy item_options_public_read on ecommerce.item_options
for select to anon, authenticated
using (ecommerce.is_public_item(item_id) or exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id)));

drop policy if exists item_option_values_public_read on ecommerce.item_option_values;
create policy item_option_values_public_read on ecommerce.item_option_values
for select to anon, authenticated
using (exists (select 1 from ecommerce.item_options io where io.id = option_id and ecommerce.is_public_item(io.item_id)) or exists (select 1 from ecommerce.item_options io join ecommerce.store_items si on si.id = io.item_id where io.id = option_id and ecommerce.can_manage_store(si.store_id)));

-- -----------------------------------------------------------------------------
-- Authenticated ownership/admin policies for private data.
-- -----------------------------------------------------------------------------
drop policy if exists user_profiles_self_or_admin_read on ecommerce.user_profiles;
create policy user_profiles_self_or_admin_read on ecommerce.user_profiles
for select to authenticated
using (id = auth.uid() or ecommerce.is_global_admin());

drop policy if exists user_profiles_self_insert on ecommerce.user_profiles;
create policy user_profiles_self_insert on ecommerce.user_profiles
for insert to authenticated
with check (id = auth.uid() or ecommerce.is_global_admin());

drop policy if exists user_profiles_self_or_admin_update on ecommerce.user_profiles;
create policy user_profiles_self_or_admin_update on ecommerce.user_profiles
for update to authenticated
using (id = auth.uid() or ecommerce.is_global_admin())
with check (id = auth.uid() or ecommerce.is_global_admin());

drop policy if exists orders_owner_or_admin_read on ecommerce.orders;
create policy orders_owner_or_admin_read on ecommerce.orders
for select to authenticated
using ((user_id is not null and user_id = auth.uid()) or ecommerce.can_manage_store(store_id));

drop policy if exists orders_authenticated_insert on ecommerce.orders;
create policy orders_authenticated_insert on ecommerce.orders
for insert to authenticated
with check ((user_id is not null and user_id = auth.uid()) or ecommerce.can_manage_store(store_id));

drop policy if exists orders_admin_update on ecommerce.orders;
create policy orders_admin_update on ecommerce.orders
for update to authenticated
using (ecommerce.can_manage_store(store_id))
with check (ecommerce.can_manage_store(store_id));

drop policy if exists orders_admin_delete on ecommerce.orders;
create policy orders_admin_delete on ecommerce.orders
for delete to authenticated
using (ecommerce.can_manage_store(store_id));

drop policy if exists order_items_owner_or_admin_read on ecommerce.order_items;
create policy order_items_owner_or_admin_read on ecommerce.order_items
for select to authenticated
using (exists (select 1 from ecommerce.orders o where o.id = order_id and ((o.user_id is not null and o.user_id = auth.uid()) or ecommerce.can_manage_store(o.store_id))));

drop policy if exists order_items_admin_write on ecommerce.order_items;
create policy order_items_admin_write on ecommerce.order_items
for all to authenticated
using (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id)))
with check (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id)));

drop policy if exists order_addresses_owner_or_admin_read on ecommerce.order_addresses;
create policy order_addresses_owner_or_admin_read on ecommerce.order_addresses
for select to authenticated
using (exists (select 1 from ecommerce.orders o where o.id = order_id and ((o.user_id is not null and o.user_id = auth.uid()) or ecommerce.can_manage_store(o.store_id))));

drop policy if exists order_addresses_admin_write on ecommerce.order_addresses;
create policy order_addresses_admin_write on ecommerce.order_addresses
for all to authenticated
using (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id)))
with check (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id)));

drop policy if exists payment_transactions_admin_read_write on ecommerce.payment_transactions;
create policy payment_transactions_admin_read_write on ecommerce.payment_transactions
for all to authenticated
using (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id)))
with check (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id)));

drop policy if exists shipments_admin_read_write on ecommerce.shipments;
create policy shipments_admin_read_write on ecommerce.shipments
for all to authenticated
using (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id)))
with check (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id)));

drop policy if exists carts_owner_or_admin_read_write on ecommerce.carts;
create policy carts_owner_or_admin_read_write on ecommerce.carts
for all to authenticated
using ((user_id is not null and user_id = auth.uid()) or ecommerce.can_manage_store(store_id))
with check ((user_id is not null and user_id = auth.uid()) or ecommerce.can_manage_store(store_id));

drop policy if exists cart_items_owner_or_admin_read_write on ecommerce.cart_items;
create policy cart_items_owner_or_admin_read_write on ecommerce.cart_items
for all to authenticated
using (exists (select 1 from ecommerce.carts c where c.id = cart_id and ((c.user_id is not null and c.user_id = auth.uid()) or ecommerce.can_manage_store(c.store_id))))
with check (exists (select 1 from ecommerce.carts c where c.id = cart_id and ((c.user_id is not null and c.user_id = auth.uid()) or ecommerce.can_manage_store(c.store_id))));

-- Generic store-admin write policies for store-scoped admin/config tables.
drop policy if exists store_branding_admin_write on ecommerce.store_branding;
create policy store_branding_admin_write on ecommerce.store_branding for all to authenticated using (ecommerce.can_manage_store(store_id)) with check (ecommerce.can_manage_store(store_id));
drop policy if exists store_contact_admin_write on ecommerce.store_contact;
create policy store_contact_admin_write on ecommerce.store_contact for all to authenticated using (ecommerce.can_manage_store(store_id)) with check (ecommerce.can_manage_store(store_id));
drop policy if exists store_commerce_settings_admin_write on ecommerce.store_commerce_settings;
create policy store_commerce_settings_admin_write on ecommerce.store_commerce_settings for all to authenticated using (ecommerce.can_manage_store(store_id)) with check (ecommerce.can_manage_store(store_id));
drop policy if exists store_integrations_admin_write on ecommerce.store_integrations;
create policy store_integrations_admin_write on ecommerce.store_integrations for all to authenticated using (ecommerce.can_manage_store(store_id)) with check (ecommerce.can_manage_store(store_id));
drop policy if exists store_seo_admin_write on ecommerce.store_seo;
create policy store_seo_admin_write on ecommerce.store_seo for all to authenticated using (ecommerce.can_manage_store(store_id)) with check (ecommerce.can_manage_store(store_id));
drop policy if exists store_seo_keywords_admin_write on ecommerce.store_seo_keywords;
create policy store_seo_keywords_admin_write on ecommerce.store_seo_keywords for all to authenticated using (ecommerce.can_manage_store(store_id)) with check (ecommerce.can_manage_store(store_id));
drop policy if exists component_styles_admin_write_scoped on ecommerce.component_styles;
create policy component_styles_admin_write_scoped on ecommerce.component_styles for all to authenticated using (ecommerce.can_manage_store(store_id)) with check (ecommerce.can_manage_store(store_id));
drop policy if exists item_categories_admin_write on ecommerce.item_categories;
create policy item_categories_admin_write on ecommerce.item_categories for all to authenticated using (ecommerce.can_manage_store(store_id)) with check (ecommerce.can_manage_store(store_id));
drop policy if exists store_items_admin_write on ecommerce.store_items;
create policy store_items_admin_write on ecommerce.store_items for all to authenticated using (ecommerce.can_manage_store(store_id)) with check (ecommerce.can_manage_store(store_id));
drop policy if exists app_theme_versions_admin_write on ecommerce.app_theme_versions;
create policy app_theme_versions_admin_write on ecommerce.app_theme_versions for all to authenticated using (ecommerce.can_manage_store(store_id)) with check (ecommerce.can_manage_store(store_id));
drop policy if exists inventory_movements_admin_read_write on ecommerce.inventory_movements;
create policy inventory_movements_admin_read_write on ecommerce.inventory_movements for all to authenticated using (ecommerce.can_manage_store(store_id)) with check (ecommerce.can_manage_store(store_id));
drop policy if exists stores_admin_write on ecommerce.stores;
create policy stores_admin_write on ecommerce.stores for all to authenticated using (ecommerce.can_manage_store(id) or ecommerce.is_global_admin()) with check (ecommerce.can_manage_store(id) or ecommerce.is_global_admin());

-- Global admin policies for global configuration/RBAC tables.
drop policy if exists app_fonts_admin_write on ecommerce.app_fonts;
create policy app_fonts_admin_write on ecommerce.app_fonts for all to authenticated using (ecommerce.is_global_admin()) with check (ecommerce.is_global_admin());
drop policy if exists app_themes_admin_write on ecommerce.app_themes;
create policy app_themes_admin_write on ecommerce.app_themes for all to authenticated using (ecommerce.is_global_admin()) with check (ecommerce.is_global_admin());
drop policy if exists permissions_admin_read_write on ecommerce.permissions;
create policy permissions_admin_read_write on ecommerce.permissions for all to authenticated using (ecommerce.is_global_admin()) with check (ecommerce.is_global_admin());
drop policy if exists roles_admin_read_write on ecommerce.roles;
create policy roles_admin_read_write on ecommerce.roles for all to authenticated using (ecommerce.can_manage_store(store_id) or ecommerce.is_global_admin()) with check (ecommerce.can_manage_store(store_id) or ecommerce.is_global_admin());
drop policy if exists role_permissions_admin_read_write on ecommerce.role_permissions;
create policy role_permissions_admin_read_write on ecommerce.role_permissions for all to authenticated using (ecommerce.is_global_admin()) with check (ecommerce.is_global_admin());
drop policy if exists store_users_admin_read_write on ecommerce.store_users;
create policy store_users_admin_read_write on ecommerce.store_users for all to authenticated using (ecommerce.can_manage_store(store_id) or user_id = auth.uid()) with check (ecommerce.can_manage_store(store_id) or user_id = auth.uid());
drop policy if exists store_user_roles_admin_read_write on ecommerce.store_user_roles;
create policy store_user_roles_admin_read_write on ecommerce.store_user_roles for all to authenticated using (ecommerce.is_global_admin()) with check (ecommerce.is_global_admin());

-- Child product tables are managed through their parent product's store.
drop policy if exists item_variants_admin_write on ecommerce.item_variants;
create policy item_variants_admin_write on ecommerce.item_variants for all to authenticated using (exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))) with check (exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id)));
drop policy if exists item_images_admin_write on ecommerce.item_images;
create policy item_images_admin_write on ecommerce.item_images for all to authenticated using ((item_id is not null and exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))) or (variant_id is not null and exists (select 1 from ecommerce.item_variants iv join ecommerce.store_items si on si.id = iv.item_id where iv.id = variant_id and ecommerce.can_manage_store(si.store_id)))) with check ((item_id is not null and exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))) or (variant_id is not null and exists (select 1 from ecommerce.item_variants iv join ecommerce.store_items si on si.id = iv.item_id where iv.id = variant_id and ecommerce.can_manage_store(si.store_id))));
drop policy if exists item_metrics_admin_write on ecommerce.item_metrics;
create policy item_metrics_admin_write on ecommerce.item_metrics for all to authenticated using (exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))) with check (exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id)));
drop policy if exists item_seo_admin_write on ecommerce.item_seo;
create policy item_seo_admin_write on ecommerce.item_seo for all to authenticated using (exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))) with check (exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id)));
drop policy if exists item_tags_admin_write on ecommerce.item_tags;
create policy item_tags_admin_write on ecommerce.item_tags for all to authenticated using (exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))) with check (exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id)));
drop policy if exists item_options_admin_write on ecommerce.item_options;
create policy item_options_admin_write on ecommerce.item_options for all to authenticated using (exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))) with check (exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id)));
drop policy if exists item_option_values_admin_write on ecommerce.item_option_values;
create policy item_option_values_admin_write on ecommerce.item_option_values for all to authenticated using (exists (select 1 from ecommerce.item_options io join ecommerce.store_items si on si.id = io.item_id where io.id = option_id and ecommerce.can_manage_store(si.store_id))) with check (exists (select 1 from ecommerce.item_options io join ecommerce.store_items si on si.id = io.item_id where io.id = option_id and ecommerce.can_manage_store(si.store_id)));

-- -----------------------------------------------------------------------------
-- Storage: public buckets remain URL-readable, but object listing via broad
-- SELECT policies is removed. Upload/update/delete stays admin-gated.
-- -----------------------------------------------------------------------------
drop policy if exists "Storage public read products" on storage.objects;
drop policy if exists "Storage public read component-images" on storage.objects;
drop policy if exists marketing_assets_public_read on storage.objects;

-- -----------------------------------------------------------------------------
-- Performance hardening: cover foreign keys flagged by Supabase advisor and
-- remove duplicate component_styles index created by the compat patch.
-- -----------------------------------------------------------------------------
drop index if exists ecommerce.component_styles_store_component_unique;

create index if not exists app_theme_versions_theme_id_idx on ecommerce.app_theme_versions(theme_id);
create index if not exists cart_items_cart_id_idx on ecommerce.cart_items(cart_id);
create index if not exists cart_items_variant_id_idx on ecommerce.cart_items(variant_id);
create index if not exists carts_store_id_idx on ecommerce.carts(store_id);
create index if not exists inventory_movements_related_cart_id_idx on ecommerce.inventory_movements(related_cart_id);
create index if not exists inventory_movements_related_order_id_idx on ecommerce.inventory_movements(related_order_id);
create index if not exists inventory_movements_store_id_idx on ecommerce.inventory_movements(store_id);
create index if not exists inventory_movements_variant_id_idx on ecommerce.inventory_movements(variant_id);
create index if not exists item_categories_parent_category_id_idx on ecommerce.item_categories(parent_category_id);
create index if not exists item_images_item_id_idx on ecommerce.item_images(item_id);
create index if not exists item_images_variant_id_idx on ecommerce.item_images(variant_id);
create index if not exists item_option_values_option_id_idx on ecommerce.item_option_values(option_id);
create index if not exists item_options_item_id_idx on ecommerce.item_options(item_id);
create index if not exists order_addresses_order_id_idx on ecommerce.order_addresses(order_id);
create index if not exists order_items_order_id_idx on ecommerce.order_items(order_id);
create index if not exists order_items_product_id_idx on ecommerce.order_items(product_id);
create index if not exists order_items_variant_id_idx on ecommerce.order_items(variant_id);
create index if not exists payment_transactions_order_id_idx on ecommerce.payment_transactions(order_id);
create index if not exists role_permissions_permission_id_idx on ecommerce.role_permissions(permission_id);
create index if not exists shipments_order_id_idx on ecommerce.shipments(order_id);
create index if not exists store_items_category_id_idx on ecommerce.store_items(category_id);
create index if not exists store_user_roles_role_id_idx on ecommerce.store_user_roles(role_id);
create index if not exists store_users_user_id_idx on ecommerce.store_users(user_id);
