-- Privilege separation: managing a store's content now requires MEMBERSHIP
-- (store_users + a managing role). The global super_admin role keeps the
-- platform tier (policies that call is_global_admin directly) but no longer
-- grants ambient power over store content, component styles or storage.

-- -----------------------------------------------------------------------------
-- Per-store gates: drop the super_admin short-circuit and narrow the managing
-- roles to the only two the platform mints ('owner', 'admin').
-- -----------------------------------------------------------------------------
create or replace function ecommerce.can_manage_store(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'ecommerce', 'auth', 'pg_temp'
as $$
  select exists (
    select 1
    from ecommerce.store_users su
    join ecommerce.store_user_roles sur on sur.store_user_id = su.id
    join ecommerce.roles r on r.id = sur.role_id
    where su.store_id = p_store_id
      and su.user_id = auth.uid()
      and lower(coalesce(r.role_name, '')) in ('owner', 'admin')
  );
$$;

create or replace function ecommerce.can_user_manage_store(p_user_id uuid, p_store_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'ecommerce', 'auth', 'pg_temp'
as $function$
  select exists (
    select 1
    from ecommerce.store_users su
    join ecommerce.store_user_roles sur on sur.store_user_id = su.id
    join ecommerce.roles r on r.id = sur.role_id
    where su.store_id = p_store_id
      and su.user_id = p_user_id
      and lower(coalesce(r.role_name, '')) in ('owner', 'admin')
  );
$function$;

create or replace function ecommerce.user_manages_any_store(p_user_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'ecommerce', 'auth', 'pg_temp'
as $function$
  select exists (
    select 1
    from ecommerce.store_users su
    join ecommerce.store_user_roles sur on sur.store_user_id = su.id
    join ecommerce.roles r on r.id = sur.role_id
    where su.user_id = p_user_id
      and lower(coalesce(r.role_name, '')) in ('owner', 'admin')
  );
$function$;

comment on function ecommerce.user_manages_any_store(uuid) is
  'True when the user holds a managing role (owner/admin) in at least one store. Store-agnostic twin of ecommerce.can_user_manage_store.';

-- -----------------------------------------------------------------------------
-- Legacy global helpers stop granting anything. They stay defined because the
-- storage policies and the schema contract check still reference them by name;
-- every live policy that calls them already carries the membership branch
-- (is_storage_admin() OR can_manage_store(storage_root_store_id(name))).
-- -----------------------------------------------------------------------------
create or replace function ecommerce.is_component_styles_admin()
 returns boolean
 language sql
 stable security definer
 set search_path to 'ecommerce', 'public', 'auth'
as $function$
  select false;
$function$;

create or replace function ecommerce.is_storage_admin()
 returns boolean
 language sql
 stable security definer
 set search_path to 'ecommerce', 'public', 'auth'
as $function$
  select false;
$function$;

-- -----------------------------------------------------------------------------
-- Managing roles are the only ones the roles table may hold.
-- -----------------------------------------------------------------------------
alter table ecommerce.roles
  add constraint roles_role_name_allowed_chk check (role_name in ('owner', 'admin'));

-- -----------------------------------------------------------------------------
-- Membership provenance and signup origin.
-- -----------------------------------------------------------------------------
alter table ecommerce.store_users
  add column granted_by uuid references ecommerce.user_profiles(id) on delete set null;

comment on column ecommerce.store_users.granted_by is
  'Perfil que creó esta membresía (null para las históricas o si el otorgante fue borrado).';

alter table ecommerce.user_profiles
  add column signup_store_id uuid references ecommerce.stores(id) on delete set null;

comment on column ecommerce.user_profiles.signup_store_id is
  'Tienda desde cuyo storefront se registró el usuario (null para perfiles previos a esta columna).';

-- -----------------------------------------------------------------------------
-- Data cleanup: the global 'admin' role no longer exists (both holders already
-- own their store via membership), and profiles that never attached to any
-- store are dropped.
-- -----------------------------------------------------------------------------
update ecommerce.user_profiles
set role = 'user'
where lower(role) = 'admin';

delete from ecommerce.user_profiles up
where lower(coalesce(up.role, '')) = 'user'
  and not exists (
    select 1 from ecommerce.store_users su where su.user_id = up.id
  );
