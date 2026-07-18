'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Product, Collection, ShopServerFilters } from '@/lib/commerce/types';
import { SHOP_PAGE_SIZE } from '@/lib/commerce/constants';
import { DEFAULT_SHOP_CONFIG, type ShopConfig } from '@/lib/shop/shop-config';
import { ProductCard } from './product-card';
import { ShopFilterBar } from './shop-filter-bar';
import { ActiveFilterChips } from './active-filter-chips';
import { ShopHeader } from './shop-header';
import { useProducts } from '../providers/products-provider';
import { useEffectiveShopConfig } from '../hooks/use-effective-shop-config';
import { loadMoreShopProducts } from '../actions/load-more';
import { useQueryState, parseAsArrayOf, parseAsString } from 'nuqs';
import { ProductGrid } from './product-grid';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProductListContentProps {
  products: Product[];
  collections: Collection[];
  total: number;
  hasMore: boolean;
  filters: ShopServerFilters;
  config?: ShopConfig;
}

// Client-side color filtering function
function filterProductsByColors(products: Product[], colors: string[]): Product[] {
  if (!colors || colors.length === 0) {
    return products;
  }

  const filteredProducts = products.filter(product => {
    // Check if product has any variants with the selected colors
    const hasMatchingColor = product.variants?.some((variant: any) => {
      if (!variant.selectedOptions) return false;

      // Look for color option in variant
      return variant.selectedOptions.some((option: any) => {
        const isColorOption =
          option.name.toLowerCase().includes('color') || option.name.toLowerCase().includes('colour');

        if (!isColorOption) return false;

        // Check if this variant's color matches any of the selected colors
        const variantColor = option.value.toLowerCase();
        return colors.some(
          selectedColor =>
            selectedColor.toLowerCase() === variantColor ||
            variantColor.includes(selectedColor.toLowerCase()) ||
            selectedColor.toLowerCase().includes(variantColor)
        );
      });
    });

    // Also check product-level options as fallback
    if (!hasMatchingColor && product.options) {
      const colorOption = product.options.find(
        (opt: any) => opt.name.toLowerCase().includes('color') || opt.name.toLowerCase().includes('colour')
      );

      if (colorOption && colorOption.values) {
        return colorOption.values.some((value: any) => {
          // Handle both string values and object values with .name property
          const colorValue = typeof value === 'string' ? value : value.name || value.id;
          const optionColor = colorValue.toLowerCase();
          return colors.some(
            selectedColor =>
              selectedColor.toLowerCase() === optionColor ||
              optionColor.includes(selectedColor.toLowerCase()) ||
              selectedColor.toLowerCase().includes(optionColor)
          );
        });
      }
    }

    return hasMatchingColor;
  });

  return filteredProducts;
}

// Combos are re-fetched on every page, so appended results are de-duplicated by id.
function mergeUniqueProducts(current: Product[], incoming: Product[]): Product[] {
  const seenIds = new Set(current.map(product => product.id));
  const additions = incoming.filter(product => !seenIds.has(product.id));
  return additions.length > 0 ? [...current, ...additions] : current;
}

export function ProductListContent({
  products,
  collections,
  total,
  hasMore: initialHasMore,
  filters,
  config = DEFAULT_SHOP_CONFIG,
}: ProductListContentProps) {
  const { setLoadedProducts: publishProducts, setTotal: publishTotal } = useProducts();
  const effectiveConfig = useEffectiveShopConfig(config);

  const [loadedProducts, setLoadedProducts] = useState<Product[]>(products);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(SHOP_PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [seededFirstPage, setSeededFirstPage] = useState(products);

  // Get current color filters from URL
  const [colorFilters] = useQueryState('fcolor', parseAsArrayOf(parseAsString).withDefault([]));
  const [kindFilter] = useQueryState('kind', parseAsString.withDefault('all'));

  // A new server page (a filter change re-renders the RSC) resets the accumulated list.
  if (products !== seededFirstPage) {
    setSeededFirstPage(products);
    setLoadedProducts(products);
    setHasMore(initialHasMore);
    setNextOffset(SHOP_PAGE_SIZE);
  }

  // Apply client-side color/kind filtering to the accumulated set. A hidden
  // filter (config.filters.tipo/color === false) ignores its URL param
  // entirely, same as if it were never set.
  const filteredProducts = useMemo(() => {
    const kindFilteredProducts =
      effectiveConfig.filters.tipo && kindFilter === 'combo'
        ? loadedProducts.filter(product => product.productKind === 'combo' || product.tags.includes('combo'))
        : loadedProducts;

    if (!effectiveConfig.filters.color || !colorFilters || colorFilters.length === 0) {
      return kindFilteredProducts;
    }
    return filterProductsByColors(kindFilteredProducts, colorFilters);
  }, [loadedProducts, colorFilters, kindFilter, effectiveConfig.filters.tipo, effectiveConfig.filters.color]);

  // Publish the accumulated set + server total so the mobile filter surface stays in sync
  useEffect(() => {
    publishProducts(loadedProducts);
    publishTotal(total);
  }, [loadedProducts, total, publishProducts, publishTotal]);

  // Tracks the latest committed first page so an in-flight load can tell if a filter changed.
  const activeFirstPage = useRef(products);
  useEffect(() => {
    activeFirstPage.current = products;
  }, [products]);

  async function handleLoadMore() {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const requestedFirstPage = products;
    try {
      const page = await loadMoreShopProducts({ ...filters, offset: nextOffset });
      // A filter change since the request replaced the first page; drop the stale results.
      if (activeFirstPage.current !== requestedFirstPage) return;
      const merged = mergeUniqueProducts(loadedProducts, page.products);
      setLoadedProducts(merged);
      setNextOffset(nextOffset + SHOP_PAGE_SIZE);
      setHasMore(page.hasMore && merged.length > loadedProducts.length);
    } catch (error) {
      console.error('Error al cargar más productos:', error);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <>
      <ShopHeader />
      <ShopFilterBar
        className="max-md:hidden"
        collections={collections}
        products={loadedProducts}
        resultCount={total}
        config={effectiveConfig}
      />
      <ActiveFilterChips collections={collections} products={loadedProducts} config={effectiveConfig} />

      {filteredProducts.length > 0 ? (
        <ProductGrid>
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ProductGrid>
      ) : (
        <div
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-2',
            'rounded-card bg-muted px-4 py-16 text-center'
          )}
        >
          <p className="text-muted-foreground font-medium">No se encontraron productos</p>
        </div>
      )}

      {hasMore && (
        <div className="flex flex-col items-center gap-3 pt-2">
          {filteredProducts.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Mostrando {loadedProducts.length} de {total}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="rounded-[var(--button-radius)] font-medium"
          >
            {isLoadingMore ? 'Cargando...' : 'Cargar más'}
          </Button>
        </div>
      )}
    </>
  );
}
