-- Per-store storage management for products / component-images / marketing-assets.
-- New uploads are namespaced under {store_id}/... so a store admin can manage the
-- objects of their own store via ecommerce.can_manage_store, while super_admin keeps
-- global reach (including legacy flat-path objects that have no store_id segment).
-- Public read policies are untouched: existing image URLs keep working.

-- Root store id of a storage object, or null when the first path segment is not a
-- uuid (legacy flat-path objects). Guards the cast so per-store predicates never
-- fail on old objects; those fall back to the super_admin path.
create or replace function ecommerce.storage_root_store_id(object_name text)
 returns uuid
 language sql
 immutable
as $function$
  select (storage.foldername(object_name))[1]::uuid
  where (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
$function$;

grant execute on function ecommerce.storage_root_store_id(text) to authenticated;

drop policy if exists "Storage admin upload products" on storage.objects;
create policy "Storage admin upload products" on storage.objects for insert to authenticated with check (bucket_id='products' and (ecommerce.is_storage_admin() or ecommerce.can_manage_store(ecommerce.storage_root_store_id(name))));
drop policy if exists "Storage admin update products" on storage.objects;
create policy "Storage admin update products" on storage.objects for update to authenticated using (bucket_id='products' and (ecommerce.is_storage_admin() or ecommerce.can_manage_store(ecommerce.storage_root_store_id(name)))) with check (bucket_id='products' and (ecommerce.is_storage_admin() or ecommerce.can_manage_store(ecommerce.storage_root_store_id(name))));
drop policy if exists "Storage admin delete products" on storage.objects;
create policy "Storage admin delete products" on storage.objects for delete to authenticated using (bucket_id='products' and (ecommerce.is_storage_admin() or ecommerce.can_manage_store(ecommerce.storage_root_store_id(name))));

drop policy if exists "Storage admin upload component-images" on storage.objects;
create policy "Storage admin upload component-images" on storage.objects for insert to authenticated with check (bucket_id='component-images' and (ecommerce.is_storage_admin() or ecommerce.can_manage_store(ecommerce.storage_root_store_id(name))));
drop policy if exists "Storage admin update component-images" on storage.objects;
create policy "Storage admin update component-images" on storage.objects for update to authenticated using (bucket_id='component-images' and (ecommerce.is_storage_admin() or ecommerce.can_manage_store(ecommerce.storage_root_store_id(name)))) with check (bucket_id='component-images' and (ecommerce.is_storage_admin() or ecommerce.can_manage_store(ecommerce.storage_root_store_id(name))));
drop policy if exists "Storage admin delete component-images" on storage.objects;
create policy "Storage admin delete component-images" on storage.objects for delete to authenticated using (bucket_id='component-images' and (ecommerce.is_storage_admin() or ecommerce.can_manage_store(ecommerce.storage_root_store_id(name))));

drop policy if exists marketing_assets_admin_insert on storage.objects;
create policy marketing_assets_admin_insert on storage.objects for insert to authenticated with check (bucket_id='marketing-assets' and (ecommerce.is_storage_admin() or ecommerce.can_manage_store(ecommerce.storage_root_store_id(name))));
drop policy if exists marketing_assets_admin_update on storage.objects;
create policy marketing_assets_admin_update on storage.objects for update to authenticated using (bucket_id='marketing-assets' and (ecommerce.is_storage_admin() or ecommerce.can_manage_store(ecommerce.storage_root_store_id(name)))) with check (bucket_id='marketing-assets' and (ecommerce.is_storage_admin() or ecommerce.can_manage_store(ecommerce.storage_root_store_id(name))));
drop policy if exists marketing_assets_admin_delete on storage.objects;
create policy marketing_assets_admin_delete on storage.objects for delete to authenticated using (bucket_id='marketing-assets' and (ecommerce.is_storage_admin() or ecommerce.can_manage_store(ecommerce.storage_root_store_id(name))));
