-- Email worker provisioning (D19): extensions, the Vault-backed secret the
-- cron job uses to authorize itself to the Edge Function, and the schedule
-- itself -- all authored here so slice 7 only has to flip one switch
-- (`cron.alter_job(..., active := true)`) and set the Edge Function's own
-- secrets (RESEND_API_KEY, EMAIL_WORKER_CRON_SECRET) on the staging project.
-- Nothing here is applied anywhere but this local stack until then (see the
-- HARD BOUNDARY in this slice's brief).
--
-- The cron job is created INACTIVE on purpose: `cron.schedule` has no
-- "inactive" argument, so it's scheduled once and then immediately flipped
-- off via `cron.alter_job(..., active := false)` -- `cron.job` rejects a raw
-- UPDATE (it's only writable through cron.schedule/alter_job/unschedule), so
-- this is the only supported way to author a dormant pg_cron job.
--
-- Scope: ecommerce schema only (the two extensions are platform infrastructure
-- and, like pgcrypto before them, install into `extensions` -- never public).

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- `project_url` is the well-known Vault secret name Supabase's own
-- cron-invokes-an-Edge-Function recipe reads (net.http_post's url argument).
-- It doesn't exist by default on any project, hosted or local -- it has to be
-- created once. The dedicated ecommerce project is nwsmwuaixlynqylvgfmr (D38,
-- a public project ref, not a secret), so seeding it with that project's URL
-- means slice 7 never has to touch this value; `where not exists` makes the
-- seed a no-op if it somehow already exists there. The same value is seeded
-- locally too -- harmless, since the job stays inactive below and nothing
-- ever dials out from this stack.
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'project_url') then
    perform vault.create_secret(
      'https://nwsmwuaixlynqylvgfmr.supabase.co',
      'project_url',
      'Base URL the email-outbox-worker cron job posts to.'
    );
  end if;
end $$;

-- Shared bearer secret the Edge Function checks on every invocation (its own
-- `verify_jwt = false` in supabase/config.toml -- see supabase/functions/
-- email-worker/index.ts), so a request that isn't this cron job is rejected.
-- Generated fresh per environment; never a literal committed to git.
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'email_worker_cron_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'email_worker_cron_secret',
      'Bearer token the pg_cron schedule presents to the email-worker Edge Function.'
    );
  end if;
end $$;

select cron.schedule(
  'email-outbox-worker',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/email-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'email_worker_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  ) as request_id;
  $$
)
where not exists (select 1 from cron.job where jobname = 'email-outbox-worker');

select cron.alter_job(job_id := jobid, active := false)
from cron.job
where jobname = 'email-outbox-worker';

-- D17's 30-day retention. Pure SQL (delete), so unlike the worker it needs no
-- Edge Function or Vault secret -- just a daily cron.schedule calling
-- ecommerce.prune_email_outbox() directly. Also authored INACTIVE; slice 7
-- enables it the same way as the worker's schedule.
select cron.schedule(
  'email-outbox-prune',
  '0 3 * * *',
  $$select ecommerce.prune_email_outbox();$$
)
where not exists (select 1 from cron.job where jobname = 'email-outbox-prune');

select cron.alter_job(job_id := jobid, active := false)
from cron.job
where jobname = 'email-outbox-prune';
