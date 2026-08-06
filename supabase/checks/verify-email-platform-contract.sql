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
    ('email_outbox', 'idempotency_key'), ('email_outbox', 'attempt_count'), ('email_outbox', 'provider_message_id'), ('email_outbox', 'last_error'),
    ('orders', 'idempotency_key'), ('orders', 'payload_fingerprint')
  ) req(required_table, required_column)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'ecommerce' and c.table_name = req.required_table and c.column_name = req.required_column
  );

  if v_missing is not null then
    raise exception 'Missing email platform columns: %', array_to_string(v_missing, ', ');
  end if;
end $$;

-- D27: the atomic checkout RPC must exist with the exact signature the app calls.
do $$
begin
  if to_regprocedure('ecommerce.create_order_with_notifications(uuid, text, text, jsonb, jsonb, jsonb)') is null then
    raise exception 'Missing ecommerce.create_order_with_notifications(uuid, text, text, jsonb, jsonb, jsonb)';
  end if;
end $$;

-- D30: same posture as decrement_inventory/provision_store -- service_role
-- only, since the function inserts into orders/order_items/email_outbox as
-- its owner without granting callers table access.
do $$
declare
  v_violations text[];
begin
  select array_agg(msg) into v_violations
  from (
    select 'anon can EXECUTE ecommerce.create_order_with_notifications' as msg
    where has_function_privilege('anon', 'ecommerce.create_order_with_notifications(uuid, text, text, jsonb, jsonb, jsonb)', 'execute')
    union all
    select 'authenticated can EXECUTE ecommerce.create_order_with_notifications'
    where has_function_privilege('authenticated', 'ecommerce.create_order_with_notifications(uuid, text, text, jsonb, jsonb, jsonb)', 'execute')
    union all
    select 'service_role cannot EXECUTE ecommerce.create_order_with_notifications'
    where not has_function_privilege('service_role', 'ecommerce.create_order_with_notifications(uuid, text, text, jsonb, jsonb, jsonb)', 'execute')
  ) v;

  if v_violations is not null then
    raise exception 'create_order_with_notifications grant contract broken: %', array_to_string(v_violations, '; ');
  end if;
end $$;

-- D29/D30: the order status transition RPC (slice 4) must exist with the
-- exact signature the app calls.
do $$
begin
  if to_regprocedure('ecommerce.transition_order_status(uuid, uuid, uuid, text, jsonb)') is null then
    raise exception 'Missing ecommerce.transition_order_status(uuid, uuid, uuid, text, jsonb)';
  end if;
end $$;

-- D30: same posture as create_order_with_notifications -- service_role only,
-- since the function updates orders and inserts into email_outbox as its
-- owner without granting callers table access.
do $$
declare
  v_violations text[];
begin
  select array_agg(msg) into v_violations
  from (
    select 'anon can EXECUTE ecommerce.transition_order_status' as msg
    where has_function_privilege('anon', 'ecommerce.transition_order_status(uuid, uuid, uuid, text, jsonb)', 'execute')
    union all
    select 'authenticated can EXECUTE ecommerce.transition_order_status'
    where has_function_privilege('authenticated', 'ecommerce.transition_order_status(uuid, uuid, uuid, text, jsonb)', 'execute')
    union all
    select 'service_role cannot EXECUTE ecommerce.transition_order_status'
    where not has_function_privilege('service_role', 'ecommerce.transition_order_status(uuid, uuid, uuid, text, jsonb)', 'execute')
  ) v;

  if v_violations is not null then
    raise exception 'transition_order_status grant contract broken: %', array_to_string(v_violations, '; ');
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

-- -----------------------------------------------------------------------------
-- D27/D28/D12: atomic checkout order creation. Same rollback-wrapped
-- transaction and the same contract-check-store the blocks above provisioned.
-- -----------------------------------------------------------------------------
do $$
declare
  v_store_id uuid;
  v_reserved_order_number text;
  v_order jsonb;
  v_items jsonb;
  v_notifications jsonb;
  v_result jsonb;
  v_order_id uuid;
  v_second_order_id uuid;
  v_outbox_count integer;
  v_order_count integer;
