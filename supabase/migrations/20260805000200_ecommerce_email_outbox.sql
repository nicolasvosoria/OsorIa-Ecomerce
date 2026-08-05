-- Durable email outbox (O2, D1, D13-D16, D18, D30, D36).
--
-- One row per queued send. `payload` isn't a live reference to a store or
-- order -- subject/html/text are the fully rendered output of
-- lib/email/render.tsx at enqueue time (D13): a later branding or order edit
-- can never change what an already-queued recipient receives.
--
-- D14: service-role only. No policy grants anon or authenticated anything, and
-- the explicit `using (false)` policy below is the same defensive-RLS pattern
-- as store_mailbox_verifications -- belt and suspenders over the fact that
-- zero policies already means deny-by-default for RLS-restricted roles.
--
-- Retry cadence (D16): "retries immediately, then +1 minute, then +5 minutes.
-- The third failure makes the row terminal failed." Read together with this
-- repo's own convention for counting retries separately from the attempt they
-- follow (lib/supabase/permissions-api.ts: `2 reintentos (3 intentos en
-- total)`), and with "retries" grammatically requiring a prior failure to
-- retry FROM, this is 3 retries after the original send -- scheduled
-- immediately, +1 minute and +5 minutes after failures 1, 2 and 3
-- respectively -- so 4 attempts total, and the third RETRY's failure (the 4th
-- attempt) is what's terminal. Implemented in mark_email_outbox_failed below;
-- MAX_ATTEMPTS documents the exact number in one place.
--
-- Scope: ecommerce schema only.

