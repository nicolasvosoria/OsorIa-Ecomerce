-- Restrict the three global admin gates to super_admin only.
-- Membership tables (store_users/store_user_roles/roles) drive per-store access
-- via ecommerce.can_manage_store; these gates are the global tier and must not
-- grant global reach to plain 'admin' or store-scoped roles.

create or replace function ecommerce.is_global_admin()
 returns boolean
 language sql
 stable security definer
 set search_path to 'ecommerce', 'auth', 'pg_temp'
as $function$
  select exists (
    select 1
    from ecommerce.user_profiles up
    where up.id = auth.uid()
      and lower(coalesce(up.role, '')) = 'super_admin'
  );
$function$;

create or replace function ecommerce.is_component_styles_admin()
 returns boolean
 language plpgsql
 security definer
 set search_path to 'ecommerce', 'public', 'auth'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return false;
  end if;
  return exists (
    select 1
    from ecommerce.user_profiles
    where id = v_uid
      and lower(coalesce(role, '')) = 'super_admin'
  );
end
$function$;

create or replace function ecommerce.is_storage_admin()
 returns boolean
 language plpgsql
 security definer
 set search_path to 'ecommerce', 'public', 'auth'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return false;
  end if;
  return exists (
    select 1
    from ecommerce.user_profiles
    where id = v_uid
      and lower(coalesce(role, '')) = 'super_admin'
  );
end
$function$;
