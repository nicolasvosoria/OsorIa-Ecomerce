-- Fail-closed contract verification for the durable email platform (slice 2 of
-- plan-correos-ecommerce). Mirrors verify-ecommerce-contract.sql's style
-- (schema assertions, `raise exception` on failure) but adds runtime
-- assertions the catalog-contract file never needed: token/rate-limit/outbox
-- behavior that can only be proven by actually calling the functions.
--
-- Every mutating assertion below runs inside one transaction that is rolled
-- back at the end, so this script is safe to re-run against a live local
-- stack without leaving fixture rows behind.

-- -----------------------------------------------------------------------------
-- Schema shape.
-- -----------------------------------------------------------------------------
do $$
declare
  v_missing text[];
begin
  select array_agg(required_table order by required_table) into v_missing
  from (values ('email_outbox'), ('email_send_attempts'), ('store_mailbox_verifications')) req(required_table)
  where to_regclass(format('ecommerce.%I', req.required_table)) is null;

  if v_missing is not null then
    raise exception 'Missing email platform tables: %', array_to_string(v_missing, ', ');
  end if;
end $$;

do $$
declare
  v_missing text[];
begin
  select array_agg(format('%s.%s', required_table, required_column) order by 1) into v_missing
  from (values
    ('stores', 'legal_name'),
    ('store_contact', 'reply_to_email'), ('store_contact', 'reply_to_pending_email'), ('store_contact', 'reply_to_verified_at'),
    ('store_contact', 'order_mailbox_email'), ('store_contact', 'order_mailbox_pending_email'), ('store_contact', 'order_mailbox_verified_at'),
    ('email_outbox', 'idempotency_key'), ('email_outbox', 'attempt_count'), ('email_outbox', 'provider_message_id'), ('email_outbox', 'last_error')
  ) req(required_table, required_column)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'ecommerce' and c.table_name = req.required_table and c.column_name = req.required_column
  );

  if v_missing is not null then
    raise exception 'Missing email platform columns: %', array_to_string(v_missing, ', ');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- D14/D30: RLS enabled, and NO grant reaches anon/authenticated on any of the
-- three new tables -- not even indirectly through the baseline's blanket
-- `grant ... on all tables in schema ecommerce`, which only ever covered
-- tables that existed when it ran (20260425000100), not these.
-- -----------------------------------------------------------------------------
do $$
declare
  v_missing text[];
begin
  select array_agg(required_table order by required_table) into v_missing
  from (values ('email_outbox'), ('email_send_attempts'), ('store_mailbox_verifications')) req(required_table)
  where not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'ecommerce' and c.relname = req.required_table and c.relrowsecurity is true
  );

  if v_missing is not null then
    raise exception 'Email platform tables missing enabled RLS: %', array_to_string(v_missing, ', ');
  end if;
end $$;

do $$
declare
  v_violations text[];
begin
  select array_agg(msg) into v_violations
  from (
    select format('anon has %s on ecommerce.%s', priv, tbl) as msg
    from unnest(array['email_outbox', 'email_send_attempts', 'store_mailbox_verifications']) tbl
    cross join unnest(array['select', 'insert', 'update', 'delete']) priv
    where has_table_privilege('anon', format('ecommerce.%I', tbl), priv)
    union all
    select format('authenticated has %s on ecommerce.%s', priv, tbl)
    from unnest(array['email_outbox', 'email_send_attempts', 'store_mailbox_verifications']) tbl
    cross join unnest(array['select', 'insert', 'update', 'delete']) priv
    where has_table_privilege('authenticated', format('ecommerce.%I', tbl), priv)
  ) v;

  if v_violations is not null then
    raise exception 'anon/authenticated must have ZERO privileges on the email platform tables: %', array_to_string(v_violations, '; ');
  end if;

  if not (
    has_table_privilege('service_role', 'ecommerce.email_outbox', 'select')
    and has_table_privilege('service_role', 'ecommerce.email_outbox', 'insert')
    and has_table_privilege('service_role', 'ecommerce.store_mailbox_verifications', 'select')
    and has_table_privilege('service_role', 'ecommerce.email_send_attempts', 'select')
  ) then
    raise exception 'service_role must retain full access to the email platform tables';
  end if;
end $$;

-- D30 + D6: the verified/pending mailbox columns on store_contact are NOT
-- reachable by a direct authenticated UPDATE/INSERT -- only the pre-existing
-- plain contact fields are. Without this, a store admin could self-verify
-- their own Reply-To with a PATCH, skipping the token flow entirely.
do $$
declare
  v_violations text[];