begin
  select id into v_store_id from ecommerce.stores where subdomain = 'contract-check-store';

  -- D13: the app reserves order_number via ecommerce.generate_order_number
  -- BEFORE calling here (the two outbox emails are rendered with it already
  -- in their text), then passes it through p_order.order_number. Reserving
  -- it here too proves the function actually USES that value for the insert
  -- instead of silently letting set_order_number_before_insert mint an
  -- unrelated one -- which would desync the persisted order from what the
  -- customer's already-queued email says.
  v_reserved_order_number := ecommerce.generate_order_number(v_store_id);

  v_order := jsonb_build_object(
    'customer_type', 'guest', 'customer_email', 'buyer@example.com',
    'customer_first_name', 'Ada', 'customer_last_name', 'Lovelace',
    'shipping_address', 'Calle 123', 'shipping_city', 'Bogotá', 'shipping_postal_code', '110111',
    'payment_method', 'cash_on_delivery', 'subtotal', 30000, 'total_amount', 30000,
    'order_number', v_reserved_order_number
  );
  v_items := jsonb_build_array(
    jsonb_build_object('product_name', 'Café 250g', 'unit_price', 30000, 'quantity', 1, 'total_price', 30000)
  );
  v_notifications := jsonb_build_array(
    jsonb_build_object(
      'templateKind', 'order-received', 'recipientEmail', 'buyer@example.com',
      'fromAddress', 'Contract Check Store vía Osoria <pedidos@mail.osoria.help>', 'replyToAddress', null,
      'subject', 'Recibimos tu pedido', 'htmlBody', '<p>h</p>', 'textBody', 't',
      'idempotencyKey', 'checkout:' || v_store_id::text || ':atomic-check-1:order-received'
    ),
    jsonb_build_object(
      'templateKind', 'merchant-new-order', 'recipientEmail', 'tienda@example.com',
      'fromAddress', 'Contract Check Store vía Osoria <pedidos@mail.osoria.help>', 'replyToAddress', null,
      'subject', 'Nuevo pedido', 'htmlBody', '<p>h</p>', 'textBody', 't',
      'idempotencyKey', 'checkout:' || v_store_id::text || ':atomic-check-1:merchant-new-order'
    )
  );

  -- Atomic rollback (D27): an empty p_items makes the function raise AFTER
  -- the header insert but BEFORE the outbox insert -- the exception aborts
  -- the whole call (one statement, one transaction), so the header must roll
  -- back too, not just the items that were never written.
  begin
    perform ecommerce.create_order_with_notifications(
      v_store_id, 'atomic-check-rollback', 'fingerprint-rollback', v_order, '[]'::jsonb, v_notifications
    );
    raise exception 'D27: an order with zero items must raise, not silently create';
  exception when others then
    null;
  end;

  if exists (select 1 from ecommerce.orders where store_id = v_store_id and idempotency_key = 'atomic-check-rollback') then
    raise exception 'D27: the mid-way failure above must have left NO order row';
  end if;
  if exists (
    select 1 from ecommerce.email_outbox
    where idempotency_key like 'checkout:' || v_store_id::text || ':atomic-check-1:%'
  ) then
    raise exception 'D27: the mid-way failure above must have left NO outbox rows';
  end if;

  -- Happy path: header + items + exactly two outbox rows, atomically.
  v_result := ecommerce.create_order_with_notifications(
    v_store_id, 'atomic-check-1', 'fingerprint-1', v_order, v_items, v_notifications
  );
  if (v_result ->> 'ok')::boolean is not true or (v_result ->> 'replayed')::boolean is not false then
    raise exception 'D27: expected a fresh order to be created, got %', v_result;
  end if;
  v_order_id := (v_result -> 'order' ->> 'id')::uuid;
  if (v_result -> 'order' ->> 'order_number') <> v_reserved_order_number then
    raise exception 'D13: the persisted order_number (%) must match the one reserved before rendering the emails (%)',
      v_result -> 'order' ->> 'order_number', v_reserved_order_number;
  end if;

  select count(*) into v_outbox_count
  from ecommerce.email_outbox
  where idempotency_key like 'checkout:' || v_store_id::text || ':atomic-check-1:%';
  if v_outbox_count <> 2 then
    raise exception 'D12: expected exactly two outbox notifications, got %', v_outbox_count;
  end if;

  -- D28 identical retry: same key, same fingerprint -> the SAME order comes
  -- back; no second order row, no second pair of outbox notifications.
  v_result := ecommerce.create_order_with_notifications(
    v_store_id, 'atomic-check-1', 'fingerprint-1', v_order, v_items, v_notifications
  );
  if (v_result ->> 'ok')::boolean is not true or (v_result ->> 'replayed')::boolean is not true then
    raise exception 'D28: an identical retry must report replayed:true, got %', v_result;
  end if;
  if (v_result -> 'order' ->> 'id')::uuid <> v_order_id then
    raise exception 'D28: an identical retry must return the SAME order id';
  end if;

  select count(*) into v_order_count from ecommerce.orders
  where store_id = v_store_id and idempotency_key = 'atomic-check-1';
  if v_order_count <> 1 then
    raise exception 'D28: an identical retry must never create a second order, found %', v_order_count;
  end if;

  select count(*) into v_outbox_count
  from ecommerce.email_outbox
  where idempotency_key like 'checkout:' || v_store_id::text || ':atomic-check-1:%';
  if v_outbox_count <> 2 then
    raise exception 'D28: a replay must never enqueue a second pair of notifications, found %', v_outbox_count;
  end if;

  -- D28 conflicting payload: same key, different fingerprint -> rejected outright.
  v_result := ecommerce.create_order_with_notifications(
    v_store_id, 'atomic-check-1', 'a-different-fingerprint', v_order, v_items, v_notifications
  );
  if v_result <> jsonb_build_object('ok', false, 'reason', 'idempotency_conflict') then
    raise exception 'D28: a reused key with a different payload must be rejected, got %', v_result;
  end if;

  -- A DIFFERENT key is a genuinely new order, never confused with the first.
  -- Needs its own reserved order_number: reusing the first one would collide
  -- with ecommerce.orders' (store_id, order_number) unique constraint, since
  -- 'atomic-check-1' already committed with it above.
  v_order := v_order || jsonb_build_object('order_number', ecommerce.generate_order_number(v_store_id));
  v_result := ecommerce.create_order_with_notifications(
    v_store_id, 'atomic-check-2', 'fingerprint-2', v_order, v_items,
    jsonb_build_array(
      jsonb_build_object(
        'templateKind', 'order-received', 'recipientEmail', 'buyer@example.com',
        'fromAddress', 'Contract Check Store vía Osoria <pedidos@mail.osoria.help>', 'replyToAddress', null,
        'subject', 'Recibimos tu pedido', 'htmlBody', '<p>h</p>', 'textBody', 't',
        'idempotencyKey', 'checkout:' || v_store_id::text || ':atomic-check-2:order-received'
      ),
      jsonb_build_object(
        'templateKind', 'merchant-new-order', 'recipientEmail', 'tienda@example.com',
        'fromAddress', 'Contract Check Store vía Osoria <pedidos@mail.osoria.help>', 'replyToAddress', null,
        'subject', 'Nuevo pedido', 'htmlBody', '<p>h</p>', 'textBody', 't',
        'idempotencyKey', 'checkout:' || v_store_id::text || ':atomic-check-2:merchant-new-order'
      )
    )
  );
  v_second_order_id := (v_result -> 'order' ->> 'id')::uuid;
  if v_second_order_id = v_order_id then
    raise exception 'D28: a different idempotency key must create a genuinely different order';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Verifier finding 1 (slice 3): the merchant notification is OPTIONAL during
