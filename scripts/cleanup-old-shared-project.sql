-- ============================================================================
-- CLEANUP — remove the ecommerce footprint from the OLD SHARED project.
-- ============================================================================
-- Run this ONLY against the OLD shared project (ref feqsjdhcsrksvrfsjsfv,
-- "Databases4OsorIA"), and ONLY AFTER the new free project is live and validated.
-- It drops the `ecommerce` schema and the 3 ecommerce storage buckets.
--
-- PRESERVES (never touched): the `public` schema (pest-control app, 33 tables),
-- the `copaosoria` schema, and the SHARED `auth.users` pool. This script only
-- ever names `ecommerce` and the 3 ecommerce buckets.
--
-- Fail-closed: does nothing unless you pass -v confirm=YES.
--   Dry run  (default): psql "$OLD_DB_URL" -f scripts/cleanup-old-shared-project.sql
--   Execute:            psql "$OLD_DB_URL" -v confirm=YES -f scripts/cleanup-old-shared-project.sql
-- Take a safety dump first:
--   supabase db dump --db-url "$OLD_DB_URL" --schema ecommerce -f ecommerce-final-backup.sql
-- ============================================================================
\set ON_ERROR_STOP on

-- Pre-check: report what exists before doing anything (both dry run and execute).
\echo '== ecommerce footprint on this database =='
select 'ecommerce schema present' as check,
       coalesce((select true from information_schema.schemata where schema_name = 'ecommerce'), false) as value;
select 'ecommerce tables' as check, count(*)::text as value
  from information_schema.tables where table_schema = 'ecommerce';
select 'ecommerce buckets' as check, coalesce(string_agg(id, ', '), '(none)') as value
  from storage.buckets where id in ('products','component-images','marketing-assets');

-- Safety guard: refuse to run on a database that does NOT look like the shared one
-- (the shared project also hosts `public` pest-control tables + `copaosoria`).
-- This makes it hard to accidentally point it at the NEW ecommerce-only project.
do $$
begin
  if to_regclass('ecommerce.stores') is null then
    raise exception 'No ecommerce.stores here — wrong database? Aborting to be safe.';
  end if;
  if not exists (select 1 from information_schema.schemata where schema_name = 'copaosoria') then
    raise exception 'copaosoria schema NOT found — this does not look like the shared project. Aborting.';
  end if;
end $$;

\if :{?confirm}
\else
\echo ''
\echo '>> DRY RUN. Nothing dropped. Re-run with  -v confirm=YES  to execute.'
\quit 0
\endif

begin;
  -- ecommerce storage objects + buckets (ecommerce-only per the migration plan).
  delete from storage.objects where bucket_id in ('products','component-images','marketing-assets');
  delete from storage.buckets  where id        in ('products','component-images','marketing-assets');

  -- the whole ecommerce schema (tables, views, functions, policies, triggers).
  drop schema if exists ecommerce cascade;
commit;

\echo ''
\echo '== after cleanup =='
select 'ecommerce schema present' as check,
       coalesce((select true from information_schema.schemata where schema_name = 'ecommerce'), false) as value;
select 'public schema intact'     as check,
       coalesce((select true from information_schema.schemata where schema_name = 'public'), false) as value;
select 'copaosoria schema intact' as check,
       coalesce((select true from information_schema.schemata where schema_name = 'copaosoria'), false) as value;
\echo '>> Done. public + copaosoria + auth.users preserved.'
