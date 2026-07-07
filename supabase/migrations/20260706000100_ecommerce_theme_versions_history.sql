-- New-version-per-apply history for ecommerce.app_theme_versions: drops the
-- old one-row-per-(store, theme) uniqueness in favor of one CURRENT version
-- per store (across any theme_id), so every activation (preset or custom)
-- inserts a fresh row instead of overwriting history. `is_custom` marks a
-- version whose `variables` carry an arbitrary edited definition rather than
-- a resolved preset.
-- Scope: ecommerce schema only.

alter table ecommerce.app_theme_versions
  drop constraint if exists app_theme_versions_store_id_theme_id_key;

create unique index if not exists app_theme_versions_one_current_per_store
  on ecommerce.app_theme_versions (store_id) where is_current;

create index if not exists app_theme_versions_store_created_idx
  on ecommerce.app_theme_versions (store_id, created_at desc);

alter table ecommerce.app_theme_versions
  add column if not exists is_custom boolean not null default false;
