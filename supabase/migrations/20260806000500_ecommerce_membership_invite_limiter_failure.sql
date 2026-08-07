-- Closes the parallel D24 gap on the D21 pending-invite path: additive
-- `create or replace` against 20260806000100_ecommerce_owner_membership_
-- invites.sql (applied to staging, frozen) -- same shape as this branch's
-- own fix on the sibling D20 path (lib/auth/platform-identity-invites.ts's
-- ensureInviteSendAllowed/inviteNewIdentity, already returning
-- rate_limit_check_failed).
--
-- request_membership_invite calls ecommerce.check_and_record_send_attempt
-- INSIDE its own transaction, unlike ensureInviteSendAllowed (which calls it
-- as its own top-level RPC from TS and can already tell a genuine RPC error
-- apart from a false return). Before this migration, a runtime failure of
-- that inner call (lock timeout, a broken grant, any other error) unwound
-- the WHOLE function as a raw Postgres error, which
-- lib/auth/platform-identity-invites.ts's mintPendingMembershipInvite could
-- only report as its generic `{outcome:"error"}` -- an outcome
-- lib/supabase/stores-admin-api.ts's PENDING_OWNER_INVITE_ERRORS never
-- mapped, so it fell through to the differently-worded PROVISION_FAILED_
-- ERROR instead of the same "try again in a moment" copy a genuine rate
-- limit gets. Same D24 shape as the fix already applied on the other path:
-- a limiter-check failure must read to the caller EXACTLY like a real rate
-- limit, with its own distinct, logged reason for the operator.
--
-- Scope: ecommerce schema only.

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
declare
  v_allowed boolean;
begin
  if p_role_name not in ('owner', 'admin') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_role');
  end if;

  if not ecommerce.can_user_manage_store(p_actor_user_id, p_store_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_authorized');
  end if;

  -- The ONLY change from 20260806000100's original body: isolate the
  -- limiter's own failure (an `others` exception, never the false-meaning-
  -- rate-limited case handled by the branch below it) behind a nested
  -- block, which plpgsql runs as its own subtransaction -- so it can be
  -- caught and turned into a distinct, non-enumerable reason instead of
  -- unwinding this entire call as a raw error.
  begin
    v_allowed := ecommerce.check_and_record_send_attempt(p_store_id, 'membership_invite', p_email);
  exception when others then
    return jsonb_build_object('ok', false, 'reason', 'rate_limit_check_failed', 'detail', sqlerrm);
  end;

  if not v_allowed then
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
