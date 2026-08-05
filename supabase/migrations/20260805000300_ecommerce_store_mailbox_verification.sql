-- Mailbox ownership verification (D6, D24-D25, D30) for the Reply-To and order
-- mailbox fields added in 20260805000100.
--
-- Two tables:
--   - store_mailbox_verifications: one hashed, single-use, one-hour token per
--     verification request. Never stores the plaintext token (D6) -- only the
--     caller that just generated it (in TS, before it's embedded in the email
--     link) ever sees the plaintext.
--   - email_send_attempts: the per store x purpose x recipient ledger D25's
--     rate limit (1/60s, 5/hour) reads and writes. Deliberately purpose-
--     generic so slice 6's invite sends can reuse the same table and gate
--     function instead of duplicating the throttle.
--
-- Both tables are service-role only, same reasoning as the outbox (D14): no
-- product surface lists verification attempts, so there's nothing for anon or
-- authenticated to read or write directly.
--
-- Scope: ecommerce schema only.

create table ecommerce.store_mailbox_verifications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references ecommerce.stores(id) on delete cascade,
  field text not null check (field in ('reply_to', 'order_mailbox')),
  email text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index store_mailbox_verifications_token_hash_key
  on ecommerce.store_mailbox_verifications (token_hash);
create index store_mailbox_verifications_store_field_idx
  on ecommerce.store_mailbox_verifications (store_id, field);

alter table ecommerce.store_mailbox_verifications enable row level security;
revoke all on ecommerce.store_mailbox_verifications from public, anon, authenticated;
grant all on ecommerce.store_mailbox_verifications to service_role;
create policy store_mailbox_verifications_service_role_only
  on ecommerce.store_mailbox_verifications for all to authenticated, anon
  using (false) with check (false);

create table ecommerce.email_send_attempts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references ecommerce.stores(id) on delete cascade,
  purpose text not null,
  recipient_email text not null,
  created_at timestamptz not null default now()
);

create index email_send_attempts_throttle_idx
  on ecommerce.email_send_attempts (store_id, purpose, recipient_email, created_at desc);

alter table ecommerce.email_send_attempts enable row level security;
revoke all on ecommerce.email_send_attempts from public, anon, authenticated;
grant all on ecommerce.email_send_attempts to service_role;
create policy email_send_attempts_service_role_only
  on ecommerce.email_send_attempts for all to authenticated, anon
  using (false) with check (false);

-- -----------------------------------------------------------------------------
-- D25's throttle as one reusable gate: true and recorded, or false and left
-- untouched. `pg_advisory_xact_lock` serializes concurrent callers for the
-- same (store, purpose, recipient) so two requests racing each other can't
-- both read "4 in the last hour" and both insert a 5th.
-- -----------------------------------------------------------------------------
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
declare
  v_last_sent_at timestamptz;
  v_count_last_hour integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_store_id::text || '|' || p_purpose || '|' || lower(p_recipient_email)));

  select max(created_at) into v_last_sent_at
  from ecommerce.email_send_attempts
  where store_id = p_store_id and purpose = p_purpose and recipient_email = lower(p_recipient_email);

  if v_last_sent_at is not null and v_last_sent_at > now() - interval '60 seconds' then
    return false;
  end if;

  select count(*) into v_count_last_hour
  from ecommerce.email_send_attempts
  where store_id = p_store_id and purpose = p_purpose and recipient_email = lower(p_recipient_email)
    and created_at > now() - interval '1 hour';

  if v_count_last_hour >= 5 then
    return false;
  end if;

  insert into ecommerce.email_send_attempts (store_id, purpose, recipient_email)
  values (p_store_id, p_purpose, lower(p_recipient_email));

  return true;
end;
$$;

