-- Drop residual Shopify integration columns from ecommerce.store_integrations.
-- The table stays (its metadata jsonb feeds the promotions popup); only the unused
-- shopify_store_domain / shopify_access_token columns (both null, no code readers) go.
begin;

-- stores_legacy references shopify_store_domain; drop the view before the column.
drop view if exists ecommerce.stores_legacy;

alter table ecommerce.store_integrations
  drop column if exists shopify_store_domain,
  drop column if exists shopify_access_token;

-- Recreate stores_legacy WITHOUT the Shopify column (security_invoker preserved).
create view ecommerce.stores_legacy
with (security_invoker = true)
as
select
  s.id, s.subdomain, s.store_name, s.domain, s.is_active, s.is_public,
  b.logo_url, b.favicon_url, b.primary_color, b.secondary_color,
  c.contact_email, c.contact_phone, c.address,
  s.currency_code, cs.tax_rate, cs.shipping_enabled, cs.free_shipping_threshold,
  seo.seo_title, seo.seo_description,
  coalesce(k.seo_keywords, array[]::varchar[]) as seo_keywords,
  coalesce(i.metadata, '{}'::jsonb) as metadata,
  s.created_at, s.updated_at, s.deleted_at
from ecommerce.stores s
left join ecommerce.store_branding b on b.store_id = s.id
left join ecommerce.store_contact c on c.store_id = s.id
left join ecommerce.store_commerce_settings cs on cs.store_id = s.id
left join ecommerce.store_seo seo on seo.store_id = s.id
left join ecommerce.store_integrations i on i.store_id = s.id
left join (
  select store_id, array_agg(keyword order by keyword) as seo_keywords
  from ecommerce.store_seo_keywords
  group by store_id
) k on k.store_id = s.id;

grant select on ecommerce.stores_legacy to anon, authenticated, service_role;

-- Column-level privilege re-grant without the dropped Shopify column.
grant select (store_id, metadata, updated_at) on ecommerce.store_integrations to anon, authenticated;

commit;