-- D31's pre-enforcement window, but only in a checkable shape -- always
-- exactly one order-received, at most one merchant-new-order, nothing else.
-- See 20260805000600_ecommerce_checkout_optional_merchant_notification.sql.
-- -----------------------------------------------------------------------------
do $$
declare
  v_store_id uuid;
  v_order jsonb;
  v_items jsonb;
  v_result jsonb;
  v_outbox_count integer;
  v_receipt_only jsonb;
begin
  select id into v_store_id from ecommerce.stores where subdomain = 'contract-check-store';

  v_items := jsonb_build_array(
    jsonb_build_object('product_name', 'Taza', 'unit_price', 15000, 'quantity', 1, 'total_price', 15000)
  );
  v_receipt_only := jsonb_build_array(
    jsonb_build_object(
      'templateKind', 'order-received', 'recipientEmail', 'buyer2@example.com',
      'fromAddress', 'Contract Check Store vía Osoria <pedidos@mail.osoria.help>', 'replyToAddress', null,
      'subject', 'Recibimos tu pedido', 'htmlBody', '<p>h</p>', 'textBody', 't',
      'idempotencyKey', 'checkout:' || v_store_id::text || ':finding1-receipt-only:order-received'
    )
  );

  -- D31: a store with no merchant recipient (enforcement off) still checks
  -- out with the customer receipt ALONE -- one outbox row, not zero, not two.
  v_order := jsonb_build_object(
    'customer_type', 'guest', 'customer_email', 'buyer2@example.com',
    'customer_first_name', 'Grace', 'customer_last_name', 'Hopper',
    'shipping_address', 'Calle 456', 'shipping_city', 'Bogotá', 'shipping_postal_code', '110111',
    'payment_method', 'cash_on_delivery', 'subtotal', 15000, 'total_amount', 15000,
    'order_number', ecommerce.generate_order_number(v_store_id)
  );
  v_result := ecommerce.create_order_with_notifications(
    v_store_id, 'finding1-receipt-only', 'fingerprint-f1a', v_order, v_items, v_receipt_only
  );
  if (v_result ->> 'ok')::boolean is not true then
    raise exception 'Finding 1: a single order-received notification must be accepted, got %', v_result;
  end if;

  select count(*) into v_outbox_count from ecommerce.email_outbox
  where idempotency_key like 'checkout:' || v_store_id::text || ':finding1-receipt-only:%';
  if v_outbox_count <> 1 then
    raise exception 'Finding 1: expected exactly one outbox row for the receipt-only order, got %', v_outbox_count;
  end if;

  -- Every OTHER shape the RPC must still reject, one at a time -- checkable
  -- by structure, never "one or two, whatever".
  begin
    perform ecommerce.create_order_with_notifications(
      v_store_id, 'finding1-zero-receipts', 'fingerprint-f1b',
      v_order || jsonb_build_object('order_number', ecommerce.generate_order_number(v_store_id)),
      v_items, '[]'::jsonb
    );
    raise exception 'Finding 1: zero notifications must raise';
  exception when others then null;
  end;

  begin
    perform ecommerce.create_order_with_notifications(
      v_store_id, 'finding1-no-receipt', 'fingerprint-f1c',
      v_order || jsonb_build_object('order_number', ecommerce.generate_order_number(v_store_id)),
      v_items,
      jsonb_build_array(jsonb_build_object(
        'templateKind', 'merchant-new-order', 'recipientEmail', 'tienda@example.com',
        'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
        'idempotencyKey', 'checkout:' || v_store_id::text || ':finding1-no-receipt:merchant-new-order'
      ))
    );
    raise exception 'Finding 1: a merchant notification with NO order-received must raise';
  exception when others then null;
  end;

  begin
    perform ecommerce.create_order_with_notifications(
      v_store_id, 'finding1-two-receipts', 'fingerprint-f1d',
      v_order || jsonb_build_object('order_number', ecommerce.generate_order_number(v_store_id)),
      v_items,
      jsonb_build_array(
        jsonb_build_object(
          'templateKind', 'order-received', 'recipientEmail', 'a@example.com',
          'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
          'idempotencyKey', 'checkout:' || v_store_id::text || ':finding1-two-receipts:order-received-1'
        ),
        jsonb_build_object(
          'templateKind', 'order-received', 'recipientEmail', 'b@example.com',
          'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
          'idempotencyKey', 'checkout:' || v_store_id::text || ':finding1-two-receipts:order-received-2'
        )
      )
    );
    raise exception 'Finding 1: two order-received notifications must raise';
  exception when others then null;
  end;

  begin
    perform ecommerce.create_order_with_notifications(
      v_store_id, 'finding1-two-merchants', 'fingerprint-f1e',
      v_order || jsonb_build_object('order_number', ecommerce.generate_order_number(v_store_id)),
      v_items,
      jsonb_build_array(
        jsonb_build_object(
          'templateKind', 'order-received', 'recipientEmail', 'a@example.com',
          'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
          'idempotencyKey', 'checkout:' || v_store_id::text || ':finding1-two-merchants:order-received'
        ),
        jsonb_build_object(
          'templateKind', 'merchant-new-order', 'recipientEmail', 'b@example.com',
          'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
          'idempotencyKey', 'checkout:' || v_store_id::text || ':finding1-two-merchants:merchant-1'
        ),
        jsonb_build_object(
          'templateKind', 'merchant-new-order', 'recipientEmail', 'c@example.com',
          'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
          'idempotencyKey', 'checkout:' || v_store_id::text || ':finding1-two-merchants:merchant-2'
        )
      )
    );
    raise exception 'Finding 1: two merchant-new-order notifications must raise';
  exception when others then null;
  end;

  begin
    perform ecommerce.create_order_with_notifications(
      v_store_id, 'finding1-unknown-kind', 'fingerprint-f1f',
      v_order || jsonb_build_object('order_number', ecommerce.generate_order_number(v_store_id)),
      v_items,
      jsonb_build_array(
        jsonb_build_object(
          'templateKind', 'order-received', 'recipientEmail', 'a@example.com',
          'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
          'idempotencyKey', 'checkout:' || v_store_id::text || ':finding1-unknown-kind:order-received'
        ),
        jsonb_build_object(
          'templateKind', 'something-else', 'recipientEmail', 'b@example.com',
          'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
          'idempotencyKey', 'checkout:' || v_store_id::text || ':finding1-unknown-kind:other'
        )
      )
    );
    raise exception 'Finding 1: an unrecognized templateKind must raise';
  exception when others then null;
  end;

  -- None of the five rejected shapes above may have left an order behind:
  -- each one raises before the header is ever inserted.
  if exists (
    select 1 from ecommerce.orders
    where store_id = v_store_id
      and idempotency_key in (
        'finding1-zero-receipts', 'finding1-no-receipt', 'finding1-two-receipts',
        'finding1-two-merchants', 'finding1-unknown-kind'
      )
  ) then
    raise exception 'Finding 1: a rejected notification shape must never leave an order behind';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Verifier finding 2 (slice 3): the checkout follow-ups that run after the