revoke all on function ecommerce.check_and_record_send_attempt(uuid, text, text) from public;
grant execute on function ecommerce.check_and_record_send_attempt(uuid, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- Requests a mailbox verification. Called from the Next.js server action under
-- the service-role client (no auth.uid() in that context, same reason
-- ecommerce.can_user_manage_store takes p_actor_user_id -- see its comment),
-- so this function takes the actor explicitly and re-checks authorization
-- itself (D30): a caller with only EXECUTE on this function, and no table
-- grant on email_outbox or store_contact's protected columns, still can't do
-- anything it isn't allowed to. The rendered email (subject/html/text) is
-- produced by lib/email/render.tsx in TS before this call -- SQL can't render
-- React -- and is stored verbatim in the outbox row (D13's immutable
-- snapshot): a later branding edit never changes an already-queued send.
-- -----------------------------------------------------------------------------
create or replace function ecommerce.request_store_mailbox_verification(
  p_actor_user_id uuid,
  p_store_id uuid,
  p_field text,
  p_new_email text,
  p_token_hash text,
  p_email_from text,
  p_email_subject text,
  p_email_html text,
  p_email_text text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
declare
  v_purpose text;
begin
  if p_field not in ('reply_to', 'order_mailbox') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_field');
  end if;

  if p_new_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_email');
  end if;

  if not ecommerce.can_user_manage_store(p_actor_user_id, p_store_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_authorized');
  end if;

  v_purpose := 'mailbox_verification:' || p_field;

  if not ecommerce.check_and_record_send_attempt(p_store_id, v_purpose, p_new_email) then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  -- A fresh request supersedes any earlier unconsumed token for the same
  -- field: only the most recently emailed link should still work.
  update ecommerce.store_mailbox_verifications
  set consumed_at = now()
  where store_id = p_store_id and field = p_field and consumed_at is null;

  insert into ecommerce.store_mailbox_verifications (store_id, field, email, token_hash, expires_at)
  values (p_store_id, p_field, lower(p_new_email), p_token_hash, now() + interval '1 hour');

  if p_field = 'reply_to' then
    insert into ecommerce.store_contact (store_id, reply_to_pending_email, updated_at)
    values (p_store_id, lower(p_new_email), now())
    on conflict (store_id) do update
      set reply_to_pending_email = excluded.reply_to_pending_email, updated_at = now();
  else
    insert into ecommerce.store_contact (store_id, order_mailbox_pending_email, updated_at)
    values (p_store_id, lower(p_new_email), now())
    on conflict (store_id) do update
      set order_mailbox_pending_email = excluded.order_mailbox_pending_email, updated_at = now();
  end if;

  insert into ecommerce.email_outbox (
    store_id, template_kind, recipient_email, idempotency_key, from_address, subject, html_body, text_body
  ) values (
    p_store_id, 'store-mailbox-verification', lower(p_new_email), p_idempotency_key,
    p_email_from, p_email_subject, p_email_html, p_email_text
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function ecommerce.request_store_mailbox_verification(uuid, uuid, text, text, text, text, text, text, text, text) from public;
grant execute on function ecommerce.request_store_mailbox_verification(uuid, uuid, text, text, text, text, text, text, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- Confirms a mailbox verification link. Reached anonymously (whoever can read
-- the mailbox, not necessarily an Osoria session) from app/auth/mailbox-
-- verification, which only ever passes a token it received as a URL query
-- param -- so this function never learns who's asking beyond the hash they
-- present, and its response never distinguishes "no such token" from
-- "expired" from "already used" (same no-enumeration posture as D24's auth
-- links). `for update` makes the read-then-consume atomic against a second
-- click racing the first.
-- -----------------------------------------------------------------------------
create or replace function ecommerce.confirm_store_mailbox_verification(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
declare
  v_row ecommerce.store_mailbox_verifications%rowtype;
begin
  select * into v_row
  from ecommerce.store_mailbox_verifications
  where token_hash = p_token_hash and consumed_at is null and expires_at > now()
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid_or_expired');
  end if;

  update ecommerce.store_mailbox_verifications
  set consumed_at = now()
  where id = v_row.id;

  if v_row.field = 'reply_to' then
    insert into ecommerce.store_contact (store_id, reply_to_email, reply_to_pending_email, reply_to_verified_at, updated_at)
    values (v_row.store_id, v_row.email, null, now(), now())
    on conflict (store_id) do update
      set reply_to_email = excluded.reply_to_email,
          reply_to_pending_email = null,
          reply_to_verified_at = now(),
          updated_at = now();
  else
    insert into ecommerce.store_contact (store_id, order_mailbox_email, order_mailbox_pending_email, order_mailbox_verified_at, updated_at)
    values (v_row.store_id, v_row.email, null, now(), now())
    on conflict (store_id) do update
      set order_mailbox_email = excluded.order_mailbox_email,
          order_mailbox_pending_email = null,
          order_mailbox_verified_at = now(),
          updated_at = now();
  end if;

  return jsonb_build_object('ok', true, 'store_id', v_row.store_id, 'field', v_row.field);
end;
$$;

revoke all on function ecommerce.confirm_store_mailbox_verification(text) from public;
grant execute on function ecommerce.confirm_store_mailbox_verification(text) to service_role;
