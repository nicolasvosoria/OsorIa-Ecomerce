-- Order status state machine and lifecycle notifications (D29, D11, D30, D13,
-- D27 spirit).
--
-- Before this migration, app/admin/orders/actions.ts and
-- app/api/admin/orders/route.ts both reached lib/supabase/orders-api.ts's
-- updateOrderStatus, which ran a plain PostgREST `.update({status})` -- ANY
-- status could follow ANY other status, and no message was ever enqueued for
-- shipped/delivered/cancelled/returned. ecommerce.transition_order_status
-- replaces that write with ONE locked function that enforces the frozen
-- graph below, checks its own authorization and tenant scope rather than
-- trusting the caller (D30, same posture as ecommerce.create_order_with_notifications),
-- and -- when the transition lands on one of the four kinds the D11 catalog
-- actually carries -- inserts the pre-rendered ecommerce.email_outbox row in
-- the SAME statement as the status change, or neither happens (D27 spirit).
--
-- The frozen graph (D29):
--   pending    -> confirmed | processing | cancelled
--   confirmed  -> processing | shipped | cancelled
--   processing -> shipped | cancelled
--   shipped    -> delivered
--   delivered  -> returned
--   cancelled  -> (terminal)
--   returned   -> (terminal)
-- Every pair not listed below is rejected. Encoded once, as the literal VALUES
-- table below, so this migration's comment and the enforced rule can never
-- drift apart.
--
-- D11: only a transition INTO shipped/delivered/cancelled/returned carries a
-- customer message (order-shipped/order-delivered/order-cancelled/order-returned).
-- confirmed and processing are explicitly excluded from the catalog -- this
-- function raises if a caller ever attaches a notification to one of those,
-- or omits the required one for the other four, rather than silently doing
-- the wrong thing.
--
-- The lifecycle message always goes to the order's OWN customer_email -- a
-- required column set at checkout -- never to a merchant recipient, so D31's
-- readiness gate (which exists solely because a store's MERCHANT recipient
-- can be absent, see 20260805000600) does not apply here: there is no
-- missing-recipient case for this function to degrade around.
--
-- Scope: ecommerce schema only.

create or replace function ecommerce.transition_order_status(
  p_order_id uuid,
  p_store_id uuid,
  p_user_id uuid,
  p_next_status text,
  p_notification jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'ecommerce', 'pg_temp'
as $$
declare
  v_order ecommerce.orders%rowtype;
  v_authorized boolean;
  v_allowed boolean;
  v_expected_kind text;
begin
  -- D30: this function is service_role-only (grant below), but it still
  -- refuses to run on nonsense input rather than trusting the caller blindly.
  if p_order_id is null or p_store_id is null or p_user_id is null or coalesce(p_next_status, '') = '' then
    raise exception 'order_id, store_id, user_id and next_status are all required';
  end if;

  -- D30 authorization: re-checked here even though every caller already
  -- gates on can_user_manage_store before reaching this function, because a
  -- SECURITY DEFINER function's own posture can never rely on what a caller
  -- claims to have already checked.
  select ecommerce.can_user_manage_store(p_user_id, p_store_id) into v_authorized;
  if not v_authorized then
    return jsonb_build_object('ok', false, 'reason', 'not_authorized');
  end if;

  -- D30 tenant check: scoped to (id, store_id) together and locked for the
  -- rest of this transaction, so a concurrent transition on the SAME order
  -- can never race this one's read-then-write. An order that exists but
  -- belongs to a DIFFERENT store gets the exact same generic answer as one
  -- that doesn't exist at all -- never confirms cross-tenant existence.
  select * into v_order
  from ecommerce.orders
  where id = p_order_id and store_id = p_store_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select exists (
    select 1 from (values
      ('pending', 'confirmed'), ('pending', 'processing'), ('pending', 'cancelled'),
      ('confirmed', 'processing'), ('confirmed', 'shipped'), ('confirmed', 'cancelled'),
      ('processing', 'shipped'), ('processing', 'cancelled'),
      ('shipped', 'delivered'),
      ('delivered', 'returned')
    ) as allowed(from_status, to_status)
    where allowed.from_status = v_order.status::text
      and allowed.to_status = p_next_status
  ) into v_allowed;

  if not v_allowed then
    return jsonb_build_object('ok', false, 'reason', 'invalid_transition');
  end if;

  -- D11 shape check, mirroring how create_order_with_notifications checks
  -- p_notifications' shape: a caller bug that attaches the wrong (or no)
  -- notification is a programmer error and must fail loudly, never silently
  -- send the wrong message or skip a required one.
  v_expected_kind := case p_next_status
    when 'shipped' then 'order-shipped'
    when 'delivered' then 'order-delivered'
    when 'cancelled' then 'order-cancelled'
    when 'returned' then 'order-returned'
    else null
  end;

  if v_expected_kind is not null then
    if p_notification is null or p_notification->>'templateKind' <> v_expected_kind then
      raise exception 'expected a % outbox notification for a transition into %, got %',
        v_expected_kind, p_next_status, coalesce(p_notification->>'templateKind', 'none');
    end if;
  elsif p_notification is not null then
    raise exception 'no outbox notification is expected for a transition into %', p_next_status;
  end if;

  update ecommerce.orders
  set status = p_next_status::ecommerce.order_status,
      confirmed_at = case when p_next_status = 'confirmed' then now() else confirmed_at end,
      shipped_at = case when p_next_status = 'shipped' then now() else shipped_at end,
      delivered_at = case when p_next_status = 'delivered' then now() else delivered_at end,
      cancelled_at = case when p_next_status = 'cancelled' then now() else cancelled_at end,
      updated_at = now()
  where id = p_order_id
  returning * into v_order;

  if v_expected_kind is not null then
    insert into ecommerce.email_outbox (
      store_id, template_kind, recipient_email, idempotency_key, from_address, reply_to_address,
      subject, html_body, text_body
    ) values (
      p_store_id,
      p_notification->>'templateKind',
      p_notification->>'recipientEmail',
      p_notification->>'idempotencyKey',
      p_notification->>'fromAddress',
      p_notification->>'replyToAddress',
      p_notification->>'subject',
      p_notification->>'htmlBody',
      p_notification->>'textBody'
    );
  end if;

  return jsonb_build_object('ok', true, 'order', to_jsonb(v_order));
end;
$$;

comment on function ecommerce.transition_order_status(uuid, uuid, uuid, text, jsonb) is
  'Moves an order to p_next_status per the frozen D29 graph, atomically with the D11 lifecycle notification the target status requires (shipped/delivered/cancelled/returned) -- or with none, for confirmed/processing. Checks its own authorization (can_user_manage_store) and tenant scope (order must belong to p_store_id); {ok:false, reason:not_authorized|not_found|invalid_transition} for a rejected call, never a partial status change or a stray outbox row.';

-- Same posture as ecommerce.create_order_with_notifications and
-- ecommerce.decrement_inventory: the only callers are the admin server
-- action and the admin API route, both via the service_role client. No
-- table access is granted to reach this -- the function updates orders and
-- inserts into email_outbox internally as its owner.
revoke all on function ecommerce.transition_order_status(uuid, uuid, uuid, text, jsonb) from public;
grant execute on function ecommerce.transition_order_status(uuid, uuid, uuid, text, jsonb) to service_role;