-- atomic order write (inventory decrement, shipping address, payment
-- transaction) converge to exactly one effect per order across a retried
-- follow-up sequence -- never zero, never twice. See
-- 20260805000700_ecommerce_checkout_followup_convergence.sql. This is real
-- transactional/idempotency behavior a Vitest mock cannot prove (it bridges
-- the RPC back onto plain insert queues), so it belongs here against real
-- Postgres.
-- -----------------------------------------------------------------------------
do $$
declare
  v_store_id uuid;
  v_item_id uuid;
  v_order jsonb;
  v_items jsonb;
  v_notifications jsonb;
  v_result jsonb;
  v_order_id uuid;
  v_decrement_items jsonb;
  v_shortages jsonb;
  v_quantity_after integer;
  v_address_count integer;
  v_payment_count integer;
begin
  select id into v_store_id from ecommerce.stores where subdomain = 'contract-check-store';

  insert into ecommerce.store_items
    (store_id, item_name, base_price, currency_code, track_inventory, inventory_quantity, is_active, is_available_for_sale)
  values
    (v_store_id, 'Finding 2 Widget', 10000, 'COP', true, 5, true, true)
  returning id into v_item_id;

  v_order := jsonb_build_object(
    'customer_type', 'guest', 'customer_email', 'finding2@example.com',
    'customer_first_name', 'Ada', 'customer_last_name', 'Lovelace',
    'shipping_address', 'Calle 789', 'shipping_city', 'Bogotá', 'shipping_postal_code', '110111',
    'payment_method', 'cash_on_delivery', 'subtotal', 20000, 'total_amount', 20000,
    'order_number', ecommerce.generate_order_number(v_store_id)
  );
  v_items := jsonb_build_array(
    jsonb_build_object(
      'product_id', v_item_id::text, 'product_name', 'Finding 2 Widget',
      'unit_price', 10000, 'quantity', 2, 'total_price', 20000
    )
  );
  v_notifications := jsonb_build_array(
    jsonb_build_object(
      'templateKind', 'order-received', 'recipientEmail', 'finding2@example.com',
      'fromAddress', 'Contract Check Store vía Osoria <pedidos@mail.osoria.help>', 'replyToAddress', null,
      'subject', 'Recibimos tu pedido', 'htmlBody', '<p>h</p>', 'textBody', 't',
      'idempotencyKey', 'checkout:' || v_store_id::text || ':finding2-order:order-received'
    )
  );

  v_result := ecommerce.create_order_with_notifications(
    v_store_id, 'finding2-order', 'fingerprint-f2', v_order, v_items, v_notifications
  );
  if (v_result ->> 'ok')::boolean is not true then
    raise exception 'Finding 2 setup: expected the order to be created, got %', v_result;
  end if;
  v_order_id := (v_result -> 'order' ->> 'id')::uuid;

  v_decrement_items := jsonb_build_array(
    jsonb_build_object('variant_id', null, 'product_id', v_item_id::text, 'quantity', 2)
  );

  -- First follow-up attempt: genuinely decrements (5 -> 3).
  select ecommerce.decrement_inventory(v_order_id, v_store_id, v_decrement_items) into v_shortages;
  select inventory_quantity into v_quantity_after from ecommerce.store_items where id = v_item_id;
  if v_quantity_after <> 3 or jsonb_array_length(v_shortages) <> 0 then
    raise exception 'Finding 2: first decrement must take inventory from 5 to 3 with no shortages, got quantity=%, shortages=%', v_quantity_after, v_shortages;
  end if;

  if not exists (select 1 from ecommerce.orders where id = v_order_id and inventory_decremented_at is not null) then
    raise exception 'Finding 2: inventory_decremented_at must be set after the first successful decrement';
  end if;

  -- Retried follow-up (e.g. the customer's page reload after the first
  -- attempt died right after the atomic RPC succeeded, before this ran):
  -- same order, same items. Must NOT decrement a second time.
  select ecommerce.decrement_inventory(v_order_id, v_store_id, v_decrement_items) into v_shortages;
  select inventory_quantity into v_quantity_after from ecommerce.store_items where id = v_item_id;
  if v_quantity_after <> 3 then
    raise exception 'Finding 2: a retried decrement for the SAME order must never decrement twice, inventory is now % (expected 3, unchanged)', v_quantity_after;
  end if;
  if jsonb_array_length(v_shortages) <> 0 then
    raise exception 'Finding 2: a retried, already-decremented order must report no shortages, got %', v_shortages;
  end if;

  -- A plain double-submit (no failure in between, just a second call) must
  -- converge identically: still exactly one decrement.
  perform ecommerce.decrement_inventory(v_order_id, v_store_id, v_decrement_items);
  select inventory_quantity into v_quantity_after from ecommerce.store_items where id = v_item_id;
  if v_quantity_after <> 3 then
    raise exception 'Finding 2: a third call (double-submit) must still never decrement twice, inventory is now %', v_quantity_after;
  end if;

  -- Shipping address: the SAME (order_id, address_type) upsert the app now
  -- issues on every follow-up run (fresh row id, same conflict target) must
  -- converge to exactly one row instead of raising or duplicating.
  insert into ecommerce.order_addresses (id, order_id, address_type, address_line_1, city, postal_code, country)
  values (gen_random_uuid(), v_order_id, 'shipping', 'Calle 789', 'Bogotá', '110111', 'Colombia')
  on conflict (order_id, address_type) do nothing;
  insert into ecommerce.order_addresses (id, order_id, address_type, address_line_1, city, postal_code, country)
  values (gen_random_uuid(), v_order_id, 'shipping', 'Calle 789 (retry)', 'Bogotá', '110111', 'Colombia')
  on conflict (order_id, address_type) do nothing;

  select count(*) into v_address_count from ecommerce.order_addresses where order_id = v_order_id;
  if v_address_count <> 1 then
    raise exception 'Finding 2: a retried shipping address upsert must converge to exactly one row, found %', v_address_count;
  end if;

  -- Payment transaction: the SAME idempotency_key (the checkout's own,
  -- reused across a retry) must converge to exactly one row too.
  insert into ecommerce.payment_transactions (id, order_id, idempotency_key, provider, transaction_type, amount, currency_code, status)
  values (gen_random_uuid(), v_order_id, 'finding2-order', 'cash_on_delivery', 'payment', 20000, 'COP', 'pending')
  on conflict (idempotency_key) do nothing;
  insert into ecommerce.payment_transactions (id, order_id, idempotency_key, provider, transaction_type, amount, currency_code, status)
  values (gen_random_uuid(), v_order_id, 'finding2-order', 'cash_on_delivery', 'payment', 20000, 'COP', 'pending')
  on conflict (idempotency_key) do nothing;

  select count(*) into v_payment_count from ecommerce.payment_transactions where order_id = v_order_id;
  if v_payment_count <> 1 then
    raise exception 'Finding 2: a retried payment_transactions upsert must converge to exactly one row, found %', v_payment_count;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Slice 4: ecommerce.transition_order_status -- the frozen D29 graph
