-- Closes the durable-outbox guarantee the previous fix left open: "an email
-- Resend accepted must never end up `failed`." Additive-only against
-- 20260805000200_ecommerce_email_outbox.sql (applied to staging, frozen) --
-- every object here is `create or replace`/`create`/`drop`-then-`create`
-- plus two new columns. This file is itself still an uncommitted draft of
-- THIS change (never applied anywhere), so it is edited in place rather
-- than layered under a third migration -- see the race section below for
-- why two of the three mark_email_outbox_* functions needed an explicit
-- DROP first instead of a same-signature CREATE OR REPLACE.
--
-- PART 1 -- the counter-example (transient replay noise, single caller).
--
-- Reproduced against real Postgres: claim a row once (the exact state a
-- mark_email_outbox_sent failure leaves -- Resend delivered it, but the
-- MARK never landed), let its lease expire, and let three REPLAY sends of
-- the same Idempotency-Key error transiently (a Resend 5xx / rate limit /
-- network blip, never a rejection of the payload itself). Before this
-- migration, `mark_email_outbox_failed` was the only thing
-- `runEmailOutboxWorkerBatch` (lib/email/outbox-worker.ts) ever called on
-- `!result.ok`, and it read `attempt_count` -- a column
-- `claim_email_outbox_batch` bumps on EVERY claim, including that ambiguous
-- reclaim. Four such claims (however many were actually transient noise)
-- read as four attempts and terminaled the row `failed`, for a message
-- Resend had already delivered on attempt 1.
--
-- Confirmed against Resend's own docs
-- (resend.com/docs/dashboard/emails/idempotency-keys, "How it works"):
-- replaying an Idempotency-Key whose original call already succeeded
-- returns that SAME cached response verbatim -- Resend never re-evaluates
-- the payload, so it can never come back as a fresh rejection -- WHILE that
-- key is still retained. The docs bound that retention to 24 hours; past it
-- Resend no longer has a cached response to replay at all, so a "replay" at
-- that point is evaluated as a genuinely fresh send (see PART 3).
--
-- The fix: a genuinely-rejected send's four-attempt ladder (D16/A10 --
-- immediate, then +1 minute, then +5 minutes, terminal on the third retry)
-- now runs on its OWN counter, `rejection_count`, incremented only by
-- mark_email_outbox_failed itself -- never by a claim, so an ambiguous
-- reclaim or a run of transient replay errors can never erode it.
-- `attempt_count` is untouched (still bumped by claim_email_outbox_batch on
-- every claim, unmodified) and keeps its existing runbook role: total
-- claims of this row, for any reason, used to tell "worker not running"
-- apart from "worker running but something is stuck" -- see the runbook.
-- A `retryable` send failure never calls mark_email_outbox_failed at all;
-- it calls the new mark_email_outbox_transient_failure instead, which
-- records last_error/last_error_code (D36 visibility) but leaves status,
-- rejection_count and the lease untouched -- the row stays `processing`
-- and its lease expiring is what makes claim_email_outbox_batch reclaim it,
-- reusing the EXACT lease-based retry the previous fix already built for a
-- mark_email_outbox_sent failure (same file, same reasoning: no second
-- retry loop to build).
--
-- PART 2 -- the race (concurrent/stale callers, closed in this revision).
--
-- A second verifier pass reproduced, twice against real Postgres (once
-- forcing timestamps in one session, once across four genuinely separate
-- psql connections to rule out a single-transaction artifact), that PART 1's
-- fix alone was not enough: none of mark_email_outbox_sent,
-- mark_email_outbox_failed or mark_email_outbox_transient_failure guarded
-- their UPDATE against the caller still owning the CURRENT claim. In
-- production each RPC call is its own immediately-committed transaction
-- (PostgREST invokes claim/send/mark separately -- no DB transaction spans
-- claim->send->mark), and lib/email/outbox-worker.ts sends over plain HTTP
-- with no timeout tied to the 2-minute lease. So: worker A claims (its own
-- send outlives its lease -- Resend degradation alone can cause this) ->
-- worker B reclaims and marks the row `sent` with a real
-- provider_message_id -> A's stale response FINALLY resolves and calls
-- mark_email_outbox_failed -- with nothing stopping it, that flips an
-- already-delivered row back toward `failed`. The same missing guard lets a
-- stale mark_email_outbox_transient_failure stamp a false last_error_code
-- onto an already-`sent` row, quietly poisoning the D36 signal for it.
--
-- The fix: a monotonic fencing token, `claim_generation`, minted by
-- claim_email_outbox_batch on every claim and required back on every
-- mark_email_outbox_* call. Chosen over the other named option
-- (`WHERE ... AND locked_by = p_worker_id`) because WORKER_ID
-- (supabase/functions/email-worker/index.ts) is generated once per Deno
-- ISOLATE, not per invocation -- edge-runtime isolates stay warm across many
-- cron ticks, so the SAME worker can legitimately reclaim its own abandoned
-- row on a later tick. `locked_by = p_worker_id` would then let that
-- worker's OWN earlier stale response pass the guard (an ABA problem: same
-- identity, different claim). A strictly-increasing generation has no such
-- collision: every claim, whether fresh, a scheduled retry, or an ambiguous
-- lease-expiry reclaim, mints a NEW token, so a write tagged with an OLDER
-- one is unconditionally stale, regardless of which worker identity sent it.
--
-- A rejected stale write is not an error to retry (the work it describes is
-- void -- whoever holds the CURRENT generation already resolved the row, or
-- will), but per D36 it must not vanish either: it is exactly the kind of
-- thing an operator needs to see, and it is the signal that a lease is too
-- short for real Resend latency. All three mark_email_outbox_* functions
-- now return boolean (true = applied, false = stale no-op instead of an
-- error, since "the write didn't happen" is an expected outcome here, not
-- a failure of the RPC itself); lib/email/outbox-worker.ts turns a false
-- into a dedicated `staleWrites` summary counter and
-- supabase/functions/email-worker/index.ts logs it distinctly. See the
-- runbook for how an operator reads it.
--
-- mark_email_outbox_sent(uuid, text) and mark_email_outbox_failed(uuid,
-- text, text) are explicitly DROPped before being recreated with the new
-- claim_generation parameter: CREATE OR REPLACE cannot change a function's
-- argument list (a different arg count/type list creates a SECOND,
-- overloaded function instead of replacing the first), which would have
-- left the OLD, unguarded signature live and still fully granted to
-- service_role -- a silent bypass of this entire fix. Verified via
-- to_regprocedure below that neither old signature survives.
-- mark_email_outbox_transient_failure never had a frozen-migration
-- signature to begin with (introduced in this same draft file), so its
-- CREATE OR REPLACE block below is edited in place instead.
--
-- PART 3 -- scoping the claim honestly to Resend's 24-hour window.
--
-- The whole "a replay's non-2xx carries no evidence" reasoning above (and
-- in lib/email/resend-client.ts) is bounded by Resend's own 24-hour
-- idempotency-key retention -- past it, a "replay" is no longer guaranteed
-- to return the cached original response; Resend may process it as a
-- genuinely fresh send, and a row that already delivered once could be
-- delivered a SECOND time (D1's original guarantee, not this one). The
-- earlier draft of this migration's comments and the runbook claimed the
-- "never `failed`" guarantee held unconditionally, "no matter how many
-- times" a row is reclaimed -- true of the CODE (mark_email_outbox_failed
-- is still never called for a retryable failure, full stop, for all time),
-- but overstated as a safety story once the underlying replay-safety
-- assumption it rests on lapses. claim_email_outbox_batch below now stops
-- reclaiming (and therefore stops re-sending against Resend) an ambiguous
-- `processing` row once it has been sitting unresolved for 20 hours -- a
-- 4-hour margin under the 24-hour boundary. Such a row is NEVER marked
-- `failed` (that guarantee still holds unconditionally) but is also never
-- resent past the point where doing so is safe; it simply stops being
-- claimed, staying visible via email_outbox_health and the runbook's own
-- "processing con filas viejas" diagnostic for an operator to resolve by
-- hand -- the same v1-observability-only posture (D36) every other stuck-row
-- case in this file already uses, not a new automation.
--
-- Scope: ecommerce schema only.

