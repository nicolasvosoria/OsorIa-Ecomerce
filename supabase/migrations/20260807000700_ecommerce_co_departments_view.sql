-- ecommerce.co_departments: a real departments source, instead of every
-- reader having to pull all 1,122 ecommerce.co_locations rows across the
-- wire to derive the 33 distinct departments in memory.
--
-- That in-memory dedupe is what silently broke the checkout picker:
-- PostgREST's own max_rows = 1000 (supabase/config.toml) truncates a
-- 1,122-row response before the app ever sees the tail, so four
-- departments (TOLIMA, VALLE DEL CAUCA, VAUPÉS, VICHADA) never reached the
-- department select and the municipality select stayed disabled behind
-- them -- a buyer in Cali or Ibagué could not check out at all. Thirty-
-- three rows can never collide with a 1,000-row cap; this view is the fix,
-- not a raised limit (a limit raised is a limit that gets hit again once
-- the catalog grows).
--
-- D27: same public-read / service-role posture as ecommerce.co_locations
-- itself -- department names are the same public DANE data, just projected
-- distinct. security_invoker matches every other view in this schema
-- (RLS already grants anon/authenticated SELECT on the underlying table,
-- so this changes nothing about who can read it).
--
-- Scope: ecommerce schema only.

begin;

create or replace view ecommerce.co_departments
with (security_invoker = true)
as
select distinct department_code, department_name
from ecommerce.co_locations;

revoke all on ecommerce.co_departments from public;
grant select on ecommerce.co_departments to anon, authenticated, service_role;

commit;