begin
  select array_agg(msg) into v_violations
  from (
    select format('authenticated can UPDATE ecommerce.store_contact.%s', col) as msg
    from unnest(array[
      'reply_to_email', 'reply_to_verified_at', 'order_mailbox_email', 'order_mailbox_verified_at'
    ]) col
    where has_column_privilege('authenticated', 'ecommerce.store_contact', col, 'update')
    union all
    select format('authenticated cannot UPDATE ecommerce.store_contact.%s', col)
    from unnest(array['contact_email', 'contact_phone', 'address']) col
    where not has_column_privilege('authenticated', 'ecommerce.store_contact', col, 'update')
  ) v;

  if v_violations is not null then
    raise exception 'store_contact column grant contract broken: %', array_to_string(v_violations, '; ');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Runtime behavior: token integrity, one-hour expiry, single-use consumption,
-- the D25 rate limits, outbox claim/lease under concurrency, idempotency, and
-- the D16 retry schedule. Everything below is rolled back at the end.
-- -----------------------------------------------------------------------------
begin;

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_store_id uuid;
  v_token_hash text := encode(digest('verify-contract-token-1', 'sha256'), 'hex');
  v_second_hash text := encode(digest('verify-contract-token-2', 'sha256'), 'hex');
  v_result jsonb;
  v_expires_at timestamptz;
  v_created_at timestamptz;
  v_reply_to_email text;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  values (v_user_id, 'contract-check-owner@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');
  insert into ecommerce.user_profiles (id, email, role) values (v_user_id, 'contract-check-owner@example.com', 'user');
  v_store_id := ecommerce.provision_store('contract-check-store', 'Contract Check Store', v_user_id, 'COP');

  -- Not authorized: a stranger cannot request verification for this store.
  v_result := ecommerce.request_store_mailbox_verification(
    gen_random_uuid(), v_store_id, 'reply_to', 'pedidos@example.com', v_token_hash,
    'Osoria <auth@mail.osoria.help>', 'subj', '<p>h</p>', 't', 'idem-unauthorized'
  );
  if (v_result ->> 'ok')::boolean is not false or v_result ->> 'reason' <> 'not_authorized' then
    raise exception 'Expected not_authorized for a caller who does not manage the store, got %', v_result;
  end if;

  -- Happy path: request, then confirm.
  v_result := ecommerce.request_store_mailbox_verification(
    v_user_id, v_store_id, 'reply_to', 'pedidos@example.com', v_token_hash,
    'Osoria <auth@mail.osoria.help>', 'Confirma un correo', '<p>h</p>', 't', 'idem-1'
  );
  if (v_result ->> 'ok')::boolean is not true then
    raise exception 'Expected the authorized owner''s request to succeed, got %', v_result;
  end if;

  select expires_at, created_at into v_expires_at, v_created_at
  from ecommerce.store_mailbox_verifications where token_hash = v_token_hash;

  if v_expires_at is null or abs(extract(epoch from (v_expires_at - v_created_at)) - 3600) > 5 then
    raise exception 'D6: verification token must expire exactly one hour after creation, got a % second window', extract(epoch from (v_expires_at - v_created_at));
  end if;

  -- D25 rate limit, part 1: a second request for the same store x purpose x
  -- recipient inside 60 seconds is rejected (cooldown), even with a fresh token.
  v_result := ecommerce.request_store_mailbox_verification(
    v_user_id, v_store_id, 'reply_to', 'pedidos@example.com', v_second_hash,
    'Osoria <auth@mail.osoria.help>', 'subj', '<p>h</p>', 't', 'idem-2'
  );
  if v_result ->> 'reason' <> 'rate_limited' then
    raise exception 'D25: a second request inside 60 seconds must be rate_limited, got %', v_result;
  end if;

  -- D25 rate limit, part 2: back-date the cooldown but leave 5 attempts already
  -- logged in the last hour -- the 6th must still be rejected on the hourly cap.
  update ecommerce.email_send_attempts set created_at = now() - interval '2 minutes'
  where store_id = v_store_id and purpose = 'mailbox_verification:reply_to';
  insert into ecommerce.email_send_attempts (store_id, purpose, recipient_email, created_at)
  select v_store_id, 'mailbox_verification:reply_to', 'pedidos@example.com', now() - interval '2 minutes'
  from generate_series(1, 4);

  if ecommerce.check_and_record_send_attempt(v_store_id, 'mailbox_verification:reply_to', 'pedidos@example.com') is not false then
    raise exception 'D25: a 6th send inside one hour must be rejected by the hourly cap';
  end if;

  -- Single-use consumption: confirming the SAME token twice must fail the
  -- second time, and the response must not distinguish why (no enumeration).
  v_result := ecommerce.confirm_store_mailbox_verification(v_token_hash);
  if (v_result ->> 'ok')::boolean is not true or v_result ->> 'field' <> 'reply_to' then
    raise exception 'Expected the fresh token to confirm successfully, got %', v_result;
  end if;

  select reply_to_email into v_reply_to_email from ecommerce.store_contact where store_id = v_store_id;
  if v_reply_to_email <> 'pedidos@example.com' then
    raise exception 'D6: confirmation must atomically swap pending -> verified on store_contact';
  end if;

  v_result := ecommerce.confirm_store_mailbox_verification(v_token_hash);
  if (v_result ->> 'ok')::boolean is not false then
    raise exception 'D6: a consumed token must never confirm a second time, got %', v_result;
  end if;

  -- Unknown token gets the exact same generic response (no enumeration).
  if ecommerce.confirm_store_mailbox_verification('not-a-real-hash') <> jsonb_build_object('ok', false, 'reason', 'invalid_or_expired') then
    raise exception 'D24-style posture: an unknown token must return the same generic invalid_or_expired response';
  end if;