alter table ecommerce.email_outbox add column if not exists rejection_count integer not null default 0;
alter table ecommerce.email_outbox add column if not exists claim_generation integer not null default 0;

comment on column ecommerce.email_outbox.attempt_count is
  'Total claims of this row for ANY reason (fresh, scheduled retry, or an ambiguous lease-expiry reclaim) -- bumped by claim_email_outbox_batch on every claim, unconditionally. Diagnostic only (see the runbook''s "attempt_count static vs climbing" check): the D16/A10 four-attempt ladder reads rejection_count instead, so this can never gate a delivered email toward failed.';
comment on column ecommerce.email_outbox.rejection_count is
  'D16/A10''s own counter: how many times Resend has DEFINITIVELY rejected this row''s payload (never a transient transport failure -- see mark_email_outbox_transient_failure). Incremented only by mark_email_outbox_failed. Terminal failed at 4, same immediate/+1min/+5min schedule as before -- untouched by any transient replay noise in between.';
comment on column ecommerce.email_outbox.claim_generation is
  'Optimistic-concurrency fencing token: bumped by claim_email_outbox_batch on every claim (fresh, scheduled retry, or lease-expiry reclaim) and required back on every mark_email_outbox_* call, which only applies its write when it still matches the row''s CURRENT value. Rejects a write from a worker whose claim was superseded by a later claim (its Resend response finally resolving after its lease already expired and someone else reclaimed) instead of letting a stale write corrupt a row a newer claim already resolved.';

