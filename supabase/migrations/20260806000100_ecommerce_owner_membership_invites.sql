-- Safe owner and membership invitations (slice 6 of plan-correos-ecommerce):
-- D20-D22, D25, D30.
--
-- D20 replaces temporary-password owner/member creation with Supabase's
-- native invite (lib/auth/platform-identity-invites.ts calls
-- auth.admin.inviteUserByEmail -- GoTrue itself, not SQL, mints that
-- identity). What SQL adds is the piece GoTrue can't: knowing, BEFORE
-- inviting, whether the target email already exists ANYWHERE in this
-- project's auth.users -- a pool shared with other apps in the org (see this
-- slice's brief). ecommerce.find_auth_user_id_by_email is that lookup.
--
-- D21 is the other branch of that same fork: an email that already resolves
-- to a real identity never gets an immediate store_users row. Instead
-- ecommerce.pending_membership_invites records who was invited (store,
-- intended_user_id, role) behind a hashed, single-use, one-hour token
-- (D24), and ecommerce.accept_membership_invite is the ONLY path that ever
-- turns that into a real membership -- and only for the intended_user_id
-- itself (p_user_id must match, resolved server-side from the accepting
-- session, never trusted from the client). A different authenticated user
-- who obtains the link gets the exact same invalid_or_expired rejection as
-- an unknown or expired token (no enumeration, D24's posture).
--
-- Same service-role-only posture as every other slice-2/5 table (D14): RLS
-- on, zero anon/authenticated grants.
--
-- Scope: ecommerce schema only.

-- -----------------------------------------------------------------------------
-- D20 needs the store to exist BEFORE it can invite its owner: the invite
-- email is rendered from an ecommerce.auth_intents row (D15's Auth Hook
-- reads it for branding), and auth_intents.store_id is a NOT NULL FK --
-- there is no store yet at that point, because the ORIGINAL
-- ecommerce.provision_store requires a real owner user_profiles row before
-- it will create one, and that owner doesn't exist yet either (D20 invites
-- it). Backward-compatible extension via create or replace, same pattern
-- 20260718000100 already used on can_user_manage_store: a null
-- p_owner_user_id now creates the store alone (still born private, D7's
-- comment), skipping the role/membership inserts; every existing caller
-- (including this file's own verify-email-platform-contract.sql fixtures)
-- keeps passing a real id and sees IDENTICAL behavior. lib/supabase/stores-
-- admin-api.ts's createTenant calls the shell path, then reuses
-- memberships-api.ts's own ensureStoreUser/resolveStoreRoleId/
-- assignSingleRole (addStoreMember's exact primitives) to grant ownership
-- once the invited or accepting identity is ready -- never a second,
-- competing way to write the same three rows.
-- -----------------------------------------------------------------------------
create or replace function ecommerce.provision_store(
  p_subdomain text,
  p_store_name text,
  p_owner_user_id uuid,
  p_currency_code text default 'COP'
)
returns uuid
language plpgsql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
declare
  v_store_id uuid;
  v_role_id uuid;
  v_store_user_id uuid;
begin
  if p_owner_user_id is not null and not exists (select 1 from ecommerce.user_profiles where id = p_owner_user_id) then
    raise exception 'owner % does not exist in ecommerce.user_profiles', p_owner_user_id;
  end if;

  if exists (select 1 from ecommerce.stores where subdomain = p_subdomain) then
    raise exception 'subdomain % is already taken', p_subdomain;
  end if;

  insert into ecommerce.stores (subdomain, store_name, currency_code, is_public)
  values (p_subdomain, p_store_name, coalesce(p_currency_code, 'COP'), false)
  returning id into v_store_id;

  if p_owner_user_id is not null then
    insert into ecommerce.roles (store_id, role_name, is_system)
    values (v_store_id, 'owner', false)
    returning id into v_role_id;

    insert into ecommerce.store_users (store_id, user_id)
    values (v_store_id, p_owner_user_id)
    returning id into v_store_user_id;

    insert into ecommerce.store_user_roles (store_user_id, role_id)
    values (v_store_user_id, v_role_id);
  end if;

  return v_store_id;
end;
$$;

comment on function ecommerce.provision_store(text, text, uuid, text) is
  'Creates a store (unpublished) in one transaction, plus its owner role, membership and role assignment when p_owner_user_id is not null. A null owner creates the store alone (D20: the owner may not exist yet, or may be pending a D21 acceptance) -- the caller is responsible for granting ownership afterward. Raises if a non-null owner profile does not exist or the subdomain is taken. Subdomain format and reserved names are validated by the application before calling.';

-- -----------------------------------------------------------------------------
-- D20's fork point. SECURITY DEFINER because plain `authenticated`/service
-- callers have no read access to auth.users at all; owned by the migration
-- role the same way ecommerce.user_manages_any_store already reads across
-- the schema boundary. Case-insensitive: every other email comparison in
-- this codebase (findUserIdByEmail's ilike, check_and_record_send_attempt's
-- lower()) already treats email as case-insensitive.
-- -----------------------------------------------------------------------------
create or replace function ecommerce.find_auth_user_id_by_email(p_email text)
returns uuid
language sql
stable security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

comment on function ecommerce.find_auth_user_id_by_email(text) is
  'D20/D21: resolves whether an email already exists anywhere in this shared-pool project''s auth.users, and its id if so. Existence here means "exists somewhere in the org" (this app''s ecommerce.user_profiles or a different app''s own identity), never "is already a user of this app" -- callers branch D20 (native invite) vs D21 (pending acceptance) on this alone.';

revoke all on function ecommerce.find_auth_user_id_by_email(text) from public;
grant execute on function ecommerce.find_auth_user_id_by_email(text) to service_role;

create table ecommerce.pending_membership_invites (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references ecommerce.stores(id) on delete cascade,
  intended_user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role_name text not null check (role_name in ('owner', 'admin')),
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table ecommerce.pending_membership_invites is
  'D21: one hashed, single-use, one-hour pending grant per (store, intended_user_id) invite. A row here is never itself membership -- ecommerce.accept_membership_invite is the only path that turns it into a store_users/store_user_roles write, and only for the user it names.';
comment on column ecommerce.pending_membership_invites.intended_user_id is
  'D21''s load-bearing binding: resolved server-side at invite time (ecommerce.find_auth_user_id_by_email), never client-supplied. accept_membership_invite rejects any p_user_id that does not match this exactly, so a different authenticated user holding the link gains nothing.';
comment on column ecommerce.pending_membership_invites.token_hash is
  'sha256 of the plaintext token embedded in the emailed link (lib/security/verification-token.ts), same contract as every other verification token in this codebase: the plaintext is never stored.';

create unique index pending_membership_invites_token_hash_key on ecommerce.pending_membership_invites (token_hash);
-- Supports both the "supersede any earlier unconsumed invite for this
-- (store, person)" update in request_membership_invite and the same lookup
-- shape store_mailbox_verifications already indexes for.
create index pending_membership_invites_store_user_idx
  on ecommerce.pending_membership_invites (store_id, intended_user_id)
  where consumed_at is null;

alter table ecommerce.pending_membership_invites enable row level security;
revoke all on ecommerce.pending_membership_invites from public, anon, authenticated;
grant all on ecommerce.pending_membership_invites to service_role;
create policy pending_membership_invites_service_role_only on ecommerce.pending_membership_invites
  for all to authenticated, anon
  using (false) with check (false);

-- -----------------------------------------------------------------------------
-- Mints a pending membership invite. Mirrors
-- ecommerce.request_store_mailbox_verification's shape exactly: the actor is
-- passed explicitly (this runs under the service-role client, so there is no
-- auth.uid() to read) and re-checked here (D30) -- EXECUTE alone, with no
-- table grant, must never be enough to invite into a store the caller
-- doesn't manage. D25's rate limit is the SAME reused
-- check_and_record_send_attempt slice 2 built, keyed by
-- store x 'membership_invite' x recipient -- never a second limiter.
-- -----------------------------------------------------------------------------
create or replace function ecommerce.request_membership_invite(
  p_actor_user_id uuid,
  p_store_id uuid,
  p_intended_user_id uuid,
  p_email text,
  p_role_name text,
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
begin
  if p_role_name not in ('owner', 'admin') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_role');
  end if;

  if not ecommerce.can_user_manage_store(p_actor_user_id, p_store_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_authorized');
  end if;

  if not ecommerce.check_and_record_send_attempt(p_store_id, 'membership_invite', p_email) then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  -- A fresh invite to the same (store, person) supersedes any earlier
  -- unconsumed one, same policy as request_store_mailbox_verification: only
  -- the most recently emailed link should still work.
  update ecommerce.pending_membership_invites
  set consumed_at = now()
  where store_id = p_store_id and intended_user_id = p_intended_user_id and consumed_at is null;

  insert into ecommerce.pending_membership_invites
    (store_id, intended_user_id, email, role_name, token_hash, expires_at)
  values
    (p_store_id, p_intended_user_id, lower(p_email), p_role_name, p_token_hash, now() + interval '1 hour');

  insert into ecommerce.email_outbox (
    store_id, template_kind, recipient_email, idempotency_key, from_address, subject, html_body, text_body
  ) values (
    p_store_id, 'membership-acceptance', lower(p_email), p_idempotency_key,
    p_email_from, p_email_subject, p_email_html, p_email_text
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function ecommerce.request_membership_invite(uuid, uuid, uuid, text, text, text, text, text, text, text, text) from public;
grant execute on function ecommerce.request_membership_invite(uuid, uuid, uuid, text, text, text, text, text, text, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- D21's whole guarantee in one atomic call, reached anonymously-authenticated
-- (whoever holds a live session, not necessarily whoever the invite named --
-- see app/auth/accept-membership) from a token in a URL query string, same
-- posture as confirm_store_mailbox_verification: the response never
-- distinguishes "no such token" from "expired" from "already used" from
-- "you're not the person this was for" (D24's no-enumeration posture,
-- extended to the intended-user check). `for update` makes the
-- read-then-consume atomic against a second click racing the first.
--
-- store_users.user_id references ecommerce.user_profiles(id), not
-- auth.users(id) directly -- the FK the baseline schema fixes (see
-- 20260425000100). An accepting identity that only ever existed as a
-- FOREIGN app's auth.users row (never this app's) has no profile row yet;
-- this seeds a minimal one (email only, from the invite's own stored
-- address -- never a fresh auth.users read, so the granted profile matches
-- exactly what was invited) instead of failing the FK.
-- -----------------------------------------------------------------------------
create or replace function ecommerce.accept_membership_invite(
  p_user_id uuid,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
declare
  v_row ecommerce.pending_membership_invites%rowtype;
  v_store_user_id uuid;
  v_role_id uuid;
begin
  select * into v_row
  from ecommerce.pending_membership_invites
  where token_hash = p_token_hash and consumed_at is null and expires_at > now()
  for update;

  if not found or v_row.intended_user_id <> p_user_id then
    return jsonb_build_object('ok', false, 'reason', 'invalid_or_expired');
  end if;

  update ecommerce.pending_membership_invites set consumed_at = now() where id = v_row.id;

  insert into ecommerce.user_profiles (id, email)
  values (p_user_id, v_row.email)
  on conflict (id) do nothing;

  select id into v_store_user_id
  from ecommerce.store_users
  where store_id = v_row.store_id and user_id = p_user_id;

  if not found then
    insert into ecommerce.store_users (store_id, user_id)
    values (v_row.store_id, p_user_id)
    returning id into v_store_user_id;
  end if;

  select id into v_role_id
  from ecommerce.roles
  where store_id = v_row.store_id and role_name = v_row.role_name;

  if not found then
    insert into ecommerce.roles (store_id, role_name, is_system)
    values (v_row.store_id, v_row.role_name, false)
    returning id into v_role_id;
  end if;

  delete from ecommerce.store_user_roles where store_user_id = v_store_user_id;
  insert into ecommerce.store_user_roles (store_user_id, role_id) values (v_store_user_id, v_role_id);

  return jsonb_build_object('ok', true, 'store_id', v_row.store_id);
end;
$$;

revoke all on function ecommerce.accept_membership_invite(uuid, text) from public;
grant execute on function ecommerce.accept_membership_invite(uuid, text) to service_role;