end $$;

-- Outbox: idempotency, claim/lease concurrency, and the D16 retry schedule.
do $$
declare
  v_store_id uuid;
  v_row_a uuid;
  v_row_b uuid;
  v_row_c uuid;
  v_claimed_by_a integer;
  v_claimed_by_b integer;
  v_attempt_count integer;
  v_status text;
  v_next_attempt_at timestamptz;
begin
  select id into v_store_id from ecommerce.stores where subdomain = 'contract-check-store';

  insert into ecommerce.email_outbox (store_id, template_kind, recipient_email, idempotency_key, from_address, subject, html_body, text_body)
  values (v_store_id, 'store-mailbox-verification', 'a@example.com', 'idem-outbox-a', 'Osoria <auth@mail.osoria.help>', 's', 'h', 't')
  returning id into v_row_a;

  insert into ecommerce.email_outbox (store_id, template_kind, recipient_email, idempotency_key, from_address, subject, html_body, text_body)
  values (v_store_id, 'store-mailbox-verification', 'b@example.com', 'idem-outbox-b', 'Osoria <auth@mail.osoria.help>', 's', 'h', 't')
  returning id into v_row_b;

  -- Idempotency: a second row reusing the same key must be rejected outright.
  begin
    insert into ecommerce.email_outbox (store_id, template_kind, recipient_email, idempotency_key, from_address, subject, html_body, text_body)
    values (v_store_id, 'store-mailbox-verification', 'a@example.com', 'idem-outbox-a', 'Osoria <auth@mail.osoria.help>', 's', 'h', 't');
    raise exception 'D1: idempotency_key must be unique -- a duplicate insert must fail';
  exception when unique_violation then
    null;
  end;

  -- Claim/lease: worker-a claims both rows; worker-b claiming immediately after
  -- must get NONE of them back (still `processing`, lease not expired) -- the
  -- exact guarantee that stops two concurrent workers from double-sending.
  select count(*) into v_claimed_by_a from ecommerce.claim_email_outbox_batch('worker-a', 10) where id in (v_row_a, v_row_b);
  if v_claimed_by_a <> 2 then
    raise exception 'worker-a should have claimed both freshly-enqueued rows, claimed %', v_claimed_by_a;
  end if;

  select count(*) into v_claimed_by_b from ecommerce.claim_email_outbox_batch('worker-b', 10) where id in (v_row_a, v_row_b);
  if v_claimed_by_b <> 0 then
    raise exception 'D16: a second worker must never double-claim a row still under an active lease, claimed %', v_claimed_by_b;
  end if;

  -- An abandoned lease (worker crashed) becomes reclaimable once it expires.
  update ecommerce.email_outbox set lease_expires_at = now() - interval '1 second' where id = v_row_a;
  select count(*) into v_claimed_by_b from ecommerce.claim_email_outbox_batch('worker-b', 10) where id = v_row_a;
  if v_claimed_by_b <> 1 then
    raise exception 'D16: a row whose lease already expired must be reclaimable by another worker';
  end if;

  -- Retry schedule (D16): a FRESH row, isolated from the claim/lease
  -- assertions above (which already claimed v_row_a twice). Failures 1-3
  -- reschedule at immediate / +1 minute / +5 minutes; the 4th attempt's
  -- failure (the third RETRY) is terminal.
  insert into ecommerce.email_outbox (store_id, template_kind, recipient_email, idempotency_key, from_address, subject, html_body, text_body)
  values (v_store_id, 'store-mailbox-verification', 'c@example.com', 'idem-outbox-c', 'Osoria <auth@mail.osoria.help>', 's', 'h', 't')
  returning id into v_row_c;

  perform ecommerce.claim_email_outbox_batch('worker-a', 10);
  perform ecommerce.mark_email_outbox_failed(v_row_c, 'boom-1', null);
  select attempt_count, status, next_attempt_at into v_attempt_count, v_status, v_next_attempt_at from ecommerce.email_outbox where id = v_row_c;
  if v_attempt_count <> 1 or v_status <> 'pending' or v_next_attempt_at > now() + interval '2 seconds' then
    raise exception 'Failure 1 of 4 must reschedule immediately and stay pending, got attempt_count=%, status=%, delay=%s',
      v_attempt_count, v_status, extract(epoch from (v_next_attempt_at - now()));
  end if;

  update ecommerce.email_outbox set next_attempt_at = now() where id = v_row_c;
  perform ecommerce.claim_email_outbox_batch('worker-a', 10);
  perform ecommerce.mark_email_outbox_failed(v_row_c, 'boom-2', null);
  select attempt_count, next_attempt_at into v_attempt_count, v_next_attempt_at from ecommerce.email_outbox where id = v_row_c;
  if v_attempt_count <> 2 or abs(extract(epoch from (v_next_attempt_at - now())) - 60) > 5 then
    raise exception 'Failure 2 of 4 must reschedule ~1 minute out, got attempt_count=%, delay=%s', v_attempt_count, extract(epoch from (v_next_attempt_at - now()));
  end if;

  update ecommerce.email_outbox set next_attempt_at = now() where id = v_row_c;
  perform ecommerce.claim_email_outbox_batch('worker-a', 10);
  perform ecommerce.mark_email_outbox_failed(v_row_c, 'boom-3', 'daily_quota_exceeded');
  select attempt_count, next_attempt_at into v_attempt_count, v_next_attempt_at from ecommerce.email_outbox where id = v_row_c;
  if v_attempt_count <> 3 or abs(extract(epoch from (v_next_attempt_at - now())) - 300) > 5 then
    raise exception 'Failure 3 of 4 must reschedule ~5 minutes out, got attempt_count=%, delay=%s', v_attempt_count, extract(epoch from (v_next_attempt_at - now()));
  end if;

  update ecommerce.email_outbox set next_attempt_at = now() where id = v_row_c;
  perform ecommerce.claim_email_outbox_batch('worker-a', 10);
  perform ecommerce.mark_email_outbox_failed(v_row_c, 'boom-4-final', 'daily_quota_exceeded');
  select attempt_count, status into v_attempt_count, v_status from ecommerce.email_outbox where id = v_row_c;
  if v_attempt_count <> 4 or v_status <> 'failed' then
    raise exception 'D16: the 4th attempt''s failure (the third retry) must be terminal, got attempt_count=%, status=%', v_attempt_count, v_status;
  end if;

  -- D36: the quota failure that just terminaled the row must be visible in
  -- the health view, distinctly from any other failure reason.
  if not exists (
    select 1 from ecommerce.email_outbox_health where status = 'failed' and quota_failures >= 1
  ) then
    raise exception 'D18/D36: a quota-coded terminal failure must be counted by email_outbox_health.quota_failures';
  end if;

  -- D17: a row older than 30 days is pruned; a fresh row survives the same call.
  update ecommerce.email_outbox set created_at = now() - interval '31 days' where id = v_row_c;
  if ecommerce.prune_email_outbox() < 1 then
    raise exception 'D17: prune_email_outbox must delete rows older than 30 days';
  end if;
  if exists (select 1 from ecommerce.email_outbox where id = v_row_c) then
    raise exception 'D17: the 31-day-old row must have been pruned';
  end if;
  if not exists (select 1 from ecommerce.email_outbox where id = v_row_b) then
    raise exception 'D17: a row inside the 30-day window must survive pruning';
  end if;
end $$;

rollback;

select 'email platform contract ok' as status;
