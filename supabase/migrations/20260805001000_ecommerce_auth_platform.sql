-- Durable Auth email and trusted store attribution (slice 5 of
-- plan-correos-ecommerce): D15, D23-D26.
--
-- ecommerce.auth_intents is the server-minted, hashed, single-use, one-hour
-- record D23 requires before a customer profile can be finalized. It is
-- deliberately NOT store_mailbox_verifications reused: that table's rows are
-- owned by an authenticated store admin (D30's p_actor_user_id check) and
-- confirm a MAILBOX; these rows are minted anonymously, before any session
-- exists, and bind a whole Auth round-trip (signup/recovery, and later
-- slice 6's invites) to the store resolved server-side at request time --
-- never a store ID the client could hand back later (D23's explicit
-- rejection). The plaintext token is produced by
-- lib/security/verification-token.ts (slice 2) and travels ONLY inside the
-- `emailRedirectTo`/`redirectTo` query string the app builds with
-- lib/email/urls.ts (D8); only its hash is ever persisted, same contract as
-- every other verification token in this codebase.
--
-- Two things read this table:
--   - supabase/functions/auth-email-hook (via lib/email/auth-hook.ts) PEEKS
--     it (a plain SELECT, service_role) to resolve which store's branding an
--     Auth email should render with. That read never consumes the row --
--     branding is not the security boundary here.
--   - ecommerce.finalize_customer_profile CONSUMES it (this file, below) --
--     the one and only place a row's single use is spent, and the one place
--     D23's actual guarantee (a confirmed signup can never be attributed to
--     a tenant other than the one the intent was minted for) is enforced.
--
-- Same service-role-only posture as every other slice-2 table (D14): RLS on,
-- zero anon/authenticated grants, explicit deny-by-default policy.
--
-- Scope: ecommerce schema only.

create table ecommerce.auth_intents (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references ecommerce.stores(id) on delete cascade,
  purpose text not null check (purpose in ('signup', 'recovery', 'owner_invite', 'new_user_invite')),
  email text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table ecommerce.auth_intents is
  'D23: server-minted, hashed, single-use, one-hour binding of an Auth round-trip (signup, recovery, and slice 6''s invites) to the store resolved server-side when it started. purpose=owner_invite/new_user_invite complete the D11 catalog''s mapping surface for slice 6 to mint against; this slice never inserts those two itself.';
comment on column ecommerce.auth_intents.token_hash is
  'sha256 of the plaintext token embedded in the emailed link (lib/security/verification-token.ts). The plaintext is never stored, same contract as store_mailbox_verifications.token_hash.';

create unique index auth_intents_token_hash_key on ecommerce.auth_intents (token_hash);
create index auth_intents_store_id_idx on ecommerce.auth_intents (store_id);

alter table ecommerce.auth_intents enable row level security;
revoke all on ecommerce.auth_intents from public, anon, authenticated;
grant all on ecommerce.auth_intents to service_role;
create policy auth_intents_service_role_only on ecommerce.auth_intents
  for all to authenticated, anon
  using (false) with check (false);

-- -----------------------------------------------------------------------------
-- D23's whole guarantee in one atomic call. Idempotent (D23: "running it twice
-- leaves exactly one profile") by checking for an existing profile FIRST and
-- short-circuiting to success without touching the intent again -- a second
-- call for the same user (a page reload, React StrictMode's double-invoke,
-- the confirmation link opened twice) is a no-op, never a second insert and
-- never a "token already consumed" error surfaced as a failure.
--
-- Single-use is enforced independently of that idempotency shortcut: `for
-- update where consumed_at is null and expires_at > now()` means a token
-- already spent by a first (user_id A) call can never be spent again by a
-- DIFFERENT user_id -- the exact "attribution redirected to another tenant"
-- attack D23 closes, since there is no p_store_id parameter here at all for
-- a caller to substitute; the only store this can ever attach a profile to
-- is whichever one the intent recorded at mint time.
--
-- No auth.users trigger (D23's other explicit rejection) and no raw store ID
-- accepted from the client: p_user_id/p_email/p_first_name/p_last_name come
-- from the server's OWN read of the just-established session
-- (lib/auth/finalize-signup-action.ts calls this under getSupabaseAuthClient's
-- cookie session, never from a client-supplied body), and store_id comes
-- exclusively from the consumed intent row.
-- -----------------------------------------------------------------------------
create or replace function ecommerce.finalize_customer_profile(
  p_user_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
declare
  v_existing_store_id uuid;
  v_intent ecommerce.auth_intents%rowtype;
begin
  select signup_store_id into v_existing_store_id
  from ecommerce.user_profiles
  where id = p_user_id;

  if found then
    return jsonb_build_object('ok', true, 'created', false, 'store_id', v_existing_store_id);
  end if;

  select * into v_intent
  from ecommerce.auth_intents
  where token_hash = p_token_hash and consumed_at is null and expires_at > now()
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid_or_expired_intent');
  end if;

  update ecommerce.auth_intents set consumed_at = now() where id = v_intent.id;

  insert into ecommerce.user_profiles (id, email, first_name, last_name, signup_store_id)
  values (p_user_id, p_email, p_first_name, p_last_name, v_intent.store_id)
  on conflict (id) do nothing;

  return jsonb_build_object('ok', true, 'created', true, 'store_id', v_intent.store_id);
end;
$$;

revoke all on function ecommerce.finalize_customer_profile(uuid, text, text, text, text) from public;
grant execute on function ecommerce.finalize_customer_profile(uuid, text, text, text, text) to service_role;
