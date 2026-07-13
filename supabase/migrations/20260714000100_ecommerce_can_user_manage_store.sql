-- Per-store admin gate parameterized by user id, for edge checks that run under
-- the service role (no auth.uid()). Same authorization logic as
-- ecommerce.can_manage_store, but p_user_id replaces auth.uid() and the
-- super_admin tier is checked inline (is_global_admin also depends on auth.uid()).

create or replace function ecommerce.can_user_manage_store(p_user_id uuid, p_store_id uuid)
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
      where su.store_id = p_store_id
        and su.user_id = p_user_id
        and lower(coalesce(r.role_name, '')) in ('owner', 'admin', 'super_admin', 'store_admin')
    );
$function$;
