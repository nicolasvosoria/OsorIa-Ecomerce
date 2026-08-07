-- Fail-closed contract verification for the durable email platform.
-- Mirrors verify-ecommerce-contract.sql's style
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
  from (values ('email_outbox'), ('email_send_attempts'), ('store_mailbox_verifications'), ('auth_intents'), ('pending_membership_invites')) req(required_table)
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
    ('email_outbox', 'idempotency_key'), ('email_outbox', 'attempt_count'), ('email_outbox', 'rejection_count'), ('email_outbox', 'claim_generation'), ('email_outbox', 'provider_message_id'), ('email_outbox', 'last_error'),
    ('orders', 'idempotency_key'), ('orders', 'payload_fingerprint'),
    ('auth_intents', 'store_id'), ('auth_intents', 'purpose'), ('auth_intents', 'token_hash'), ('auth_intents', 'expires_at'), ('auth_intents', 'consumed_at'),
    ('pending_membership_invites', 'store_id'), ('pending_membership_invites', 'intended_user_id'), ('pending_membership_invites', 'role_name'),
    ('pending_membership_invites', 'token_hash'), ('pending_membership_invites', 'expires_at'), ('pending_membership_invites', 'consumed_at')
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

-- The race fix's own load-bearing precondition: CREATE OR REPLACE cannot
-- change a function's argument list, so mark_email_outbox_sent and
-- mark_email_outbox_failed's claim_generation parameter required an
-- explicit DROP of their old signatures before recreating them (see
-- 20260806000400_ecommerce_email_outbox_transient_retry.sql). If either old,
-- unguarded signature is still resolvable here, the fencing fix has a silent
-- bypass: a caller (or an old cached PostgREST schema cache entry) could
-- still reach the pre-fencing write path.
do $$
begin
  if to_regprocedure('ecommerce.mark_email_outbox_sent(uuid, text)') is not null then
    raise exception 'The old, unguarded ecommerce.mark_email_outbox_sent(uuid, text) must not still exist as a live overload';
  end if;
  if to_regprocedure('ecommerce.mark_email_outbox_failed(uuid, text, text)') is not null then
    raise exception 'The old, unguarded ecommerce.mark_email_outbox_failed(uuid, text, text) must not still exist as a live overload';
  end if;
  if to_regprocedure('ecommerce.mark_email_outbox_sent(uuid, text, integer)') is null then
    raise exception 'Missing the fencing-guarded ecommerce.mark_email_outbox_sent(uuid, text, integer)';
  end if;
  if to_regprocedure('ecommerce.mark_email_outbox_failed(uuid, integer, text, text)') is null then
    raise exception 'Missing the fencing-guarded ecommerce.mark_email_outbox_failed(uuid, integer, text, text)';
  end if;
  if to_regprocedure('ecommerce.mark_email_outbox_transient_failure(uuid, integer, text, text)') is null then
    raise exception 'Missing the fencing-guarded ecommerce.mark_email_outbox_transient_failure(uuid, integer, text, text)';
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

-- D29/D30: the order status transition RPC must exist with the exact
-- signature the app calls.
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
  from (values ('email_outbox'), ('email_send_attempts'), ('store_mailbox_verifications'), ('auth_intents')) req(required_table)
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
    from unnest(array['email_outbox', 'email_send_attempts', 'store_mailbox_verifications', 'auth_intents']) tbl
    cross join unnest(array['select', 'insert', 'update', 'delete']) priv
    where has_table_privilege('anon', format('ecommerce.%I', tbl), priv)
    union all
    select format('authenticated has %s on ecommerce.%s', priv, tbl)
    from unnest(array['email_outbox', 'email_send_attempts', 'store_mailbox_verifications', 'auth_intents']) tbl
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
    and has_table_privilege('service_role', 'ecommerce.auth_intents', 'select')
    and has_table_privilege('service_role', 'ecommerce.auth_intents', 'insert')
  ) then
    raise exception 'service_role must retain full access to the email platform tables';
  end if;
end $$;

-- D23/D30: same posture as create_order_with_notifications/transition_order_status
-- -- service_role only, since finalize_customer_profile inserts into
-- user_profiles as its owner without granting callers table access.
do $$
declare
  v_violations text[];
begin
  select array_agg(msg) into v_violations
  from (
    select 'anon can EXECUTE ecommerce.finalize_customer_profile' as msg
    where has_function_privilege('anon', 'ecommerce.finalize_customer_profile(uuid, text, text, text, text)', 'execute')
    union all
    select 'authenticated can EXECUTE ecommerce.finalize_customer_profile'
    where has_function_privilege('authenticated', 'ecommerce.finalize_customer_profile(uuid, text, text, text, text)', 'execute')
    union all
    select 'service_role cannot EXECUTE ecommerce.finalize_customer_profile'
    where not has_function_privilege('service_role', 'ecommerce.finalize_customer_profile(uuid, text, text, text, text)', 'execute')
  ) v;

  if v_violations is not null then
    raise exception 'finalize_customer_profile grant contract broken: %', array_to_string(v_violations, '; ');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- D20/D21's three new functions must exist with the exact signatures the
-- app calls, and D30's grant contract (service_role only) -- same posture
-- as every other privileged write in this file.
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('ecommerce.find_auth_user_id_by_email(text)') is null then
    raise exception 'Missing ecommerce.find_auth_user_id_by_email(text)';
  end if;
  if to_regprocedure('ecommerce.request_membership_invite(uuid, uuid, uuid, text, text, text, text, text, text, text, text)') is null then
    raise exception 'Missing ecommerce.request_membership_invite(uuid, uuid, uuid, text, text, text, text, text, text, text, text)';
  end if;
  if to_regprocedure('ecommerce.accept_membership_invite(uuid, text)') is null then
    raise exception 'Missing ecommerce.accept_membership_invite(uuid, text)';
  end if;
end $$;

do $$
declare
  v_violations text[];
begin
  select array_agg(msg) into v_violations
  from (
    select format('%s can EXECUTE ecommerce.find_auth_user_id_by_email', role) as msg
    from unnest(array['anon', 'authenticated']) role
    where has_function_privilege(role, 'ecommerce.find_auth_user_id_by_email(text)', 'execute')
    union all
    select 'service_role cannot EXECUTE ecommerce.find_auth_user_id_by_email'
    where not has_function_privilege('service_role', 'ecommerce.find_auth_user_id_by_email(text)', 'execute')
    union all
    select format('%s can EXECUTE ecommerce.request_membership_invite', role)
    from unnest(array['anon', 'authenticated']) role
    where has_function_privilege(role, 'ecommerce.request_membership_invite(uuid, uuid, uuid, text, text, text, text, text, text, text, text)', 'execute')
    union all
    select 'service_role cannot EXECUTE ecommerce.request_membership_invite'
    where not has_function_privilege('service_role', 'ecommerce.request_membership_invite(uuid, uuid, uuid, text, text, text, text, text, text, text, text)', 'execute')
    union all
    select format('%s can EXECUTE ecommerce.accept_membership_invite', role)
    from unnest(array['anon', 'authenticated']) role
    where has_function_privilege(role, 'ecommerce.accept_membership_invite(uuid, text)', 'execute')
    union all
    select 'service_role cannot EXECUTE ecommerce.accept_membership_invite'
    where not has_function_privilege('service_role', 'ecommerce.accept_membership_invite(uuid, text)', 'execute')
  ) v;

  if v_violations is not null then
    raise exception 'D20/D21 invite function grant contract broken: %', array_to_string(v_violations, '; ');
  end if;
end $$;

