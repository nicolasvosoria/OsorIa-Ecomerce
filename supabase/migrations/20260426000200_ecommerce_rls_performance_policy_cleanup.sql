-- Remove RLS performance warnings introduced by the first hardening pass.
-- Security posture is unchanged; this consolidates overlapping policies and caches auth.uid().

drop policy if exists "Component styles public read" on ecommerce.component_styles;
drop policy if exists "Component styles admin insert" on ecommerce.component_styles;
drop policy if exists "Component styles admin update" on ecommerce.component_styles;
drop policy if exists "Component styles admin delete" on ecommerce.component_styles;

drop policy if exists user_profiles_self_or_admin_read on ecommerce.user_profiles;
create policy user_profiles_self_or_admin_read on ecommerce.user_profiles for select to authenticated using (id = (select auth.uid()) or ecommerce.is_global_admin());
drop policy if exists user_profiles_self_insert on ecommerce.user_profiles;
create policy user_profiles_self_insert on ecommerce.user_profiles for insert to authenticated with check (id = (select auth.uid()) or ecommerce.is_global_admin());
drop policy if exists user_profiles_self_or_admin_update on ecommerce.user_profiles;
create policy user_profiles_self_or_admin_update on ecommerce.user_profiles for update to authenticated using (id = (select auth.uid()) or ecommerce.is_global_admin()) with check (id = (select auth.uid()) or ecommerce.is_global_admin());

drop policy if exists orders_owner_or_admin_read on ecommerce.orders;
create policy orders_owner_or_admin_read on ecommerce.orders for select to authenticated using ((user_id is not null and user_id = (select auth.uid())) or ecommerce.can_manage_store(store_id));
drop policy if exists orders_authenticated_insert on ecommerce.orders;
create policy orders_authenticated_insert on ecommerce.orders for insert to authenticated with check ((user_id is not null and user_id = (select auth.uid())) or ecommerce.can_manage_store(store_id));

drop policy if exists order_items_owner_or_admin_read on ecommerce.order_items;
create policy order_items_owner_or_admin_read on ecommerce.order_items for select to authenticated using (exists (select 1 from ecommerce.orders o where o.id = order_id and ((o.user_id is not null and o.user_id = (select auth.uid())) or ecommerce.can_manage_store(o.store_id))));
drop policy if exists order_addresses_owner_or_admin_read on ecommerce.order_addresses;
create policy order_addresses_owner_or_admin_read on ecommerce.order_addresses for select to authenticated using (exists (select 1 from ecommerce.orders o where o.id = order_id and ((o.user_id is not null and o.user_id = (select auth.uid())) or ecommerce.can_manage_store(o.store_id))));

drop policy if exists carts_owner_or_admin_read_write on ecommerce.carts;
create policy carts_owner_or_admin_read_write on ecommerce.carts for all to authenticated using ((user_id is not null and user_id = (select auth.uid())) or ecommerce.can_manage_store(store_id)) with check ((user_id is not null and user_id = (select auth.uid())) or ecommerce.can_manage_store(store_id));
drop policy if exists cart_items_owner_or_admin_read_write on ecommerce.cart_items;
create policy cart_items_owner_or_admin_read_write on ecommerce.cart_items for all to authenticated using (exists (select 1 from ecommerce.carts c where c.id = cart_id and ((c.user_id is not null and c.user_id = (select auth.uid())) or ecommerce.can_manage_store(c.store_id)))) with check (exists (select 1 from ecommerce.carts c where c.id = cart_id and ((c.user_id is not null and c.user_id = (select auth.uid())) or ecommerce.can_manage_store(c.store_id))));
drop policy if exists store_users_admin_read_write on ecommerce.store_users;
create policy store_users_admin_read_write on ecommerce.store_users for all to authenticated using (ecommerce.can_manage_store(store_id) or user_id = (select auth.uid())) with check (ecommerce.can_manage_store(store_id) or user_id = (select auth.uid()));

