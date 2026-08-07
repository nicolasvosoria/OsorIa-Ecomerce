-- Additive comment-only fix: 20260805001000_ecommerce_auth_platform.sql's
-- `comment on table ecommerce.auth_intents` described owner_invite/
-- new_user_invite as purposes the schema merely reserved, minted by nothing
-- yet. lib/auth/platform-identity-invites.ts's inviteNewIdentity mints them
-- now, so that comment is stale. `comment on table` is idempotent and
-- touches no data or existing DDL -- the frozen migration above is left
-- exactly as applied.
--
-- Scope: ecommerce schema only.

comment on table ecommerce.auth_intents is
  'D23: server-minted, hashed, single-use, one-hour binding of an Auth round-trip to the store resolved server-side when it started. signup/recovery intents are minted by lib/auth/prepare-auth-redirect.ts; owner_invite/new_user_invite intents are minted by lib/auth/platform-identity-invites.ts''s inviteNewIdentity, completing the D11 catalog''s mapping surface.';
