-- Ensures every active ecommerce store has a store_integrations row so
-- homeDiscountPopup can persist safely in metadata.

INSERT INTO ecommerce.store_integrations (
  store_id,
  metadata,
  updated_at
)
SELECT
  stores.id,
  '{}'::jsonb,
  NOW()
FROM ecommerce.stores AS stores
LEFT JOIN ecommerce.store_integrations AS integrations
  ON integrations.store_id = stores.id
WHERE integrations.store_id IS NULL
  AND stores.is_active = true
  AND stores.deleted_at IS NULL;