create table ecommerce.email_outbox (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references ecommerce.stores(id) on delete cascade,
  template_kind text not null,
  recipient_email text not null,
  idempotency_key text not null,
  from_address text not null,
  reply_to_address text,
  subject text not null,
  html_body text not null,
  text_body text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer not null default 0,
  provider_message_id text,
  last_error text,
  last_error_code text,
  locked_by text,
  locked_at timestamptz,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column ecommerce.email_outbox.idempotency_key is
  'Sent as the Resend Idempotency-Key header (D1) so a retried HTTP call after a network failure can never double-send.';
comment on column ecommerce.email_outbox.from_address is
  'D3''s From header (lib/email/sender.ts), resolved once at enqueue time. Part of the D13 snapshot: a later Reply-To re-verification must not change an already-queued send''s headers.';
comment on column ecommerce.email_outbox.last_error_code is
  'Raw Resend error `name` (e.g. daily_quota_exceeded, monthly_quota_exceeded) so quota failures stay visible and distinct from any other delivery failure (D18).';

create unique index email_outbox_idempotency_key_key on ecommerce.email_outbox (idempotency_key);
create index email_outbox_claimable_idx on ecommerce.email_outbox (next_attempt_at) where status = 'pending';
create index email_outbox_store_id_idx on ecommerce.email_outbox (store_id);

alter table ecommerce.email_outbox enable row level security;
revoke all on ecommerce.email_outbox from public, anon, authenticated;
grant all on ecommerce.email_outbox to service_role;
create policy email_outbox_service_role_only on ecommerce.email_outbox
  for all to authenticated, anon
  using (false) with check (false);

-- -----------------------------------------------------------------------------
-- Claims a batch with `for update skip locked`: two workers ticking the same
-- minute never lock the same row, so neither waits on the other and neither
-- can double-claim it. A row already `processing` is reclaimable once its
-- lease has expired (the worker that held it died or timed out) -- that's the
-- "safe lease" half of D16, not just the locking half.
-- -----------------------------------------------------------------------------
create or replace function ecommerce.claim_email_outbox_batch(
  p_worker_id text,
  p_batch_size integer default 20
)
returns setof ecommerce.email_outbox
language sql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
  update ecommerce.email_outbox o
  set status = 'processing',
      attempt_count = o.attempt_count + 1,
      locked_by = p_worker_id,
      locked_at = now(),
      lease_expires_at = now() + interval '2 minutes',
      updated_at = now()
  from (
    select id
    from ecommerce.email_outbox
    where next_attempt_at <= now()
      and (status = 'pending' or (status = 'processing' and lease_expires_at < now()))
    order by next_attempt_at
    limit p_batch_size
    for update skip locked
  ) claimable
  where o.id = claimable.id
  returning o.*;
$$;

revoke all on function ecommerce.claim_email_outbox_batch(text, integer) from public;
grant execute on function ecommerce.claim_email_outbox_batch(text, integer) to service_role;

create or replace function ecommerce.mark_email_outbox_sent(p_id uuid, p_provider_message_id text)
returns void
language sql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
  update ecommerce.email_outbox
  set status = 'sent',
      provider_message_id = p_provider_message_id,
      sent_at = now(),
      locked_by = null,
      locked_at = null,
      lease_expires_at = null,
      updated_at = now()
  where id = p_id;
$$;

revoke all on function ecommerce.mark_email_outbox_sent(uuid, text) from public;
grant execute on function ecommerce.mark_email_outbox_sent(uuid, text) to service_role;

create or replace function ecommerce.mark_email_outbox_failed(
  p_id uuid,
  p_error_message text,
  p_error_code text default null
)
returns void
language plpgsql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
declare
  c_max_attempts constant integer := 4; -- see the retry-cadence note at the top of this file
  v_attempt_count integer;
  v_status text;
  v_next_attempt_at timestamptz;
begin
  select attempt_count into v_attempt_count from ecommerce.email_outbox where id = p_id;

  if v_attempt_count >= c_max_attempts then
    v_status := 'failed';
    v_next_attempt_at := null;
  else
    v_status := 'pending';
    v_next_attempt_at := now() + case v_attempt_count
      when 1 then interval '0 seconds'
      when 2 then interval '1 minute'
      else interval '5 minutes' -- v_attempt_count = 3
    end;
  end if;

  update ecommerce.email_outbox
  set status = v_status,
      next_attempt_at = coalesce(v_next_attempt_at, next_attempt_at),
      last_error = p_error_message,
      last_error_code = p_error_code,
      locked_by = null,
      locked_at = null,
      lease_expires_at = null,
      updated_at = now()
  where id = p_id;
end;
$$;

revoke all on function ecommerce.mark_email_outbox_failed(uuid, text, text) from public;
grant execute on function ecommerce.mark_email_outbox_failed(uuid, text, text) to service_role;

-- D17: PII-bearing snapshots (recipient_email, subject, html_body, text_body)
-- are retained 30 days and then pruned -- a hard DELETE, not an anonymize-in-
-- place, since nothing reads a row once it's outside the 30-day window (no
-- delivery UI in v1, D17). The scheduling half lives in 20260805000400
-- (a daily, currently-inactive cron job) beside the worker's own schedule.
create or replace function ecommerce.prune_email_outbox(p_older_than interval default interval '30 days')
returns integer
language plpgsql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
declare
  v_deleted_count integer;
begin
  delete from ecommerce.email_outbox where created_at < now() - p_older_than;
  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

revoke all on function ecommerce.prune_email_outbox(interval) from public;
grant execute on function ecommerce.prune_email_outbox(interval) to service_role;

-- -----------------------------------------------------------------------------
-- D36: v1 observability is this protected view plus structured Edge logs plus
-- the runbook (docs/supabase/email-outbox-runbook.md) -- no dashboard, no
-- external alerting. "Protected" means service-role only, same as the table
-- it summarizes: nothing in the product reads it, it exists for an operator
-- running it by hand with service credentials per the runbook.
-- -----------------------------------------------------------------------------
create view ecommerce.email_outbox_health as
select
  status,
  count(*) as row_count,
  count(*) filter (where last_error_code in ('monthly_quota_exceeded', 'daily_quota_exceeded')) as quota_failures,
  min(created_at) as oldest_created_at,
  max(updated_at) as newest_updated_at
from ecommerce.email_outbox
group by status;

revoke all on ecommerce.email_outbox_health from public, anon, authenticated;
grant select on ecommerce.email_outbox_health to service_role;
