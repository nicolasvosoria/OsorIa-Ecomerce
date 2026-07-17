-- Seeds staging so the admin store-scoping (403) can be QA'd on screen: a second store,
-- plus one signed-in admin per store who manages that store and nothing else.
-- Data only, never DDL. Idempotent: re-running inserts nothing new.
--
-- Apply:
--   psql "<staging-url>" -X -v ON_ERROR_STOP=1 -f supabase/seeds/staging-second-store.sql
--
-- Pick the owner account (must be an ecommerce.user_profiles row with role 'user',
-- never the super_admin, whose access is global and would defeat the 403 test):
--   psql ... -v owner_user_id=33a80958-ba20-4cd3-af72-26e1e3ba277b -f supabase/seeds/staging-second-store.sql

\set store_subdomain 'tienda2'
\set store_name 'Tienda Demo QA'

\if :{?owner_user_id}
\else
\set owner_user_id 'd769b435-61b4-4a19-89f7-b2a6111960dc'
\endif

select coalesce(
  (select lower(coalesce(role, '')) from ecommerce.user_profiles where id = :'owner_user_id'::uuid) = 'user',
  false
) as owner_is_plain_user \gset

\if :owner_is_plain_user
\else
\echo 'owner_user_id must be an ecommerce.user_profiles row with role user (never the super_admin).'
\quit 1
\endif

begin;

insert into ecommerce.stores (subdomain, store_name)
values (:'store_subdomain', :'store_name')
on conflict (subdomain) do nothing;

insert into ecommerce.roles (store_id, role_name, is_system)
select id, 'owner', false
from ecommerce.stores
where subdomain = :'store_subdomain'
on conflict (store_id, role_name) do nothing;

insert into ecommerce.store_users (store_id, user_id)
select id, :'owner_user_id'::uuid
from ecommerce.stores
where subdomain = :'store_subdomain'
on conflict (store_id, user_id) do nothing;

insert into ecommerce.store_user_roles (store_user_id, role_id)
select store_user.id, role.id
from ecommerce.stores store
join ecommerce.store_users store_user
  on store_user.store_id = store.id and store_user.user_id = :'owner_user_id'::uuid
join ecommerce.roles role
  on role.store_id = store.id and role.role_name = 'owner'
where store.subdomain = :'store_subdomain'
on conflict (store_user_id, role_id) do nothing;

-- One admin per store. Nothing creates ecommerce.user_profiles for these accounts: the only
-- trigger on auth.users belongs to another app sharing this project, so the profile is seeded here.
-- The global role stays 'user' — the global 'admin' role no longer exists: /admin opens by
-- managing membership (can_user_manage_store), so each account reaches its own store alone
-- through the 'owner' membership seeded below.

insert into ecommerce.user_profiles (id, email, role)
values
  ('90e1f83c-7b56-4a35-a52e-662456c5c766'::uuid, 'default@gmail.com', 'user'),
  ('511a1d0b-0612-45bf-ac81-4e41e57a2f12'::uuid, 'tienda2@gmail.com', 'user')
on conflict (id) do nothing;

insert into ecommerce.roles (store_id, role_name, is_system)
select store.id, 'owner', false
from ecommerce.stores store
where store.subdomain in ('default', :'store_subdomain')
on conflict (store_id, role_name) do nothing;

insert into ecommerce.store_users (store_id, user_id)
select store.id, store_admin.user_id::uuid
from (values
  ('90e1f83c-7b56-4a35-a52e-662456c5c766', 'default'),
  ('511a1d0b-0612-45bf-ac81-4e41e57a2f12', :'store_subdomain')
) as store_admin(user_id, subdomain)
join ecommerce.stores store on store.subdomain = store_admin.subdomain
on conflict (store_id, user_id) do nothing;

insert into ecommerce.store_user_roles (store_user_id, role_id)
select store_user.id, role.id
from (values
  ('90e1f83c-7b56-4a35-a52e-662456c5c766', 'default'),
  ('511a1d0b-0612-45bf-ac81-4e41e57a2f12', :'store_subdomain')
) as store_admin(user_id, subdomain)
join ecommerce.stores store on store.subdomain = store_admin.subdomain
join ecommerce.store_users store_user
  on store_user.store_id = store.id and store_user.user_id = store_admin.user_id::uuid
join ecommerce.roles role
  on role.store_id = store.id and role.role_name = 'owner'
on conflict (store_user_id, role_id) do nothing;

commit;
