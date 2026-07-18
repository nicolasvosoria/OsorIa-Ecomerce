import { getCollections, getShopProductsPage } from '@/lib/products';
import type { ShopServerFilters } from '@/lib/commerce/types';
import { getShopConfig } from '@/lib/supabase/shop-config-api';
import type { ShopConfig } from '@/lib/shop/shop-config';
import { ProductListContent } from './product-list-content';

interface ProductListProps {
  collection: string;
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function ProductList({ collection, searchParams }: ProductListProps) {
  const config = await getShopConfig();
  const filters = resolveShopServerFilters(collection, searchParams, config);
  const page = await getShopProductsPage(filters);
  const collections = await getCollections();

  return (
    <ProductListContent
      products={page.products}
      total={page.total}
      hasMore={page.hasMore}
      collections={collections}
      filters={filters}
      config={config}
    />
  );
}

// D20: the URL's `?sort` wins whenever the sort control stays visible; a
// hidden control (`config.filters.sort === false`) ignores it outright, and
// either way a missing/hidden sort falls back to the store's configured
// default — `null` resolving to `undefined`, today's relevance order.
export function resolveShopServerFilters(
  collection: string,
  searchParams: { [key: string]: string | string[] | undefined } | undefined,
  config: ShopConfig
): ShopServerFilters {
  const urlSort = typeof searchParams?.sort === 'string' ? searchParams.sort : undefined;

  return {
    collection,
    sort: resolveEffectiveSort(urlSort, config),
    search: typeof searchParams?.q === 'string' ? searchParams.q : undefined,
    onSale: config.filters.enOferta && searchParams?.oferta === '1',
    priceMin: config.filters.price ? parsePriceParam(searchParams?.price_min) : undefined,
    priceMax: config.filters.price ? parsePriceParam(searchParams?.price_max) : undefined,
  };
}

function resolveEffectiveSort(urlSort: string | undefined, config: ShopConfig): string | undefined {
  if (config.filters.sort && urlSort) return urlSort;
  return config.defaultSort ?? undefined;
}

function parsePriceParam(value: string | string[] | undefined): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