-- Split FOR ALL policies into write-only policies so SELECT has exactly one permissive policy.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('store_branding', 'store_branding_admin_write', 'ecommerce.can_manage_store(store_id)'),
      ('store_contact', 'store_contact_admin_write', 'ecommerce.can_manage_store(store_id)'),
      ('store_commerce_settings', 'store_commerce_settings_admin_write', 'ecommerce.can_manage_store(store_id)'),
      ('store_integrations', 'store_integrations_admin_write', 'ecommerce.can_manage_store(store_id)'),
      ('store_seo', 'store_seo_admin_write', 'ecommerce.can_manage_store(store_id)'),
      ('store_seo_keywords', 'store_seo_keywords_admin_write', 'ecommerce.can_manage_store(store_id)'),
      ('component_styles', 'component_styles_admin_write_scoped', 'ecommerce.can_manage_store(store_id)'),
      ('item_categories', 'item_categories_admin_write', 'ecommerce.can_manage_store(store_id)'),
      ('store_items', 'store_items_admin_write', 'ecommerce.can_manage_store(store_id)'),
      ('app_theme_versions', 'app_theme_versions_admin_write', 'ecommerce.can_manage_store(store_id)'),
      ('app_fonts', 'app_fonts_admin_write', 'ecommerce.is_global_admin()'),
      ('app_themes', 'app_themes_admin_write', 'ecommerce.is_global_admin()')
    ) as t(table_name, old_policy, predicate)
  loop
    execute format('drop policy if exists %I on ecommerce.%I', r.old_policy, r.table_name);
    execute format('drop policy if exists %I on ecommerce.%I', r.table_name || '_admin_insert', r.table_name);
    execute format('drop policy if exists %I on ecommerce.%I', r.table_name || '_admin_update', r.table_name);
    execute format('drop policy if exists %I on ecommerce.%I', r.table_name || '_admin_delete', r.table_name);
    execute format('create policy %I on ecommerce.%I for insert to authenticated with check (%s)', r.table_name || '_admin_insert', r.table_name, r.predicate);
    execute format('create policy %I on ecommerce.%I for update to authenticated using (%s) with check (%s)', r.table_name || '_admin_update', r.table_name, r.predicate, r.predicate);
    execute format('create policy %I on ecommerce.%I for delete to authenticated using (%s)', r.table_name || '_admin_delete', r.table_name, r.predicate);
  end loop;
end $$;

drop policy if exists stores_admin_write on ecommerce.stores;
drop policy if exists stores_admin_insert on ecommerce.stores;
drop policy if exists stores_admin_update on ecommerce.stores;
drop policy if exists stores_admin_delete on ecommerce.stores;
create policy stores_admin_insert on ecommerce.stores for insert to authenticated with check (ecommerce.is_global_admin());
create policy stores_admin_update on ecommerce.stores for update to authenticated using (ecommerce.can_manage_store(id) or ecommerce.is_global_admin()) with check (ecommerce.can_manage_store(id) or ecommerce.is_global_admin());
create policy stores_admin_delete on ecommerce.stores for delete to authenticated using (ecommerce.can_manage_store(id) or ecommerce.is_global_admin());

-- Tables that do not have a public SELECT policy can keep one FOR ALL admin policy.
drop policy if exists inventory_movements_admin_read_write on ecommerce.inventory_movements;
create policy inventory_movements_admin_read_write on ecommerce.inventory_movements for all to authenticated using (ecommerce.can_manage_store(store_id)) with check (ecommerce.can_manage_store(store_id));

-- Order children: split admin writes to avoid a second SELECT policy.
drop policy if exists order_items_admin_write on ecommerce.order_items;
create policy order_items_admin_insert on ecommerce.order_items for insert to authenticated with check (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id)));
create policy order_items_admin_update on ecommerce.order_items for update to authenticated using (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id))) with check (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id)));
create policy order_items_admin_delete on ecommerce.order_items for delete to authenticated using (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id)));

