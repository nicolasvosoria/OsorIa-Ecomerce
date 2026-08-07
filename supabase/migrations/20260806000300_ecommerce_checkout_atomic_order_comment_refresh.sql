-- Additive comment-only fix: 20260805000500_ecommerce_checkout_atomic_order.sql's
-- `comment on function ecommerce.create_order_with_notifications` still
-- states "exactly two email_outbox rows" (one customer receipt, one merchant
-- notification, always both). 20260805000600_ecommerce_checkout_optional_
-- merchant_notification.sql's `create or replace function` wholly supersedes
-- that body -- nothing of 000500's implementation is live -- and already
-- carries the current, correct comment (always exactly one order-received,
-- at most one merchant-new-order). 000500's own comment on disk is stale and
-- can't be edited (applied migration), and 20260805000700_ecommerce_checkout_
-- followup_convergence.sql's own narrative still cites 000500 as if it were
-- the defining migration -- this restates the current rule as the
-- terminal, authoritative comment for anyone reading the migration history
-- forward. `comment on function` is idempotent and touches no data or
-- existing DDL -- both frozen migrations above are left exactly as applied.
--
-- Scope: ecommerce schema only.

comment on function ecommerce.create_order_with_notifications(uuid, text, text, jsonb, jsonb, jsonb) is
  'Creates an order header, its items and its email_outbox rows atomically: always exactly one order-received (customer receipt), and at most one merchant-new-order (merchant notification, omitted only while D31''s readiness enforcement is off and the store has no merchant recipient). Idempotent on (store_id, idempotency_key): an identical retry (same payload_fingerprint) returns the existing order; a reused key with a different fingerprint is rejected via {ok:false, reason:idempotency_conflict}.';
