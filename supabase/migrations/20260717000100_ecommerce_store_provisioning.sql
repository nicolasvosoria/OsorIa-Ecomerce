-- Store provisioning primitives.
--
-- ecommerce.provision_store creates a store and its owner membership in ONE
-- transaction. Doing the same four inserts from the Supabase JS client is not
-- equivalent: every insert() is its own HTTP request to PostgREST, hence its own
-- transaction. If the fourth failed, the first three would already be committed
-- and the store would survive orphaned, with its subdomain burned by
-- stores_subdomain_key (UNIQUE) so the retry could never reuse it. Same reason
-- ecommerce.decrement_inventory exists.
--
-- The store is born unpublished (is_public = false): provisioning creates it,
-- the owner publishes it. Satellite tables (store_branding, store_contact, ...)
-- and theme/style rows are deliberately not seeded; the app resolves those by
-- defaults in code and the legacy views COALESCE over their absence.

create or replace function ecommerce.provision_store(
  p_subdomain text,
  p_store_name text,
  p_owner_user_id uuid,
  p_currency_code text default 'COP'
)
returns uuid
language plpgsql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
declare
  v_store_id uuid;
  v_role_id uuid;
  v_store_user_id uuid;
begin
  if not exists (select 1 from ecommerce.user_profiles where id = p_owner_user_id) then
    raise exception 'owner % does not exist in ecommerce.user_profiles', p_owner_user_id;
  end if;

  if exists (select 1 from ecommerce.stores where subdomain = p_subdomain) then
    raise exception 'subdomain % is already taken', p_subdomain;
  end if;

  insert into ecommerce.stores (subdomain, store_name, currency_code, is_public)
  values (p_subdomain, p_store_name, coalesce(p_currency_code, 'COP'), false)
  returning id into v_store_id;

  insert into ecommerce.roles (store_id, role_name, is_system)
  values (v_store_id, 'owner', false)
  returning id into v_role_id;

  insert into ecommerce.store_users (store_id, user_id)
  values (v_store_id, p_owner_user_id)
  returning id into v_store_user_id;

  insert into ecommerce.store_user_roles (store_user_id, role_id)
  values (v_store_user_id, v_role_id);

  return v_store_id;
end;
$$;

comment on function ecommerce.provision_store(text, text, uuid, text) is
  'Creates a store (unpublished) plus its owner role, membership and role assignment in a single transaction, and returns the new store id. Raises if the owner profile does not exist or the subdomain is taken. Subdomain format and reserved names are validated by the application before calling.';

-- Never executable by anon: this is a privileged write reached from the server,
-- alongside the user_profiles role write that provisioning also performs.
revoke execute on function ecommerce.provision_store(text, text, uuid, text) from public;
grant execute on function ecommerce.provision_store(text, text, uuid, text) to service_role;

-- Global admin gate for edge checks that only know the user: answers "does this
-- user manage ANY store?". Mirrors ecommerce.can_user_manage_store without the
-- store filter. SECURITY DEFINER is required: store_user_roles is RLS-restricted
-- to super_admin, so a plain query would return nothing even for the store owner.

create or replace function ecommerce.user_manages_any_store(p_user_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'ecommerce', 'auth', 'pg_temp'
as $function$
  select exists (
      select 1
      from ecommerce.user_profiles up
      where up.id = p_user_id
        and lower(coalesce(up.role, '')) = 'super_admin'
    )
    or exists (
      select 1
      from ecommerce.store_users su
      join ecommerce.store_user_roles sur on sur.store_user_id = su.id
      join ecommerce.roles r on r.id = sur.role_id
      where su.user_id = p_user_id
        and lower(coalesce(r.role_name, '')) in ('owner', 'admin', 'super_admin', 'store_admin')
    );
$function$;

comment on function ecommerce.user_manages_any_store(uuid) is
  'True when the user is a super_admin or holds a managing role in at least one store. Store-agnostic twin of ecommerce.can_user_manage_store.';

grant execute on function ecommerce.user_manages_any_store(uuid) to anon, authenticated, service_role;

-- app_themes holds design presets, not anyone's data, so reading it is not
-- gated by is_active: that flag only marked the legacy single active theme, and
-- since is_global_admin() narrowed to super_admin it left every other admin
-- seeing just the one preset that happened to be flagged. anon keeps reading
-- because the storefront resolves a visitor's theme through app_theme_versions
-- into any preset, flagged or not. Writes stay super_admin only.

drop policy if exists app_themes_public_read on ecommerce.app_themes;
create policy app_themes_public_read on ecommerce.app_themes for select to anon, authenticated using (true);