drop policy if exists order_addresses_admin_write on ecommerce.order_addresses;
create policy order_addresses_admin_insert on ecommerce.order_addresses for insert to authenticated with check (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id)));
create policy order_addresses_admin_update on ecommerce.order_addresses for update to authenticated using (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id))) with check (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id)));
create policy order_addresses_admin_delete on ecommerce.order_addresses for delete to authenticated using (exists (select 1 from ecommerce.orders o where o.id = order_id and ecommerce.can_manage_store(o.store_id)));

-- Product child tables: split admin writes to avoid a second SELECT policy.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('item_variants', 'item_variants_admin_write', 'exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))'),
      ('item_metrics', 'item_metrics_admin_write', 'exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))'),
      ('item_seo', 'item_seo_admin_write', 'exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))'),
      ('item_tags', 'item_tags_admin_write', 'exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))'),
      ('item_options', 'item_options_admin_write', 'exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))'),
      ('item_option_values', 'item_option_values_admin_write', 'exists (select 1 from ecommerce.item_options io join ecommerce.store_items si on si.id = io.item_id where io.id = option_id and ecommerce.can_manage_store(si.store_id))')
    ) as t(table_name, old_policy, predicate)
  loop
    execute format('drop policy if exists %I on ecommerce.%I', r.old_policy, r.table_name);
    execute format('drop policy if exists %I on ecommerce.%I', r.table_name || '_admin_insert', r.table_name);
    execute format('drop policy if exists %I on ecommerce.%I', r.table_name || '_admin_update', r.table_name);
    execute format('drop policy if exists %I on ecommerce.%I', r.table_name || '_admin_delete', r.table_name);
    execute format('create policy %I on ecommerce.%I for insert to authenticated with check (%s)', r.table_name || '_admin_insert', r.table_name, r.predicate);
    execute format('create policy %I on ecommerce.%I for update to authenticated using (%s) with check (%s)', r.table_name || '_admin_update', r.table_name, r.predicate, r.predicate);
    execute format('create policy %I on ecommerce.%I for delete to authenticated using (%s)', r.table_name || '_admin_delete', r.table_name, r.predicate);
  end loop;
end $$;

drop policy if exists item_images_admin_write on ecommerce.item_images;
drop policy if exists item_images_admin_insert on ecommerce.item_images;
drop policy if exists item_images_admin_update on ecommerce.item_images;
drop policy if exists item_images_admin_delete on ecommerce.item_images;
create policy item_images_admin_insert on ecommerce.item_images for insert to authenticated with check ((item_id is not null and exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))) or (variant_id is not null and exists (select 1 from ecommerce.item_variants iv join ecommerce.store_items si on si.id = iv.item_id where iv.id = variant_id and ecommerce.can_manage_store(si.store_id))));
create policy item_images_admin_update on ecommerce.item_images for update to authenticated using ((item_id is not null and exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))) or (variant_id is not null and exists (select 1 from ecommerce.item_variants iv join ecommerce.store_items si on si.id = iv.item_id where iv.id = variant_id and ecommerce.can_manage_store(si.store_id)))) with check ((item_id is not null and exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))) or (variant_id is not null and exists (select 1 from ecommerce.item_variants iv join ecommerce.store_items si on si.id = iv.item_id where iv.id = variant_id and ecommerce.can_manage_store(si.store_id))));
create policy item_images_admin_delete on ecommerce.item_images for delete to authenticated using ((item_id is not null and exists (select 1 from ecommerce.store_items si where si.id = item_id and ecommerce.can_manage_store(si.store_id))) or (variant_id is not null and exists (select 1 from ecommerce.item_variants iv join ecommerce.store_items si on si.id = iv.item_id where iv.id = variant_id and ecommerce.can_manage_store(si.store_id))));
