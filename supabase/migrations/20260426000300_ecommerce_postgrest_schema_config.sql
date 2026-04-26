-- Keep the Supabase Data API/PostgREST exposed schemas aligned with the
-- local CLI configuration and the ecommerce contract.
--
-- The staging branch inherited a stale exposed-schema value pointing at a
-- misspelled schema (`OsoriaEccomerse`), which made PostgREST fail readiness
-- even though the real `ecommerce` schema existed and migrations passed.
-- Setting these role-level PostgREST config values makes the API contract
-- explicit and portable across branch/prod promotion.

alter role authenticator set pgrst.db_schemas = 'public, graphql_public, ecommerce';
alter role authenticator set pgrst.db_extra_search_path = 'public, extensions, ecommerce';

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
