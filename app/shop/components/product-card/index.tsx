import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { Product } from '@/lib/commerce/types';
import { AddToCart, AddToCartButton } from '@/components/cart/add-to-cart';
import { resolveProductPricing } from '@/lib/commerce/utils';
import { VisualProductCard } from '@/components/products/visual-product-card';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { Button } from '@/components/ui/button';
import type { CommerceProductCard } from '@/lib/types/products';
import { VariantSelector } from '../variant-selector';

export const ProductCard = ({ product }: { product: Product }) => {
  const hasNoOptions = product.options.length === 0;
  const hasOneOptionWithOneValue = product.options.length === 1 && product.options[0].values.length === 1;
  const justHasColorOption = product.options.length === 1 && product.options[0].name.toLowerCase() === 'color';
  const isCombo = product.productKind === 'combo';

  const renderInCardAddToCart = hasNoOptions || hasOneOptionWithOneValue || justHasColorOption;
  const showVariantSelector = renderInCardAddToCart && !isCombo;

  return (
    <VisualProductCard
      product={toShopProductCard(product, isCombo)}
      showCta={false}
      favoriteSlot={<WishlistButton product={product} />}
      actionSlot={
        <ProductCardActions
          product={product}
          isCombo={isCombo}
          showVariantSelector={showVariantSelector}
          renderInCardAddToCart={renderInCardAddToCart}
        />
      }
    />
  );
};

interface ProductCardActionsProps {
  product: Product;
  isCombo: boolean;
  showVariantSelector: boolean;
  renderInCardAddToCart: boolean;
}

function ProductCardActions({
  product,
  isCombo,
  showVariantSelector,
  renderInCardAddToCart,
}: ProductCardActionsProps) {
  return (
    <div className="flex flex-col gap-2">
      {showVariantSelector && (
        <Suspense fallback={null}>
          <VariantSelector product={product} />
        </Suspense>
      )}

      {isCombo && (
        <Button size="sm" variant="outline" className="w-full rounded-[var(--button-radius)]" asChild>
          <Link href={`/products/${product.handle}`}>Ver detalle</Link>
        </Button>
      )}

      {renderInCardAddToCart ? (
        <Suspense fallback={<AddToCartButton className="w-full" product={product} size="sm" />}>
          <AddToCart className="w-full" size="sm" product={product} />
        </Suspense>
      ) : (
        <Button size="sm" variant="default" className="w-full rounded-[var(--button-radius)]" asChild>
          <Link href={`/products/${product.handle}`}>
            <div className="flex justify-between items-center w-full">
              <span>Ver producto</span>
              <ArrowRightIcon />
            </div>
          </Link>
        </Button>
      )}
    </div>
  );
}

function toShopProductCard(product: Product, isCombo: boolean): CommerceProductCard {
  return {
    id: product.id,
    title: product.title,
    href: `/products/${product.handle}`,
    imageUrl: product.featuredImage.url,
    imageAlt: product.featuredImage.altText || product.title,
    price: resolveProductPricing(product.priceRange.minVariantPrice, product.compareAtPrice),
    badges: isCombo ? [{ label: 'Combo', tone: 'combo' }] : [],
    availableForSale: product.availableForSale,
  };
}