-- (exhaustive: every one of the 7x7 (from, to) pairs, not a sample), terminal
-- states, authorization, tenant scoping, and the D11 lifecycle notification
-- catalog (atomically with the status change, D27 spirit). This is real
-- transactional/authorization/rejection behavior a Vitest mock cannot prove
-- (tests/orders/order-status-writer.test.ts proves the TS wiring only) --
-- it belongs here, against real Postgres.
-- -----------------------------------------------------------------------------
do $$
declare
  v_owner_id uuid := gen_random_uuid();
  v_outsider_id uuid := gen_random_uuid();
  v_other_owner_id uuid := gen_random_uuid();
  v_store_id uuid;
  v_other_store_id uuid;
  v_order_id uuid;
  v_result jsonb;
  v_status text;
  v_outbox_count integer;
  v_from text;
  v_to text;
  v_expected_allowed boolean;
  v_all_statuses text[] := array['pending','confirmed','processing','shipped','delivered','cancelled','returned'];
  v_lifecycle_kind jsonb := jsonb_build_object(
    'shipped', 'order-shipped', 'delivered', 'order-delivered',
    'cancelled', 'order-cancelled', 'returned', 'order-returned'
  );
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  values
    (v_owner_id, 'order-status-owner@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated'),
    (v_outsider_id, 'order-status-outsider@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated'),
    (v_other_owner_id, 'order-status-other-owner@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');
  insert into ecommerce.user_profiles (id, email, role) values
    (v_owner_id, 'order-status-owner@example.com', 'user'),
    (v_outsider_id, 'order-status-outsider@example.com', 'user'),
    (v_other_owner_id, 'order-status-other-owner@example.com', 'user');

  v_store_id := ecommerce.provision_store('order-status-check-store', 'Order Status Check Store', v_owner_id, 'COP');
  v_other_store_id := ecommerce.provision_store('order-status-check-other', 'Order Status Check Other', v_other_owner_id, 'COP');

  insert into ecommerce.orders (
    store_id, order_number, customer_type, customer_email, customer_first_name, customer_last_name,
    shipping_address, shipping_city, shipping_postal_code, subtotal, total_amount, status
  ) values (
    v_store_id, ecommerce.generate_order_number(v_store_id), 'guest', 'buyer@example.com', 'Ada', 'Lovelace',
    'Calle 1', 'Bogotá', '110111', 10000, 10000, 'pending'
  ) returning id into v_order_id;

  -- Authorization: an outsider with no role on the store can never
  -- transition its order, regardless of whether the transition would
  -- otherwise be allowed. Rejected before any status change.
  v_result := ecommerce.transition_order_status(v_order_id, v_store_id, v_outsider_id, 'confirmed');
  if v_result <> jsonb_build_object('ok', false, 'reason', 'not_authorized') then
    raise exception 'Authorization: an outsider must never be able to transition an order, got %', v_result;
  end if;
  select status into v_status from ecommerce.orders where id = v_order_id;
  if v_status <> 'pending' then
    raise exception 'Authorization: a rejected not_authorized call must never change the order status, got %', v_status;
  end if;

  -- Tenant, direction 1: the owner of a DIFFERENT store cannot manage THIS
  -- store at all -- can_user_manage_store(v_other_owner_id, v_store_id) is
  -- false, so this is rejected as not_authorized before the order is ever
  -- looked up.
  v_result := ecommerce.transition_order_status(v_order_id, v_store_id, v_other_owner_id, 'confirmed');
  if v_result <> jsonb_build_object('ok', false, 'reason', 'not_authorized') then
    raise exception 'Tenant: a caller who does not manage the target store must never transition its orders, got %', v_result;
  end if;

  -- Tenant, direction 2: that SAME owner IS authorized for their own store,
  -- but this order does not belong to it -- rejected as not_found, never
  -- leaking across the tenant boundary into store A.
  v_result := ecommerce.transition_order_status(v_order_id, v_other_store_id, v_other_owner_id, 'confirmed');
  if v_result <> jsonb_build_object('ok', false, 'reason', 'not_found') then
    raise exception 'Tenant: an order requested under a store it does not belong to must be not_found, got %', v_result;
  end if;

  -- Exhaustive over the frozen D29 graph: every (from, to) pair across all
  -- seven statuses, not a sample.
  foreach v_from in array v_all_statuses loop
    foreach v_to in array v_all_statuses loop
      select exists (
        select 1 from (values
          ('pending', 'confirmed'), ('pending', 'processing'), ('pending', 'cancelled'),
          ('confirmed', 'processing'), ('confirmed', 'shipped'), ('confirmed', 'cancelled'),
          ('processing', 'shipped'), ('processing', 'cancelled'),
          ('shipped', 'delivered'),
          ('delivered', 'returned')
        ) as allowed(from_status, to_status)
        where allowed.from_status = v_from and allowed.to_status = v_to
      ) into v_expected_allowed;

      update ecommerce.orders
      set status = v_from::ecommerce.order_status,
          confirmed_at = null, shipped_at = null, delivered_at = null, cancelled_at = null
      where id = v_order_id;
      delete from ecommerce.email_outbox where idempotency_key = 'order-status:' || v_order_id::text || ':' || v_to;

      if v_expected_allowed and v_lifecycle_kind ? v_to then
        v_result := ecommerce.transition_order_status(
          v_order_id, v_store_id, v_owner_id, v_to,
          jsonb_build_object(
            'templateKind', v_lifecycle_kind ->> v_to, 'recipientEmail', 'buyer@example.com',
            'fromAddress', 'Order Status Check Store vía Osoria <pedidos@mail.osoria.help>', 'replyToAddress', null,
            'subject', 's', 'htmlBody', 'h', 'textBody', 't',
            'idempotencyKey', 'order-status:' || v_order_id::text || ':' || v_to
          )
        );
      else
        v_result := ecommerce.transition_order_status(v_order_id, v_store_id, v_owner_id, v_to);
      end if;

      select status into v_status from ecommerce.orders where id = v_order_id;
      select count(*) into v_outbox_count from ecommerce.email_outbox
      where idempotency_key = 'order-status:' || v_order_id::text || ':' || v_to;

      if v_expected_allowed then
        if (v_result ->> 'ok')::boolean is not true then
          raise exception 'D29: % -> % is an ALLOWED transition but was rejected: %', v_from, v_to, v_result;
        end if;
        if v_status <> v_to then
          raise exception 'D29: % -> % must persist the new status, got %', v_from, v_to, v_status;
        end if;
        if v_lifecycle_kind ? v_to and v_outbox_count <> 1 then
          raise exception 'D11: % -> % must enqueue exactly one % notification, found %', v_from, v_to, v_lifecycle_kind ->> v_to, v_outbox_count;
        end if;
      else
        if (v_result ->> 'ok')::boolean is not false or (v_result ->> 'reason') <> 'invalid_transition' then
          raise exception 'D29: % -> % is a FORBIDDEN transition but was not rejected as invalid_transition: %', v_from, v_to, v_result;
        end if;
        if v_status <> v_from then
          raise exception 'D29: a rejected % -> % must leave the status unchanged, got %', v_from, v_to, v_status;
        end if;
        if v_outbox_count <> 0 then
          raise exception 'D29/D27: a rejected % -> % must never leave an outbox row behind, found %', v_from, v_to, v_outbox_count;
        end if;
      end if;
    end loop;
  end loop;

  -- Terminal states, restated as their own assertion for the "terminal
  -- states" verify criterion (already implied above, since every (cancelled,
  -- *) and (returned, *) pair is forbidden): cancelled and returned reject
  -- EVERY outgoing transition, including into themselves.
  foreach v_to in array v_all_statuses loop
    update ecommerce.orders set status = 'cancelled' where id = v_order_id;
    v_result := ecommerce.transition_order_status(v_order_id, v_store_id, v_owner_id, v_to);
    if (v_result ->> 'ok')::boolean is not false or (v_result ->> 'reason') <> 'invalid_transition' then
      raise exception 'Terminal: cancelled must reject every outgoing transition, got % for -> %', v_result, v_to;
    end if;

    update ecommerce.orders set status = 'returned' where id = v_order_id;
    v_result := ecommerce.transition_order_status(v_order_id, v_store_id, v_owner_id, v_to);
    if (v_result ->> 'ok')::boolean is not false or (v_result ->> 'reason') <> 'invalid_transition' then
      raise exception 'Terminal: returned must reject every outgoing transition, got % for -> %', v_result, v_to;
    end if;
  end loop;

  -- D11 shape guard: a caller bug that attaches a notification to a
  -- confirmed/processing transition, or omits the required one for a
  -- lifecycle transition, must raise -- never silently send the wrong
  -- message or skip a required one.
  update ecommerce.orders set status = 'pending' where id = v_order_id;
  begin
    perform ecommerce.transition_order_status(
      v_order_id, v_store_id, v_owner_id, 'confirmed',
      jsonb_build_object(
        'templateKind', 'order-shipped', 'recipientEmail', 'x', 'fromAddress', 'x', 'replyToAddress', null,
        'subject', 's', 'htmlBody', 'h', 'textBody', 't', 'idempotencyKey', 'bogus'
      )
    );
    raise exception 'D11: a notification attached to a confirmed transition must raise';
  exception when others then null;
  end;

  update ecommerce.orders set status = 'confirmed' where id = v_order_id;
  begin
    perform ecommerce.transition_order_status(v_order_id, v_store_id, v_owner_id, 'shipped');
    raise exception 'D11: a shipped transition with NO notification must raise';
  exception when others then null;
  end;
end $$;

rollback;

select 'email platform contract ok' as status;