-- -----------------------------------------------------------------------------
-- D16/A10's ladder, now keyed on rejection_count instead of attempt_count,
-- plus the 20-hour reclaim bound from PART 3 above -- everything else (the
-- schedule, the terminal threshold, the "safe lease" locking half) is
-- identical to the original.
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
      claim_generation = o.claim_generation + 1,
      locked_by = p_worker_id,
      locked_at = now(),
      lease_expires_at = now() + interval '2 minutes',
      updated_at = now()
  from (
    select id
    from ecommerce.email_outbox
    where next_attempt_at <= now()
      and (
        status = 'pending'
        or (
          status = 'processing'
          and lease_expires_at < now()
          -- PART 3: past 20 hours ambiguous, stop reclaiming (and therefore
          -- stop re-sending) this row at all -- see the migration header.
          and created_at > now() - interval '20 hours'
        )
      )
    order by next_attempt_at
    limit p_batch_size
    for update skip locked
  ) claimable
  where o.id = claimable.id
  returning o.*;
$$;

revoke all on function ecommerce.claim_email_outbox_batch(text, integer) from public;
grant execute on function ecommerce.claim_email_outbox_batch(text, integer) to service_role;

-- PART 2: CREATE OR REPLACE cannot add a parameter without creating a
-- second, overloaded function -- explicitly retiring the old 2-arg
-- signature (and its grant) before recreating it, so no unguarded bypass
-- survives. See the migration header.
drop function if exists ecommerce.mark_email_outbox_sent(uuid, text);

create function ecommerce.mark_email_outbox_sent(
  p_id uuid,
  p_provider_message_id text,
  p_claim_generation integer
)
returns boolean
language sql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
  with updated as (
    update ecommerce.email_outbox
    set status = 'sent',
        provider_message_id = p_provider_message_id,
        sent_at = now(),
        locked_by = null,
        locked_at = null,
        lease_expires_at = null,
        updated_at = now()
    where id = p_id and claim_generation = p_claim_generation
    returning 1
  )
  select exists(select 1 from updated);
$$;

revoke all on function ecommerce.mark_email_outbox_sent(uuid, text, integer) from public;
grant execute on function ecommerce.mark_email_outbox_sent(uuid, text, integer) to service_role;

-- PART 2: same reason as mark_email_outbox_sent above -- retiring the old
-- 3-arg signature explicitly before recreating it with the fencing token.
drop function if exists ecommerce.mark_email_outbox_failed(uuid, text, text);