-- D14: pending_membership_invites is RLS-enabled with zero anon/authenticated
-- grants and full service_role access, same posture as every other
-- service-role-only table in this schema -- including whatever the
-- baseline's blanket `grant ... on all
-- tables` might otherwise have swept up (it only ever covered tables that
-- existed when it ran, not this one).
do $$
declare
  v_violations text[];
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'ecommerce' and c.relname = 'pending_membership_invites' and c.relrowsecurity is true
  ) then
    raise exception 'ecommerce.pending_membership_invites is missing enabled RLS';
  end if;

  select array_agg(msg) into v_violations
  from (
    select format('%s has %s on ecommerce.pending_membership_invites', role, priv) as msg
    from unnest(array['anon', 'authenticated']) role
    cross join unnest(array['select', 'insert', 'update', 'delete']) priv
    where has_table_privilege(role, 'ecommerce.pending_membership_invites', priv)
  ) v;

  if v_violations is not null then
    raise exception 'anon/authenticated must have ZERO privileges on pending_membership_invites: %', array_to_string(v_violations, '; ');
  end if;

  if not (
    has_table_privilege('service_role', 'ecommerce.pending_membership_invites', 'select')
    and has_table_privilege('service_role', 'ecommerce.pending_membership_invites', 'insert')
    and has_table_privilege('service_role', 'ecommerce.pending_membership_invites', 'update')
  ) then
    raise exception 'service_role must retain full access to ecommerce.pending_membership_invites';
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

-- Closing-security-review finding on plan-correos-ecommerce: SELECT was the
-- one verb 20260805000100's own column lockdown never covered, so the six
-- mailbox columns stayed readable by anon/authenticated through the
-- baseline's relation-level `grant select on all tables`. 20260806000600
-- closes it; this is that fix's contract, covering the verb the block above
-- (UPDATE) does not. contact_email/contact_phone/address stay readable --
-- genuinely public, rendered in the footer of every customer-facing email.
do $$
declare
  v_violations text[];
begin
  select array_agg(msg) into v_violations
  from (
    select format('%s can SELECT ecommerce.store_contact.%s', role, col) as msg
    from unnest(array['anon', 'authenticated']) role
    cross join unnest(array[
      'reply_to_email', 'reply_to_pending_email', 'reply_to_verified_at',
      'order_mailbox_email', 'order_mailbox_pending_email', 'order_mailbox_verified_at'
    ]) col
    where has_column_privilege(role, 'ecommerce.store_contact', col, 'select')
    union all
    select format('%s cannot SELECT ecommerce.store_contact.%s', role, col)
    from unnest(array['anon', 'authenticated']) role
    cross join unnest(array['contact_email', 'contact_phone', 'address']) col
    where not has_column_privilege(role, 'ecommerce.store_contact', col, 'select')
  ) v;

  if v_violations is not null then
    raise exception 'store_contact SELECT column grant contract broken: %', array_to_string(v_violations, '; ');
  end if;

  if not (
    has_column_privilege('service_role', 'ecommerce.store_contact', 'order_mailbox_email', 'select')
    and has_column_privilege('service_role', 'ecommerce.store_contact', 'reply_to_pending_email', 'select')
  ) then
    raise exception 'service_role must retain full SELECT access to ecommerce.store_contact';
  end if;
end $$;

-- D29 + D30: status and the four lifecycle timestamps are NOT reachable by a
-- direct authenticated UPDATE -- only ecommerce.transition_order_status can
-- move them. Without this, a store admin's own PATCH could jump the frozen
-- graph outright (pending straight to delivered) and leave email_outbox
-- empty. Every other column keeps the access it already had.
do $$
declare
  v_violations text[];
begin
  select array_agg(msg) into v_violations
  from (
    select format('authenticated can UPDATE ecommerce.orders.%s', col) as msg
    from unnest(array['status', 'confirmed_at', 'shipped_at', 'delivered_at', 'cancelled_at']) col
    where has_column_privilege('authenticated', 'ecommerce.orders', col, 'update')
    union all
    select format('authenticated cannot UPDATE ecommerce.orders.%s', col)
    from unnest(array['notes', 'shipping_address', 'payment_reference', 'updated_at']) col
    where not has_column_privilege('authenticated', 'ecommerce.orders', col, 'update')
  ) v;

  if v_violations is not null then
    raise exception 'orders column grant contract broken: %', array_to_string(v_violations, '; ');
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

-- -----------------------------------------------------------------------------
-- D23's auth_intents + ecommerce.finalize_customer_profile.
-- Mint is a plain insert (lib/auth/auth-intents.ts's mintAuthIntent has no
-- authorization decision to make -- the store was already resolved
-- trustworthily server-side before this ever runs), so this block mints by
-- hand exactly the way that TS helper does. Every guarantee the verify
-- criteria name for this piece lives here: intent integrity/expiry/single-use
-- consumption, idempotent callback finalization, and that attribution can
-- never be redirected to a tenant other than the one the intent recorded.
-- -----------------------------------------------------------------------------
do $$
declare
  v_owner_id uuid := gen_random_uuid();
  v_store_a_id uuid;
  v_store_b_id uuid;
  v_user_id uuid := gen_random_uuid();
  v_other_user_id uuid := gen_random_uuid();
  v_token_hash text := encode(digest('auth-intent-check-token-1', 'sha256'), 'hex');
  v_result jsonb;
  v_expires_at timestamptz;
  v_created_at timestamptz;
  v_profile_count integer;
  v_signup_store_id uuid;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  values
    (v_owner_id, 'auth-intent-check-owner@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated'),
    (v_user_id, 'nueva@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated'),
    (v_other_user_id, 'otra@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');
  insert into ecommerce.user_profiles (id, email, role) values (v_owner_id, 'auth-intent-check-owner@example.com', 'user');
  v_store_a_id := ecommerce.provision_store('auth-intent-check-store-a', 'Auth Intent Check Store A', v_owner_id, 'COP');
  v_store_b_id := ecommerce.provision_store('auth-intent-check-store-b', 'Auth Intent Check Store B', v_owner_id, 'COP');

  -- Mint: bound to store A, one-hour expiry (D24).
  insert into ecommerce.auth_intents (store_id, purpose, email, token_hash, expires_at)
  values (v_store_a_id, 'signup', 'nueva@example.com', v_token_hash, now() + interval '1 hour');

  select expires_at, created_at into v_expires_at, v_created_at
  from ecommerce.auth_intents where token_hash = v_token_hash;
  if v_expires_at is null or abs(extract(epoch from (v_expires_at - v_created_at)) - 3600) > 5 then
    raise exception 'D24: auth intent must expire exactly one hour after creation, got a % second window', extract(epoch from (v_expires_at - v_created_at));
  end if;

  -- Idempotent finalize, part 1: first call for v_user_id creates the profile
  -- attributed to store A -- the store the intent recorded, never anything
  -- else, because the function has no other way to learn a store id at all.
  -- This IS the "attribution cannot be redirected to another tenant" proof:
  -- store B exists and is a real, valid store, but nothing about this call
  -- can make the profile land there.
  v_result := ecommerce.finalize_customer_profile(v_user_id, 'nueva@example.com', 'Nueva', 'Cliente', v_token_hash);
  if (v_result ->> 'ok')::boolean is not true or (v_result ->> 'created')::boolean is not true then
    raise exception 'Expected the fresh intent to finalize a new profile, got %', v_result;
  end if;
  if (v_result ->> 'store_id')::uuid <> v_store_a_id then
    raise exception 'D23: the finalized profile must be attributed to the intent''s own store (A), got %', v_result ->> 'store_id';
  end if;

  select signup_store_id into v_signup_store_id from ecommerce.user_profiles where id = v_user_id;
  if v_signup_store_id <> v_store_a_id or v_signup_store_id = v_store_b_id then
    raise exception 'D23: user_profiles.signup_store_id must be store A, never store B, got %', v_signup_store_id;
  end if;

  -- Idempotent finalize, part 2: a second call for the SAME user (a reload,
  -- React StrictMode's double-invoke) is a no-op success, not a second row
  -- and not a "token already consumed" failure.
  v_result := ecommerce.finalize_customer_profile(v_user_id, 'nueva@example.com', 'Nueva', 'Cliente', v_token_hash);
  if (v_result ->> 'ok')::boolean is not true or (v_result ->> 'created')::boolean is not false then
    raise exception 'D23: a second finalize call for the same user must be an idempotent no-op, got %', v_result;
  end if;

  select count(*) into v_profile_count from ecommerce.user_profiles where id = v_user_id;
  if v_profile_count <> 1 then
    raise exception 'D23: running finalize twice must leave exactly one profile, found %', v_profile_count;
  end if;

  -- Single-use consumption, independent of the idempotency shortcut above: a
  -- DIFFERENT user attempting to spend the SAME already-consumed token must
  -- be rejected -- this is what stops a replayed/guessed token from ever
  -- attributing a second, different account to store A.
  v_result := ecommerce.finalize_customer_profile(v_other_user_id, 'otra@example.com', 'Otra', 'Persona', v_token_hash);
  if (v_result ->> 'ok')::boolean is not false or (v_result ->> 'reason') <> 'invalid_or_expired_intent' then
    raise exception 'D24: a second use of an already-consumed intent must be rejected, got %', v_result;
  end if;
  if exists (select 1 from ecommerce.user_profiles where id = v_other_user_id) then
    raise exception 'D24: a rejected finalize must never create a profile';
  end if;

  -- Expiry (D24): an intent past its expires_at is rejected even though it
  -- was never consumed.
  insert into ecommerce.auth_intents (store_id, purpose, email, token_hash, expires_at)
  values (v_store_a_id, 'signup', 'expirada@example.com', encode(digest('auth-intent-check-token-expired', 'sha256'), 'hex'), now() - interval '1 minute');
  v_result := ecommerce.finalize_customer_profile(gen_random_uuid(), 'expirada@example.com', 'Expirada', 'Cliente', encode(digest('auth-intent-check-token-expired', 'sha256'), 'hex'));
  if (v_result ->> 'ok')::boolean is not false or (v_result ->> 'reason') <> 'invalid_or_expired_intent' then
    raise exception 'D24: an expired intent must be rejected, got %', v_result;
  end if;

  -- No enumeration: an unknown token gets the EXACT same generic response as
  -- the already-consumed and expired cases above.
  if ecommerce.finalize_customer_profile(gen_random_uuid(), 'nadie@example.com', 'Nadie', 'Cliente', 'not-a-real-hash')
     <> jsonb_build_object('ok', false, 'reason', 'invalid_or_expired_intent') then
    raise exception 'D24-style posture: an unknown intent token must return the same generic invalid_or_expired_intent response';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- finalize-profile-requires-service-role (live PostgREST + a real GoTrue
-- session): the grant assertion above (has_function_privilege) proved the
-- CATALOG was right while the calling code was still broken --
-- lib/auth/finalize-signup-action.ts called this RPC through the session's
-- own `authenticated`-role client, which a real PostgREST request rejected
-- with 42501. `has_function_privilege` alone can't catch that: it reads the
-- grant, it never places a call. Reproduced here the SAME way the
-- orders-grant-check block above proves its own bypass -- under SET LOCAL
-- ROLE, the exact mechanism PostgREST itself uses to enforce a resolved
-- JWT role per request, not just a privilege-catalog read.
--
-- What this DOES prove: the app's pre-fix call path (authenticated) is
-- genuinely rejected, and the app's actual call path since the fix
-- (service_role) genuinely succeeds, under real Postgres grant enforcement.
-- What this does NOT prove: that the TypeScript in
-- lib/auth/finalize-signup-action.ts actually builds and sends the request
-- as service_role (tests/security/finalize-signup-action.test.ts proves
-- that, at the mocked-client level) or that PostgREST's own JWT-to-role
-- resolution behaves the same way over a real HTTP call with a live GoTrue
-- session -- only that last mile needs a live rig against real PostgREST +
-- GoTrue.
-- -----------------------------------------------------------------------------
do $$
declare
  v_owner_id uuid := gen_random_uuid();
  v_store_id uuid;
  v_user_id uuid := gen_random_uuid();
  v_token_hash text := encode(digest('finalize-role-check-token', 'sha256'), 'hex');
  v_result jsonb;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  values
    (v_owner_id, 'finalize-role-check-owner@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated'),
    (v_user_id, 'finalize-role-check-user@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');
  insert into ecommerce.user_profiles (id, email, role) values (v_owner_id, 'finalize-role-check-owner@example.com', 'user');
  v_store_id := ecommerce.provision_store('finalize-role-check-store', 'Finalize Role Check Store', v_owner_id, 'COP');

  insert into ecommerce.auth_intents (store_id, purpose, email, token_hash, expires_at)
  values (v_store_id, 'signup', 'finalize-role-check-user@example.com', v_token_hash, now() + interval '1 hour');

  -- The exact bypass this rule closes: the app's pre-fix call path (the
  -- session's own authenticated client) must be rejected outright.
  set local role authenticated;
  begin
    perform ecommerce.finalize_customer_profile(v_user_id, 'finalize-role-check-user@example.com', 'Ana', 'Lovelace', v_token_hash);
    raise exception 'finalize-profile-requires-service-role reopened: authenticated could EXECUTE ecommerce.finalize_customer_profile directly';
  exception when insufficient_privilege then null;
  end;
  reset role;

  if exists (select 1 from ecommerce.auth_intents where token_hash = v_token_hash and consumed_at is not null) then
    raise exception 'A rejected authenticated call must never consume the intent';
  end if;

  -- The app's actual call path since this rule's fix: service_role must succeed.
  set local role service_role;
  v_result := ecommerce.finalize_customer_profile(v_user_id, 'finalize-role-check-user@example.com', 'Ana', 'Lovelace', v_token_hash);
  reset role;

  if (v_result ->> 'ok')::boolean is not true then
    raise exception 'service_role must be able to finalize a customer profile through the app''s own call path, got %', v_result;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Live-role reproduction of the store_contact SELECT contract above (same
-- reason the finalize-profile-requires-service-role block exists):
-- has_column_privilege proves the catalog is right, but only an actual query
-- under SET LOCAL ROLE proves what PostgREST's own anon role would really do
-- with it. Without 20260806000600, the very first `perform` below succeeds
-- instead of raising insufficient_privilege, because the six mailbox columns
-- are still reachable through the baseline's relation-level SELECT grant --
-- this is the exact query shape an unauthenticated PostgREST request could
-- run before that fix.
-- -----------------------------------------------------------------------------
do $$
declare
  v_owner_id uuid := gen_random_uuid();
  v_store_id uuid;
  v_contact_email text;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  values (v_owner_id, 'select-lockdown-check-owner@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');
  insert into ecommerce.user_profiles (id, email, role) values (v_owner_id, 'select-lockdown-check-owner@example.com', 'user');
  v_store_id := ecommerce.provision_store('select-lockdown-check-store', 'Select Lockdown Check Store', v_owner_id, 'COP');
  update ecommerce.stores set is_public = true where id = v_store_id;

  insert into ecommerce.store_contact (
    store_id, contact_email, contact_phone, address,
    reply_to_email, reply_to_pending_email,
    order_mailbox_email, order_mailbox_pending_email
  ) values (
    v_store_id, 'contacto@example.com', '+57 300 0000000', 'Calle Falsa 123',
    'responde@example.com', 'nueva-respuesta@example.com',
    'pedidos@example.com', 'nuevo-pedido@example.com'
  );

  set local role anon;

  begin
    perform order_mailbox_email from ecommerce.store_contact where store_id = v_store_id;
    raise exception 'store-contact-select-lockdown reopened: anon could SELECT order_mailbox_email';
  exception when insufficient_privilege then null;
  end;

  begin
    perform order_mailbox_pending_email from ecommerce.store_contact where store_id = v_store_id;
    raise exception 'store-contact-select-lockdown reopened: anon could SELECT order_mailbox_pending_email';
  exception when insufficient_privilege then null;
  end;

  begin
    perform reply_to_email from ecommerce.store_contact where store_id = v_store_id;
    raise exception 'store-contact-select-lockdown reopened: anon could SELECT reply_to_email';
  exception when insufficient_privilege then null;
  end;

  begin
    perform reply_to_pending_email from ecommerce.store_contact where store_id = v_store_id;
    raise exception 'store-contact-select-lockdown reopened: anon could SELECT reply_to_pending_email';
  exception when insufficient_privilege then null;
  end;

  select contact_email into v_contact_email from ecommerce.store_contact where store_id = v_store_id;
  if v_contact_email <> 'contacto@example.com' then
    raise exception 'anon must still be able to read the genuinely public storefront columns, got %', v_contact_email;
  end if;

  reset role;
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
  v_rejection_count integer;
  v_status text;
  v_next_attempt_at timestamptz;
  v_gen integer;
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

  -- Every mark_email_outbox_failed call below passes the CURRENT
  -- claim_generation (the fencing token claim_email_outbox_batch just
  -- minted) and asserts it returns true -- the legitimate, lease-holding
  -- path must still work under the new guard.
  perform ecommerce.claim_email_outbox_batch('worker-a', 10);
  select claim_generation into v_gen from ecommerce.email_outbox where id = v_row_c;
  if ecommerce.mark_email_outbox_failed(v_row_c, v_gen, 'boom-1', null) is not true then
    raise exception 'A worker holding the current claim_generation must still be able to mark_email_outbox_failed';
  end if;
  select attempt_count, rejection_count, status, next_attempt_at into v_attempt_count, v_rejection_count, v_status, v_next_attempt_at from ecommerce.email_outbox where id = v_row_c;
  if v_attempt_count <> 1 or v_rejection_count <> 1 or v_status <> 'pending' or v_next_attempt_at > now() + interval '2 seconds' then
    raise exception 'Failure 1 of 4 must reschedule immediately and stay pending, got attempt_count=%, rejection_count=%, status=%, delay=%s',
      v_attempt_count, v_rejection_count, v_status, extract(epoch from (v_next_attempt_at - now()));
  end if;

  update ecommerce.email_outbox set next_attempt_at = now() where id = v_row_c;
  perform ecommerce.claim_email_outbox_batch('worker-a', 10);
  select claim_generation into v_gen from ecommerce.email_outbox where id = v_row_c;
  perform ecommerce.mark_email_outbox_failed(v_row_c, v_gen, 'boom-2', null);
  select attempt_count, rejection_count, next_attempt_at into v_attempt_count, v_rejection_count, v_next_attempt_at from ecommerce.email_outbox where id = v_row_c;
  if v_attempt_count <> 2 or v_rejection_count <> 2 or abs(extract(epoch from (v_next_attempt_at - now())) - 60) > 5 then
    raise exception 'Failure 2 of 4 must reschedule ~1 minute out, got attempt_count=%, rejection_count=%, delay=%s', v_attempt_count, v_rejection_count, extract(epoch from (v_next_attempt_at - now()));
  end if;

  update ecommerce.email_outbox set next_attempt_at = now() where id = v_row_c;
  perform ecommerce.claim_email_outbox_batch('worker-a', 10);
  select claim_generation into v_gen from ecommerce.email_outbox where id = v_row_c;
  perform ecommerce.mark_email_outbox_failed(v_row_c, v_gen, 'boom-3', 'daily_quota_exceeded');
  select attempt_count, rejection_count, next_attempt_at into v_attempt_count, v_rejection_count, v_next_attempt_at from ecommerce.email_outbox where id = v_row_c;
  if v_attempt_count <> 3 or v_rejection_count <> 3 or abs(extract(epoch from (v_next_attempt_at - now())) - 300) > 5 then
    raise exception 'Failure 3 of 4 must reschedule ~5 minutes out, got attempt_count=%, rejection_count=%, delay=%s', v_attempt_count, v_rejection_count, extract(epoch from (v_next_attempt_at - now()));
  end if;

  update ecommerce.email_outbox set next_attempt_at = now() where id = v_row_c;
  perform ecommerce.claim_email_outbox_batch('worker-a', 10);
  select claim_generation into v_gen from ecommerce.email_outbox where id = v_row_c;
  perform ecommerce.mark_email_outbox_failed(v_row_c, v_gen, 'boom-4-final', 'daily_quota_exceeded');
  select attempt_count, rejection_count, status into v_attempt_count, v_rejection_count, v_status from ecommerce.email_outbox where id = v_row_c;
  if v_attempt_count <> 4 or v_rejection_count <> 4 or v_status <> 'failed' then
    raise exception 'D16/A10: the 4th genuine rejection (the third retry) must be terminal, got attempt_count=%, rejection_count=%, status=%', v_attempt_count, v_rejection_count, v_status;
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
-- The exact counter-example the verifier reproduced against real Postgres,
-- turned into a regression check: a row whose send already succeeded (the
-- state a mark_email_outbox_sent failure leaves -- claimed once, still
-- `processing`, per lib/email/outbox-worker.ts's already-fixed
-- markSentFailed path) must NEVER reach `failed`, no matter how many times
-- its lease expires and a REPLAY of the same Idempotency-Key errors
-- transiently (a Resend 5xx here, matching the repro's http_503). Without
-- this migration's mark_email_outbox_transient_failure, this fails outright
-- (undefined function); with the pre-fix mark_email_outbox_failed called
-- instead for each replay error, the row terminals `failed` on the 4th
-- claim -- exactly the corruption the verifier proved live.
-- -----------------------------------------------------------------------------
do $$
declare
  v_store_id uuid;
  v_row_id uuid;
  v_status text;
  v_attempt_count integer;
  v_rejection_count integer;
  v_last_error_code text;
  v_gen integer;
begin
  select id into v_store_id from ecommerce.stores where subdomain = 'contract-check-store';

  insert into ecommerce.email_outbox (store_id, template_kind, recipient_email, idempotency_key, from_address, subject, html_body, text_body)
  values (v_store_id, 'store-mailbox-verification', 'transient@example.com', 'idem-outbox-transient', 'Osoria <auth@mail.osoria.help>', 's', 'h', 't')
  returning id into v_row_id;

  -- Attempt 1: claimed and (per the repro) delivered by Resend -- simulated
  -- here by simply never marking it `sent`, same ambiguous state a real
  -- mark_email_outbox_sent failure leaves.
  perform ecommerce.claim_email_outbox_batch('transient-worker', 10);

  -- Three REPLAY sends of the SAME row, each erroring transiently, each
  -- reclaimed via the expired-lease path -- exactly like a worker ticking
  -- once a minute against a 2-minute lease would. Each mark_email_outbox_
  -- transient_failure call passes the CURRENT claim_generation and asserts
  -- true: the legitimate, lease-holding path still works under the fence.
  for i in 1..3 loop
    update ecommerce.email_outbox set lease_expires_at = now() - interval '1 second' where id = v_row_id;
    perform ecommerce.claim_email_outbox_batch('transient-worker', 10);
    select claim_generation into v_gen from ecommerce.email_outbox where id = v_row_id;
    if ecommerce.mark_email_outbox_transient_failure(v_row_id, v_gen, 'service unavailable', 'http_503') is not true then
      raise exception 'A worker holding the current claim_generation must still be able to mark_email_outbox_transient_failure';
    end if;
  end loop;

  select status, attempt_count, rejection_count, last_error_code
  into v_status, v_attempt_count, v_rejection_count, v_last_error_code
  from ecommerce.email_outbox where id = v_row_id;

  if v_status <> 'processing' then
    raise exception 'D16/A10: a row whose send already succeeded must never reach failed after transient replay noise, got status=%', v_status;
  end if;
  if v_rejection_count <> 0 then
    raise exception 'D16/A10: transient replay failures must never advance the genuine-rejection ladder, got rejection_count=%', v_rejection_count;
  end if;
  if v_attempt_count <> 4 then
    raise exception 'Expected 4 total claims (1 original + 3 reclaims) on attempt_count, got %', v_attempt_count;
  end if;
  if v_last_error_code <> 'http_503' then
    raise exception 'D36: the transient failure''s error code must stay visible on the row, got %', v_last_error_code;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- The ladder's other half: transient noise must never let a GENUINELY
-- rejected send skip attempts either. Two transient replay failures
-- interleaved with four real ones must still take exactly four genuine
-- rejections to terminal -- never fewer just because attempt_count (bumped
-- by every claim, transient or not) raced ahead of rejection_count.
-- -----------------------------------------------------------------------------
do $$
declare
  v_store_id uuid;
  v_row_id uuid;
  v_status text;
  v_rejection_count integer;
  v_gen integer;
begin
  select id into v_store_id from ecommerce.stores where subdomain = 'contract-check-store';

  insert into ecommerce.email_outbox (store_id, template_kind, recipient_email, idempotency_key, from_address, subject, html_body, text_body)
  values (v_store_id, 'store-mailbox-verification', 'mixed@example.com', 'idem-outbox-mixed', 'Osoria <auth@mail.osoria.help>', 's', 'h', 't')
  returning id into v_row_id;

  -- Two transient replay failures first (never touching rejection_count).
  perform ecommerce.claim_email_outbox_batch('mixed-worker', 10);
  select claim_generation into v_gen from ecommerce.email_outbox where id = v_row_id;
  perform ecommerce.mark_email_outbox_transient_failure(v_row_id, v_gen, 'timeout', 'network_error');

  update ecommerce.email_outbox set lease_expires_at = now() - interval '1 second' where id = v_row_id;
  perform ecommerce.claim_email_outbox_batch('mixed-worker', 10);
  select claim_generation into v_gen from ecommerce.email_outbox where id = v_row_id;
  perform ecommerce.mark_email_outbox_transient_failure(v_row_id, v_gen, 'timeout', 'network_error');

  -- Now four genuine rejections in a row -- must take all four to terminal.
  for i in 1..4 loop
    update ecommerce.email_outbox set lease_expires_at = now() - interval '1 second', next_attempt_at = now() where id = v_row_id;
    perform ecommerce.claim_email_outbox_batch('mixed-worker', 10);
    select claim_generation into v_gen from ecommerce.email_outbox where id = v_row_id;
    perform ecommerce.mark_email_outbox_failed(v_row_id, v_gen, 'invalid recipient', 'validation_error');

    select status, rejection_count into v_status, v_rejection_count from ecommerce.email_outbox where id = v_row_id;
    if i < 4 and v_status = 'failed' then
      raise exception 'D16/A10: transient noise must never shorten the four-attempt ladder -- terminal after only % genuine rejection(s)', i;
    end if;
  end loop;

  if v_status <> 'failed' or v_rejection_count <> 4 then
    raise exception 'Expected exactly 4 genuine rejections to terminal-fail the row despite the transient noise, got status=%, rejection_count=%', v_status, v_rejection_count;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- The race a second verifier pass reproduced against real Postgres (once
-- forcing timestamps in one session, once across four genuinely separate
-- psql connections to rule out a single-transaction artifact): none of the
-- three mark_email_outbox_* functions guarded their UPDATE against the
-- caller still holding the CURRENT claim. In production each RPC call
-- commits on its own (PostgREST invokes claim/send/mark separately, no
-- transaction spans them) and lib/email/outbox-worker.ts sends over plain
-- HTTP with no timeout tied to the 2-minute lease -- so a worker whose
-- Resend call outlives its lease can have its STALE response resolve after
-- a second worker already reclaimed, sent and marked the row `sent`.
-- Reproduced here: worker-a claims (generation 1), its lease is
-- force-expired before it ever marks anything, worker-b reclaims
-- (generation 2, proven distinct from generation 1 below) and marks the row
-- sent -- then worker-a's stale response FINALLY arrives and tries to mark
-- it failed, still carrying generation 1. That must no-op: the row must
-- stay `sent`, with its real provider_message_id, rejection_count and
-- last_error_code completely untouched.
-- -----------------------------------------------------------------------------
do $$
declare
  v_store_id uuid;
  v_row_id uuid;
  v_gen_a integer;
  v_gen_b integer;
  v_status text;
  v_provider_message_id text;
  v_rejection_count integer;
  v_last_error_code text;
  v_applied boolean;
begin
  select id into v_store_id from ecommerce.stores where subdomain = 'contract-check-store';

  insert into ecommerce.email_outbox (store_id, template_kind, recipient_email, idempotency_key, from_address, subject, html_body, text_body)
  values (v_store_id, 'store-mailbox-verification', 'race-sent@example.com', 'idem-outbox-race-sent', 'Osoria <auth@mail.osoria.help>', 's', 'h', 't')
  returning id into v_row_id;

  -- worker-a claims first -- generation 1. Its send is imagined to be still
  -- in flight against Resend when its lease expires below.
  perform ecommerce.claim_email_outbox_batch('worker-a', 10);
  select claim_generation into v_gen_a from ecommerce.email_outbox where id = v_row_id;

  -- worker-a's lease expires (Resend degradation, no client-side timeout)
  -- before it ever marks anything -- worker-b reclaims.
  update ecommerce.email_outbox set lease_expires_at = now() - interval '1 second' where id = v_row_id;
  perform ecommerce.claim_email_outbox_batch('worker-b', 10);
  select claim_generation into v_gen_b from ecommerce.email_outbox where id = v_row_id;
  if v_gen_b = v_gen_a then
    raise exception 'worker-b''s reclaim must mint a NEW claim_generation, still got %', v_gen_b;
  end if;

  -- worker-b's send genuinely succeeds and marks the row sent -- the
  -- legitimate, current-generation path must still work.
  v_applied := ecommerce.mark_email_outbox_sent(v_row_id, 'resend-msg-race-1', v_gen_b);
  if v_applied is not true then
    raise exception 'worker-b holds the current claim_generation and must be able to mark_email_outbox_sent';
  end if;

  -- worker-a's STALE response finally resolves and tries to mark the SAME
  -- row failed, still carrying its now-superseded generation 1. This must
  -- be rejected outright -- the row already has a real Resend delivery.
  v_applied := ecommerce.mark_email_outbox_failed(v_row_id, v_gen_a, 'stale timeout', 'http_503');
  if v_applied is not false then
    raise exception 'A stale mark_email_outbox_failed (superseded claim_generation) must be rejected, not applied';
  end if;

  select status, provider_message_id, rejection_count, last_error_code
  into v_status, v_provider_message_id, v_rejection_count, v_last_error_code
  from ecommerce.email_outbox where id = v_row_id;

  if v_status <> 'sent' then
    raise exception 'The race: a stale mark_email_outbox_failed must never flip an already-sent row, got status=%', v_status;
  end if;
  if v_provider_message_id <> 'resend-msg-race-1' then
    raise exception 'The genuine Resend delivery''s provider_message_id must survive a stale competing write, got %', v_provider_message_id;
  end if;
  if v_rejection_count <> 0 then
    raise exception 'A rejected stale write must never advance rejection_count, got %', v_rejection_count;
  end if;
  if v_last_error_code is not null then
    raise exception 'A rejected stale write must never poison last_error_code on an already-sent row, got %', v_last_error_code;
  end if;
end $$;

-- Same race, the other mark function: a stale mark_email_outbox_transient_
-- failure must not poison last_error_code (D36) on a row a NEWER generation
-- already finalized -- and must not move it off `sent` either.
do $$
declare
  v_store_id uuid;
  v_row_id uuid;
  v_gen_a integer;
  v_gen_b integer;
  v_status text;
  v_last_error_code text;
  v_applied boolean;
begin
  select id into v_store_id from ecommerce.stores where subdomain = 'contract-check-store';

  insert into ecommerce.email_outbox (store_id, template_kind, recipient_email, idempotency_key, from_address, subject, html_body, text_body)
  values (v_store_id, 'store-mailbox-verification', 'race-transient@example.com', 'idem-outbox-race-transient', 'Osoria <auth@mail.osoria.help>', 's', 'h', 't')
  returning id into v_row_id;

  perform ecommerce.claim_email_outbox_batch('worker-a', 10);
  select claim_generation into v_gen_a from ecommerce.email_outbox where id = v_row_id;

  update ecommerce.email_outbox set lease_expires_at = now() - interval '1 second' where id = v_row_id;
  perform ecommerce.claim_email_outbox_batch('worker-b', 10);
  select claim_generation into v_gen_b from ecommerce.email_outbox where id = v_row_id;

  v_applied := ecommerce.mark_email_outbox_sent(v_row_id, 'resend-msg-race-2', v_gen_b);
  if v_applied is not true then
    raise exception 'worker-b holds the current claim_generation and must be able to mark_email_outbox_sent';
  end if;

  v_applied := ecommerce.mark_email_outbox_transient_failure(v_row_id, v_gen_a, 'stale timeout', 'http_503');
  if v_applied is not false then
    raise exception 'A stale mark_email_outbox_transient_failure (superseded claim_generation) must be rejected, not applied';
  end if;

  select status, last_error_code into v_status, v_last_error_code from ecommerce.email_outbox where id = v_row_id;
  if v_status <> 'sent' then
    raise exception 'The race: a stale mark_email_outbox_transient_failure must never move an already-sent row off sent, got status=%', v_status;
  end if;
  if v_last_error_code is not null then
    raise exception 'D36: a rejected stale write must never poison last_error_code on an already-sent row, got %', v_last_error_code;
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
-- merchant-notification-optional: the merchant notification is OPTIONAL
-- during D31's pre-enforcement window, but only in a checkable shape --
-- always exactly one order-received, at most one merchant-new-order, nothing
-- else. See 20260805000600_ecommerce_checkout_optional_merchant_notification.sql.
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
      'idempotencyKey', 'checkout:' || v_store_id::text || ':merchant-notification-optional-receipt-only:order-received'
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
    v_store_id, 'merchant-notification-optional-receipt-only', 'fp-receipt-only', v_order, v_items, v_receipt_only
  );
  if (v_result ->> 'ok')::boolean is not true then
    raise exception 'merchant-notification-optional: a single order-received notification must be accepted, got %', v_result;
  end if;

  select count(*) into v_outbox_count from ecommerce.email_outbox
  where idempotency_key like 'checkout:' || v_store_id::text || ':merchant-notification-optional-receipt-only:%';
  if v_outbox_count <> 1 then
    raise exception 'merchant-notification-optional: expected exactly one outbox row for the receipt-only order, got %', v_outbox_count;
  end if;

  -- Every OTHER shape the RPC must still reject, one at a time -- checkable
  -- by structure, never "one or two, whatever".
  begin
    perform ecommerce.create_order_with_notifications(
      v_store_id, 'merchant-notification-optional-zero-receipts', 'fp-zero-receipts',
      v_order || jsonb_build_object('order_number', ecommerce.generate_order_number(v_store_id)),
      v_items, '[]'::jsonb
    );
    raise exception 'merchant-notification-optional: zero notifications must raise';
  exception when others then null;
  end;

  begin
    perform ecommerce.create_order_with_notifications(
      v_store_id, 'merchant-notification-optional-no-receipt', 'fp-no-receipt',
      v_order || jsonb_build_object('order_number', ecommerce.generate_order_number(v_store_id)),
      v_items,
      jsonb_build_array(jsonb_build_object(
        'templateKind', 'merchant-new-order', 'recipientEmail', 'tienda@example.com',
        'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
        'idempotencyKey', 'checkout:' || v_store_id::text || ':merchant-notification-optional-no-receipt:merchant-new-order'
      ))
    );
    raise exception 'merchant-notification-optional: a merchant notification with NO order-received must raise';
  exception when others then null;
  end;

  begin
    perform ecommerce.create_order_with_notifications(
      v_store_id, 'merchant-notification-optional-two-receipts', 'fp-two-receipts',
      v_order || jsonb_build_object('order_number', ecommerce.generate_order_number(v_store_id)),
      v_items,
      jsonb_build_array(
        jsonb_build_object(
          'templateKind', 'order-received', 'recipientEmail', 'a@example.com',
          'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
          'idempotencyKey', 'checkout:' || v_store_id::text || ':merchant-notification-optional-two-receipts:order-received-1'
        ),
        jsonb_build_object(
          'templateKind', 'order-received', 'recipientEmail', 'b@example.com',
          'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
          'idempotencyKey', 'checkout:' || v_store_id::text || ':merchant-notification-optional-two-receipts:order-received-2'
        )
      )
    );
    raise exception 'merchant-notification-optional: two order-received notifications must raise';
  exception when others then null;
  end;

  begin
    perform ecommerce.create_order_with_notifications(
      v_store_id, 'merchant-notification-optional-two-merchants', 'fp-two-merchants',
      v_order || jsonb_build_object('order_number', ecommerce.generate_order_number(v_store_id)),
      v_items,
      jsonb_build_array(
        jsonb_build_object(
          'templateKind', 'order-received', 'recipientEmail', 'a@example.com',
          'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
          'idempotencyKey', 'checkout:' || v_store_id::text || ':merchant-notification-optional-two-merchants:order-received'
        ),
        jsonb_build_object(
          'templateKind', 'merchant-new-order', 'recipientEmail', 'b@example.com',
          'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
          'idempotencyKey', 'checkout:' || v_store_id::text || ':merchant-notification-optional-two-merchants:merchant-1'
        ),
        jsonb_build_object(
          'templateKind', 'merchant-new-order', 'recipientEmail', 'c@example.com',
          'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
          'idempotencyKey', 'checkout:' || v_store_id::text || ':merchant-notification-optional-two-merchants:merchant-2'
        )
      )
    );
    raise exception 'merchant-notification-optional: two merchant-new-order notifications must raise';
  exception when others then null;
  end;

  begin
    perform ecommerce.create_order_with_notifications(
      v_store_id, 'merchant-notification-optional-unknown-kind', 'fp-unknown-kind',
      v_order || jsonb_build_object('order_number', ecommerce.generate_order_number(v_store_id)),
      v_items,
      jsonb_build_array(
        jsonb_build_object(
          'templateKind', 'order-received', 'recipientEmail', 'a@example.com',
          'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
          'idempotencyKey', 'checkout:' || v_store_id::text || ':merchant-notification-optional-unknown-kind:order-received'
        ),
        jsonb_build_object(
          'templateKind', 'something-else', 'recipientEmail', 'b@example.com',
          'fromAddress', 'x', 'replyToAddress', null, 'subject', 's', 'htmlBody', 'h', 'textBody', 't',
          'idempotencyKey', 'checkout:' || v_store_id::text || ':merchant-notification-optional-unknown-kind:other'
        )
      )
    );
    raise exception 'merchant-notification-optional: an unrecognized templateKind must raise';
  exception when others then null;
  end;

  -- None of the five rejected shapes above may have left an order behind:
  -- each one raises before the header is ever inserted.
  if exists (
    select 1 from ecommerce.orders
    where store_id = v_store_id
      and idempotency_key in (
        'merchant-notification-optional-zero-receipts', 'merchant-notification-optional-no-receipt',
        'merchant-notification-optional-two-receipts', 'merchant-notification-optional-two-merchants',
        'merchant-notification-optional-unknown-kind'
      )
  ) then
    raise exception 'merchant-notification-optional: a rejected notification shape must never leave an order behind';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- checkout-followups-converge: the checkout follow-ups that run after the
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
    (v_store_id, 'Checkout Followup Widget', 10000, 'COP', true, 5, true, true)
  returning id into v_item_id;

  v_order := jsonb_build_object(
    'customer_type', 'guest', 'customer_email', 'checkout-followup@example.com',
    'customer_first_name', 'Ada', 'customer_last_name', 'Lovelace',
    'shipping_address', 'Calle 789', 'shipping_city', 'Bogotá', 'shipping_postal_code', '110111',
    'payment_method', 'cash_on_delivery', 'subtotal', 20000, 'total_amount', 20000,
    'order_number', ecommerce.generate_order_number(v_store_id)
  );
  v_items := jsonb_build_array(
    jsonb_build_object(
      'product_id', v_item_id::text, 'product_name', 'Checkout Followup Widget',
      'unit_price', 10000, 'quantity', 2, 'total_price', 20000
    )
  );
  v_notifications := jsonb_build_array(
    jsonb_build_object(
      'templateKind', 'order-received', 'recipientEmail', 'checkout-followup@example.com',
      'fromAddress', 'Contract Check Store vía Osoria <pedidos@mail.osoria.help>', 'replyToAddress', null,
      'subject', 'Recibimos tu pedido', 'htmlBody', '<p>h</p>', 'textBody', 't',
      'idempotencyKey', 'checkout:' || v_store_id::text || ':checkout-followup-order:order-received'
    )
  );

  v_result := ecommerce.create_order_with_notifications(
    v_store_id, 'checkout-followup-order', 'fp-checkout-followup', v_order, v_items, v_notifications
  );
  if (v_result ->> 'ok')::boolean is not true then
    raise exception 'checkout-followups-converge setup: expected the order to be created, got %', v_result;
  end if;
  v_order_id := (v_result -> 'order' ->> 'id')::uuid;

  v_decrement_items := jsonb_build_array(
    jsonb_build_object('variant_id', null, 'product_id', v_item_id::text, 'quantity', 2)
  );

  -- First follow-up attempt: genuinely decrements (5 -> 3).
  select ecommerce.decrement_inventory(v_order_id, v_store_id, v_decrement_items) into v_shortages;
  select inventory_quantity into v_quantity_after from ecommerce.store_items where id = v_item_id;
  if v_quantity_after <> 3 or jsonb_array_length(v_shortages) <> 0 then
    raise exception 'checkout-followups-converge: first decrement must take inventory from 5 to 3 with no shortages, got quantity=%, shortages=%', v_quantity_after, v_shortages;
  end if;

  if not exists (select 1 from ecommerce.orders where id = v_order_id and inventory_decremented_at is not null) then
    raise exception 'checkout-followups-converge: inventory_decremented_at must be set after the first successful decrement';
  end if;

  -- Retried follow-up (e.g. the customer's page reload after the first
  -- attempt died right after the atomic RPC succeeded, before this ran):
  -- same order, same items. Must NOT decrement a second time.
  select ecommerce.decrement_inventory(v_order_id, v_store_id, v_decrement_items) into v_shortages;
  select inventory_quantity into v_quantity_after from ecommerce.store_items where id = v_item_id;
  if v_quantity_after <> 3 then
    raise exception 'checkout-followups-converge: a retried decrement for the SAME order must never decrement twice, inventory is now % (expected 3, unchanged)', v_quantity_after;
  end if;
  if jsonb_array_length(v_shortages) <> 0 then
    raise exception 'checkout-followups-converge: a retried, already-decremented order must report no shortages, got %', v_shortages;
  end if;

  -- A plain double-submit (no failure in between, just a second call) must
  -- converge identically: still exactly one decrement.
  perform ecommerce.decrement_inventory(v_order_id, v_store_id, v_decrement_items);
  select inventory_quantity into v_quantity_after from ecommerce.store_items where id = v_item_id;
  if v_quantity_after <> 3 then
    raise exception 'checkout-followups-converge: a third call (double-submit) must still never decrement twice, inventory is now %', v_quantity_after;
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
    raise exception 'checkout-followups-converge: a retried shipping address upsert must converge to exactly one row, found %', v_address_count;
  end if;

  -- Payment transaction: the SAME idempotency_key (the checkout's own,
  -- reused across a retry) must converge to exactly one row too.
  insert into ecommerce.payment_transactions (id, order_id, idempotency_key, provider, transaction_type, amount, currency_code, status)
  values (gen_random_uuid(), v_order_id, 'checkout-followup-order', 'cash_on_delivery', 'payment', 20000, 'COP', 'pending')
  on conflict (idempotency_key) do nothing;
  insert into ecommerce.payment_transactions (id, order_id, idempotency_key, provider, transaction_type, amount, currency_code, status)
  values (gen_random_uuid(), v_order_id, 'checkout-followup-order', 'cash_on_delivery', 'payment', 20000, 'COP', 'pending')
  on conflict (idempotency_key) do nothing;

  select count(*) into v_payment_count from ecommerce.payment_transactions where order_id = v_order_id;
  if v_payment_count <> 1 then
    raise exception 'checkout-followups-converge: a retried payment_transactions upsert must converge to exactly one row, found %', v_payment_count;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- ecommerce.transition_order_status -- the frozen D29 graph
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

-- -----------------------------------------------------------------------------
-- The exact bypass a direct authenticated UPDATE could attempt, reproduced
-- under the SAME role a real PostgREST request runs as (SET LOCAL ROLE
-- authenticated + the session's own
-- auth.uid() via request.jwt.claim.sub), not just a privilege-catalog check.
-- A genuine store owner -- can_manage_store(v_store_id) true, RLS's row check
-- would let the write through -- can no longer reach status or any lifecycle
-- timestamp with a direct UPDATE; only ecommerce.transition_order_status can
-- move them, and it still works for service_role, the only role granted
-- EXECUTE on it.
-- -----------------------------------------------------------------------------
do $$
declare
  v_owner_id uuid := gen_random_uuid();
  v_store_id uuid;
  v_order_id uuid;
  v_status text;
  v_col text;
  v_result jsonb;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  values (v_owner_id, 'orders-grant-check-owner@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');
  insert into ecommerce.user_profiles (id, email, role) values (v_owner_id, 'orders-grant-check-owner@example.com', 'user');
  v_store_id := ecommerce.provision_store('orders-grant-check-store', 'Orders Grant Check Store', v_owner_id, 'COP');

  insert into ecommerce.orders (
    store_id, order_number, customer_type, customer_email, customer_first_name, customer_last_name,
    shipping_address, shipping_city, shipping_postal_code, subtotal, total_amount, status
  ) values (
    v_store_id, ecommerce.generate_order_number(v_store_id), 'guest', 'buyer@example.com', 'Ada', 'Lovelace',
    'Calle 1', 'Bogotá', '110111', 10000, 10000, 'pending'
  ) returning id into v_order_id;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', v_owner_id::text, true);

  if not ecommerce.can_manage_store(v_store_id) then
    raise exception 'Fixture broken: the checked-in owner must manage the store for this to prove anything';
  end if;

  begin
    update ecommerce.orders set status = 'delivered' where id = v_order_id and store_id = v_store_id;
    raise exception 'Bypass reopened: authenticated could UPDATE ecommerce.orders.status directly';
  exception when insufficient_privilege then null;
  end;

  foreach v_col in array array['confirmed_at', 'shipped_at', 'delivered_at', 'cancelled_at'] loop
    begin
      execute format('update ecommerce.orders set %I = now() where id = $1 and store_id = $2', v_col)
        using v_order_id, v_store_id;
      raise exception 'Bypass reopened: authenticated could UPDATE ecommerce.orders.%', v_col;
    exception when insufficient_privilege then null;
    end;
  end loop;

  select status into v_status from ecommerce.orders where id = v_order_id;
  if v_status <> 'pending' then
    raise exception 'A rejected direct UPDATE must never change ecommerce.orders.status, got %', v_status;
  end if;

  -- The revoke is narrow, not a blunt lockout: a column that stays granted
  -- (notes is not one of the five) is still writable directly.
  update ecommerce.orders set notes = 'orders-grant-check: authenticated can still edit notes directly'
  where id = v_order_id and store_id = v_store_id;
  if not found then
    raise exception 'A legitimate authenticated write to a column that remains granted must still succeed';
  end if;

  reset role;

  -- The legitimate path stays open: service_role can still transition the
  -- SAME order through the frozen graph, exactly as before this migration.
  set local role service_role;
  v_result := ecommerce.transition_order_status(v_order_id, v_store_id, v_owner_id, 'confirmed');
  if (v_result ->> 'ok')::boolean is not true then
    raise exception 'service_role must still be able to transition orders through the locked function, got %', v_result;
  end if;

  select status into v_status from ecommerce.orders where id = v_order_id;
  if v_status <> 'confirmed' then
    raise exception 'transition_order_status must still persist the new status for service_role, got %', v_status;
  end if;

  reset role;
end $$;

-- -----------------------------------------------------------------------------
-- D20's store-shell path. A null owner creates the store alone; a
-- real owner keeps the ORIGINAL atomic behavior exactly (regression guard for
-- every existing caller, including this file's own fixtures above).
-- -----------------------------------------------------------------------------
do $$
declare
  v_owner_id uuid := gen_random_uuid();
  v_shell_store_id uuid;
  v_owned_store_id uuid;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  values (v_owner_id, 'store-shell-check-owner@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');
  insert into ecommerce.user_profiles (id, email, role) values (v_owner_id, 'store-shell-check-owner@example.com', 'user');

  v_shell_store_id := ecommerce.provision_store('store-shell-check', 'Store Shell Check', null, 'COP');
  if v_shell_store_id is null then
    raise exception 'D20: provision_store with a null owner must still create the store';
  end if;
  if exists (select 1 from ecommerce.store_users where store_id = v_shell_store_id) then
    raise exception 'D20: a null-owner provision_store must leave zero store_users rows';
  end if;
  if exists (select 1 from ecommerce.roles where store_id = v_shell_store_id) then
    raise exception 'D20: a null-owner provision_store must leave zero roles rows';
  end if;

  v_owned_store_id := ecommerce.provision_store('store-shell-check-owned', 'Store Shell Check Owned', v_owner_id, 'COP');
  if not exists (
    select 1 from ecommerce.store_users su
    join ecommerce.store_user_roles sur on sur.store_user_id = su.id
    join ecommerce.roles r on r.id = sur.role_id
    where su.store_id = v_owned_store_id and su.user_id = v_owner_id and r.role_name = 'owner'
  ) then
    raise exception 'D20 regression: a real owner must still get immediate ownership from provision_store, unchanged';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- D20/D21/D24/D25's owner and membership invitations --
-- ecommerce.find_auth_user_id_by_email, request_membership_invite and
-- accept_membership_invite. Every guarantee only a real Postgres
-- role/transaction boundary can prove:
-- authorization, D25's reused rate limit, token integrity/expiry/single-use,
-- the intended-user binding (a different authenticated user gains nothing),
-- and no-enumeration.
-- -----------------------------------------------------------------------------
do $$
declare
  v_owner_id uuid := gen_random_uuid();
  v_store_id uuid;
  v_member_id uuid := gen_random_uuid();
  v_other_id uuid := gen_random_uuid();
  v_token_hash text := encode(digest('membership-invite-check-token-1', 'sha256'), 'hex');
  v_second_hash text := encode(digest('membership-invite-check-token-2', 'sha256'), 'hex');
  v_result jsonb;
  v_expires_at timestamptz;
  v_created_at timestamptz;
  v_outbox_count integer;
  v_role_name text;
  v_membership_count integer;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  values
    (v_owner_id, 'membership-invite-owner@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated'),
    (v_member_id, 'membership-invite-member@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated'),
    (v_other_id, 'membership-invite-other@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');
  insert into ecommerce.user_profiles (id, email, role) values (v_owner_id, 'membership-invite-owner@example.com', 'user');
  v_store_id := ecommerce.provision_store('membership-invite-check-store', 'Membership Invite Check Store', v_owner_id, 'COP');

  -- D20/D21's fork point: resolves an existing email case-insensitively,
  -- returns null for one that exists nowhere in this project's auth.users.
  if ecommerce.find_auth_user_id_by_email('Membership-Invite-Member@Example.com') <> v_member_id then
    raise exception 'D20/D21: find_auth_user_id_by_email must resolve an existing email case-insensitively';
  end if;
  if ecommerce.find_auth_user_id_by_email('nadie-nunca-membership-invite@example.com') is not null then
    raise exception 'D20/D21: find_auth_user_id_by_email must return null for an unknown email';
  end if;

  -- D30: an outsider who does not manage the store can never mint a
  -- membership invite into it, regardless of role validity.
  v_result := ecommerce.request_membership_invite(
    v_other_id, v_store_id, v_member_id, 'membership-invite-member@example.com', 'admin', v_token_hash,
    'Osoria <auth@mail.osoria.help>', 'subj', '<p>h</p>', 't', 'idem-mi-unauthorized'
  );
  if (v_result ->> 'ok')::boolean is not false or v_result ->> 'reason' <> 'not_authorized' then
    raise exception 'D30: a caller who does not manage the store must never mint a membership invite, got %', v_result;
  end if;

  -- Defense in depth (D30), same posture as request_store_mailbox_verification's
  -- own field check: an unrecognized role is rejected even for an authorized actor.
  v_result := ecommerce.request_membership_invite(
    v_owner_id, v_store_id, v_member_id, 'membership-invite-member@example.com', 'super_admin', v_token_hash,
    'Osoria <auth@mail.osoria.help>', 'subj', '<p>h</p>', 't', 'idem-mi-badrole'
  );
  if (v_result ->> 'ok')::boolean is not false or v_result ->> 'reason' <> 'invalid_role' then
    raise exception 'D21: an unrecognized role must be rejected as invalid_role, got %', v_result;
  end if;

  -- Happy path: the authorized owner invites a real, already-existing identity.
  v_result := ecommerce.request_membership_invite(
    v_owner_id, v_store_id, v_member_id, 'membership-invite-member@example.com', 'admin', v_token_hash,
    'Osoria <auth@mail.osoria.help>', 'Te invitaron', '<p>h</p>', 't', 'idem-mi-1'
  );
  if (v_result ->> 'ok')::boolean is not true then
    raise exception 'Expected the authorized owner''s invite to succeed, got %', v_result;
  end if;

  select expires_at, created_at, role_name into v_expires_at, v_created_at, v_role_name
  from ecommerce.pending_membership_invites where token_hash = v_token_hash;
  if v_expires_at is null or abs(extract(epoch from (v_expires_at - v_created_at)) - 3600) > 5 then
    raise exception 'D24: a membership invite must expire exactly one hour after creation, got a % second window', extract(epoch from (v_expires_at - v_created_at));
  end if;
  if v_role_name <> 'admin' then
    raise exception 'Expected the invite to record the requested role, got %', v_role_name;
  end if;

  select count(*) into v_outbox_count from ecommerce.email_outbox
  where idempotency_key = 'idem-mi-1' and template_kind = 'membership-acceptance';
  if v_outbox_count <> 1 then
    raise exception 'D11/D13: expected exactly one membership-acceptance outbox row, got %', v_outbox_count;
  end if;

  -- D25 rate limit, part 1: a second invite for the same store x purpose x
  -- recipient inside 60 seconds is rejected, even with a fresh token.
  v_result := ecommerce.request_membership_invite(
    v_owner_id, v_store_id, v_member_id, 'membership-invite-member@example.com', 'admin', v_second_hash,
    'Osoria <auth@mail.osoria.help>', 'subj', '<p>h</p>', 't', 'idem-mi-2'
  );
  if v_result ->> 'reason' <> 'rate_limited' then
    raise exception 'D25: a second membership invite inside 60 seconds must be rate_limited, got %', v_result;
  end if;

  -- D25 rate limit, part 2: back-date the cooldown but leave 5 attempts
  -- already logged in the last hour -- the 6th must still be rejected.
  update ecommerce.email_send_attempts set created_at = now() - interval '2 minutes'
  where store_id = v_store_id and purpose = 'membership_invite';
  insert into ecommerce.email_send_attempts (store_id, purpose, recipient_email, created_at)
  select v_store_id, 'membership_invite', 'membership-invite-member@example.com', now() - interval '2 minutes'
  from generate_series(1, 4);

  if ecommerce.check_and_record_send_attempt(v_store_id, 'membership_invite', 'membership-invite-member@example.com') is not false then
    raise exception 'D25: a 6th membership invite send inside one hour must be rejected by the hourly cap';
  end if;

  -- D21's load-bearing guarantee: a DIFFERENT authenticated user holding the
  -- SAME link gains nothing, rejected with the exact same generic reason an
  -- unknown token gets (no enumeration).
  v_result := ecommerce.accept_membership_invite(v_other_id, v_token_hash);
  if (v_result ->> 'ok')::boolean is not false or (v_result ->> 'reason') <> 'invalid_or_expired' then
    raise exception 'D21: a different authenticated user must never accept someone else''s invite, got %', v_result;
  end if;
  if exists (select 1 from ecommerce.store_users where store_id = v_store_id and user_id = v_other_id) then
    raise exception 'D21: a rejected accept must never create a membership for the wrong user';
  end if;

  -- Happy path: the intended user accepts and is granted exactly the invited role.
  v_result := ecommerce.accept_membership_invite(v_member_id, v_token_hash);
  if (v_result ->> 'ok')::boolean is not true then
    raise exception 'Expected the intended user''s accept to succeed, got %', v_result;
  end if;
  if not exists (
    select 1 from ecommerce.store_users su
    join ecommerce.store_user_roles sur on sur.store_user_id = su.id
    join ecommerce.roles r on r.id = sur.role_id
    where su.store_id = v_store_id and su.user_id = v_member_id and r.role_name = 'admin'
  ) then
    raise exception 'D21: accepting must grant exactly the invited role';
  end if;
  if not exists (select 1 from ecommerce.user_profiles where id = v_member_id) then
    raise exception 'D21: accepting must seed an ecommerce.user_profiles row for an identity that had none (the FK store_users.user_id -> user_profiles(id) demands it)';
  end if;

  -- Single-use, independent of the intended-user check above: a second
  -- accept of the SAME already-consumed token must fail and never create a
  -- second membership row.
  v_result := ecommerce.accept_membership_invite(v_member_id, v_token_hash);
  if (v_result ->> 'ok')::boolean is not false then
    raise exception 'D21: a consumed membership invite must never accept a second time, got %', v_result;
  end if;

  select count(*) into v_membership_count from ecommerce.store_users where store_id = v_store_id and user_id = v_member_id;
  if v_membership_count <> 1 then
    raise exception 'D21: a replayed accept must never create a second membership row, found %', v_membership_count;
  end if;

  -- Expiry (D24): an invite past its expires_at is rejected even though it
  -- was never consumed.
  insert into ecommerce.pending_membership_invites (store_id, intended_user_id, email, role_name, token_hash, expires_at)
  values (
    v_store_id, v_member_id, 'membership-invite-member@example.com', 'admin',
    encode(digest('membership-invite-check-token-expired', 'sha256'), 'hex'), now() - interval '1 minute'
  );
  v_result := ecommerce.accept_membership_invite(v_member_id, encode(digest('membership-invite-check-token-expired', 'sha256'), 'hex'));
  if (v_result ->> 'ok')::boolean is not false or (v_result ->> 'reason') <> 'invalid_or_expired' then
    raise exception 'D24: an expired membership invite must be rejected, got %', v_result;
  end if;

  -- No enumeration: an unknown token gets the EXACT same generic response as
  -- the wrong-user and expired cases above.
  if ecommerce.accept_membership_invite(gen_random_uuid(), 'not-a-real-membership-invite-hash') <> jsonb_build_object('ok', false, 'reason', 'invalid_or_expired') then
    raise exception 'D24-style posture: an unknown membership invite token must return the same generic invalid_or_expired response';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- D24, parallel to the sibling fix on the D20 native-invite path:
-- request_membership_invite's OWN internal check_and_record_send_attempt
-- call can fail on its own terms (lock timeout, broken grant, any other
-- runtime error) rather than reporting the limit was hit -- that must return
-- the distinct, non-enumerable rate_limit_check_failed reason instead of
-- unwinding the whole call as a raw error. Simulated by temporarily
-- replacing check_and_record_send_attempt so it always raises -- reverted
-- via ROLLBACK TO SAVEPOINT immediately after, so every other block in this
-- file (before and after) keeps the REAL function.
-- -----------------------------------------------------------------------------
savepoint before_broken_send_attempt_limiter;

create or replace function ecommerce.check_and_record_send_attempt(
  p_store_id uuid,
  p_purpose text,
  p_recipient_email text
)
returns boolean
language plpgsql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
begin
  raise exception 'simulated check_and_record_send_attempt outage';
end;
$$;

do $$
declare
  v_owner_id uuid;
  v_store_id uuid;
  v_member_id uuid;
  v_result jsonb;
  v_token_hash text := encode(digest('membership-invite-check-token-limiter-outage', 'sha256'), 'hex');
begin
  select id into v_owner_id from auth.users where email = 'membership-invite-owner@example.com';
  select id into v_store_id from ecommerce.stores where subdomain = 'membership-invite-check-store';
  select id into v_member_id from auth.users where email = 'membership-invite-member@example.com';

  v_result := ecommerce.request_membership_invite(
    v_owner_id, v_store_id, v_member_id, 'membership-invite-member@example.com', 'admin', v_token_hash,
    'Osoria <auth@mail.osoria.help>', 'subj', '<p>h</p>', 't', 'idem-mi-limiter-outage'
  );
  if (v_result ->> 'ok')::boolean is not false or v_result ->> 'reason' <> 'rate_limit_check_failed' then
    raise exception 'D24: a check_and_record_send_attempt failure inside request_membership_invite must return rate_limit_check_failed, not bubble up as a raw error, got %', v_result;
  end if;

  if exists (select 1 from ecommerce.pending_membership_invites where token_hash = v_token_hash) then
    raise exception 'D24: a failed-closed limiter check must never mint a pending invite';
  end if;
end $$;

rollback to savepoint before_broken_send_attempt_limiter;

-- -----------------------------------------------------------------------------
-- Role boundary: the grant assertions above prove the CATALOG is
-- right; this reproduces the same bypass mechanism (SET LOCAL ROLE,
-- what PostgREST itself uses per request) to prove the ROLE the app actually
-- calls through (service_role) is the only one that can -- same pattern as
-- the finalize_customer_profile and transition_order_status reproductions
-- above.
-- -----------------------------------------------------------------------------
do $$
declare
  v_owner_id uuid := gen_random_uuid();
  v_member_id uuid := gen_random_uuid();
  v_store_id uuid;
  v_token_hash text := encode(digest('role-check-membership-invite-token', 'sha256'), 'hex');
  v_result jsonb;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  values
    (v_owner_id, 'role-check-invite-owner@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated'),
    (v_member_id, 'role-check-invite-member@example.com', 'x', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');
  insert into ecommerce.user_profiles (id, email, role) values (v_owner_id, 'role-check-invite-owner@example.com', 'user');
  v_store_id := ecommerce.provision_store('role-check-invite-store', 'Role Check Invite Store', v_owner_id, 'COP');

  set local role authenticated;
  begin
    perform ecommerce.find_auth_user_id_by_email('role-check-invite-member@example.com');
    raise exception 'Bypass reopened: authenticated could EXECUTE ecommerce.find_auth_user_id_by_email directly';
  exception when insufficient_privilege then null;
  end;
  begin
    perform ecommerce.request_membership_invite(
      v_owner_id, v_store_id, v_member_id, 'role-check-invite-member@example.com', 'admin', v_token_hash,
      'Osoria <auth@mail.osoria.help>', 's', '<p>h</p>', 't', 'idem-role-check'
    );
    raise exception 'Bypass reopened: authenticated could EXECUTE ecommerce.request_membership_invite directly';
  exception when insufficient_privilege then null;
  end;
  begin
    perform ecommerce.accept_membership_invite(v_member_id, v_token_hash);
    raise exception 'Bypass reopened: authenticated could EXECUTE ecommerce.accept_membership_invite directly';
  exception when insufficient_privilege then null;
  end;
  reset role;

  if exists (select 1 from ecommerce.pending_membership_invites where token_hash = v_token_hash) then
    raise exception 'A rejected authenticated call must never mint a pending_membership_invites row';
  end if;

  set local role service_role;
  if ecommerce.find_auth_user_id_by_email('role-check-invite-member@example.com') <> v_member_id then
    raise exception 'service_role must be able to resolve an identity through find_auth_user_id_by_email';
  end if;

  v_result := ecommerce.request_membership_invite(
    v_owner_id, v_store_id, v_member_id, 'role-check-invite-member@example.com', 'admin', v_token_hash,
    'Osoria <auth@mail.osoria.help>', 's', '<p>h</p>', 't', 'idem-role-check'
  );
  if (v_result ->> 'ok')::boolean is not true then
    raise exception 'service_role must be able to mint a membership invite through the app''s own call path, got %', v_result;
  end if;

  v_result := ecommerce.accept_membership_invite(v_member_id, v_token_hash);
  if (v_result ->> 'ok')::boolean is not true then
    raise exception 'service_role must be able to accept a membership invite through the app''s own call path, got %', v_result;
  end if;
  reset role;
end $$;

rollback;

select 'email platform contract ok' as status;