create function ecommerce.mark_email_outbox_failed(
  p_id uuid,
  p_claim_generation integer,
  p_error_message text,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
declare
  c_max_attempts constant integer := 4; -- see the retry-cadence note in 20260805000200_ecommerce_email_outbox.sql
  v_rejection_count integer;
  v_status text;
  v_next_attempt_at timestamptz;
  v_row_count integer;
begin
  select rejection_count + 1 into v_rejection_count from ecommerce.email_outbox where id = p_id;

  if v_rejection_count >= c_max_attempts then
    v_status := 'failed';
    v_next_attempt_at := null;
  else
    v_status := 'pending';
    v_next_attempt_at := now() + case v_rejection_count
      when 1 then interval '0 seconds'
      when 2 then interval '1 minute'
      else interval '5 minutes' -- v_rejection_count = 3
    end;
  end if;

  -- PART 2: the fencing check lives ONLY in this final write's WHERE clause
  -- -- the read above is allowed to be stale (it never writes anything by
  -- itself), so a mismatch here simply discards the computed status/
  -- rejection_count/schedule instead of ever persisting them.
  update ecommerce.email_outbox
  set status = v_status,
      rejection_count = v_rejection_count,
      next_attempt_at = coalesce(v_next_attempt_at, next_attempt_at),
      last_error = p_error_message,
      last_error_code = p_error_code,
      locked_by = null,
      locked_at = null,
      lease_expires_at = null,
      updated_at = now()
  where id = p_id and claim_generation = p_claim_generation;

  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$$;

revoke all on function ecommerce.mark_email_outbox_failed(uuid, integer, text, text) from public;
grant execute on function ecommerce.mark_email_outbox_failed(uuid, integer, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- Records WHY a claimed row's send didn't land (D36 visibility) without
-- asserting anything about its fate: never touches status, rejection_count
-- or the lease. Same service-role-only posture (D14) and pinned search_path
-- (D30) as every other function in this table's migration -- no p_actor_
-- user_id to check because, like mark_email_outbox_sent/mark_email_outbox_
-- failed, this is only ever reachable by the trusted worker under
-- service_role, gated by EXECUTE alone. PART 2: same claim_generation fence
-- as its siblings -- this function never had a frozen prior signature (it
-- is new to this same draft file), so its block is edited in place.
-- -----------------------------------------------------------------------------
create or replace function ecommerce.mark_email_outbox_transient_failure(
  p_id uuid,
  p_claim_generation integer,
  p_error_message text,
  p_error_code text default null
)
returns boolean
language sql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
  with updated as (
    update ecommerce.email_outbox
    set last_error = p_error_message,
        last_error_code = p_error_code,
        updated_at = now()
    where id = p_id and claim_generation = p_claim_generation
    returning 1
  )
  select exists(select 1 from updated);
$$;

revoke all on function ecommerce.mark_email_outbox_transient_failure(uuid, integer, text, text) from public;
grant execute on function ecommerce.mark_email_outbox_transient_failure(uuid, integer, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- D36: a row retrying longer than before (transient replay noise) must be
-- visible, not merely not-failed -- same shape as the existing quota_failures
-- column, appended rather than inserted so this stays a valid CREATE OR
-- REPLACE VIEW (Postgres requires existing output columns, in order, to
-- survive unchanged).
-- -----------------------------------------------------------------------------
create or replace view ecommerce.email_outbox_health as
select
  status,
  count(*) as row_count,
  count(*) filter (where last_error_code in ('monthly_quota_exceeded', 'daily_quota_exceeded')) as quota_failures,
  min(created_at) as oldest_created_at,
  max(updated_at) as newest_updated_at,
  count(*) filter (
    where last_error_code in ('network_error', 'rate_limit_exceeded', 'concurrent_idempotent_requests')
       or last_error_code like 'http_5%'
  ) as transient_failures
from ecommerce.email_outbox
group by status;

revoke all on ecommerce.email_outbox_health from public, anon, authenticated;
grant select on ecommerce.email_outbox_health to service_role;
