'use client';

import { PlusCircleIcon } from 'lucide-react';
import { Product, ProductVariant } from '@/lib/shopify/types';
import { useMemo, useTransition, useState } from 'react';
import { useCart as useShopifyCart } from './cart-context';
import { useCart as useLocalCart } from '@/contexts/cart-context';
import { Button, ButtonProps } from '../ui/button';
import { useSelectedVariant } from '@/components/products/variant-selector';
import { useParams, useSearchParams } from 'next/navigation';
import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader } from '../ui/loader';
import { getShopifyProductId } from '@/lib/shopify/utils';
import { QuantityModal } from './quantity-modal';
import { formatPrice } from '@/lib/shopify/utils';

interface AddToCartProps extends ButtonProps {
  product: Product;
  iconOnly?: boolean;
  icon?: ReactNode;
}

interface AddToCartButtonProps extends ButtonProps {
  product: Product;
  selectedVariant?: ProductVariant | null;
  iconOnly?: boolean;
  icon?: ReactNode;
  className?: string;
}

const getBaseProductVariant = (product: Product): ProductVariant => {
  return {
    id: product.id,
    title: product.title,
    availableForSale: product.availableForSale,
    selectedOptions: [],
    price: product.priceRange.minVariantPrice,
  };
};

// Función para detectar si es un producto de Supabase (no Shopify)
function isSupabaseProduct(productId: string): boolean {
  // Los IDs de Shopify tienen formato "gid://shopify/Product/..." o "gid://shopify/ProductVariant/..."
  // Los IDs de Supabase son UUIDs o números simples, no tienen ese formato
  return !productId.startsWith('gid://shopify/');
}

export function AddToCartButton({
  product,
  selectedVariant,
  className,
  iconOnly = false,
  icon = <PlusCircleIcon />,
  ...buttonProps
}: AddToCartButtonProps) {
  const shopifyCart = useShopifyCart();
  const localCart = useLocalCart();
  const [isLoading, startTransition] = useTransition();
  const [showQuantityModal, setShowQuantityModal] = useState(false);

  // Resolve variant locally only for variantless products (purely synchronous)
  const resolvedVariant = useMemo(() => {
    if (selectedVariant) return selectedVariant;
    if (product.variants.length === 0) return getBaseProductVariant(product);
    if (product.variants.length === 1) return product.variants[0];
    return undefined;
  }, [selectedVariant, product]);

  const getButtonText = () => {
    if (!product.availableForSale) return 'Agotado';
    if (!resolvedVariant) return 'Selecciona uno';
    return 'Añadir al carrito';
  };

  const isDisabled = !product.availableForSale || !resolvedVariant || isLoading;

  const getLoaderSize = () => {
    const buttonSize = buttonProps.size;
    if (buttonSize === 'sm' || buttonSize === 'icon-sm' || buttonSize === 'icon') return 'sm';
    if (buttonSize === 'icon-lg') return 'default';
    if (buttonSize === 'lg') return 'lg';
    return 'default';
  };

  const handleAddToCart = (quantity: number) => {
    if (!resolvedVariant) return;

    startTransition(async () => {
      // Detectar si es producto de Supabase
      if (isSupabaseProduct(product.id)) {
        // Usar el carrito local para productos de Supabase
        const variantPrice = resolvedVariant.price.amount;
        const formattedPrice = formatPrice(variantPrice, resolvedVariant.price.currencyCode);
        
        // Obtener precio original si existe (compareAtPrice)
        let originalPrice: string | undefined;
        let salePrice: string | undefined;
        
        if (product.compareAtPrice && parseFloat(product.compareAtPrice.amount) > parseFloat(variantPrice)) {
          // Hay descuento
          originalPrice = formatPrice(product.compareAtPrice.amount, product.compareAtPrice.currencyCode);
          salePrice = formattedPrice; // Precio con descuento
        }

        localCart.addToCart({
          id: resolvedVariant.id,
          name: product.title,
          price: formattedPrice, // Precio base
          image: product.featuredImage?.url || product.images?.[0]?.url || '/placeholder.jpg',
          category: product.categoryId,
          originalPrice: originalPrice,
          salePrice: salePrice,
        }, quantity);
      } else {
        // Usar el carrito de Shopify para productos de Shopify
        await shopifyCart.addItem(resolvedVariant, product, quantity);
      }
    });
  };

  return (
    <>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (resolvedVariant) {
            setShowQuantityModal(true);
          }
        }}
        className={className}
      >
        <Button
          type="submit"
          aria-label={!resolvedVariant ? 'Selecciona uno' : 'Añadir al carrito'}
          disabled={isDisabled}
          className={iconOnly ? undefined : 'flex relative justify-between items-center w-full'}
          {...buttonProps}
        >
        <AnimatePresence initial={false} mode="wait">
          {iconOnly ? (
            <motion.div
              key={isLoading ? 'loading' : 'icon'}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex justify-center items-center"
            >
              {isLoading ? <Loader size={getLoaderSize()} /> : <span className="inline-block">{icon}</span>}
            </motion.div>
          ) : (
            <motion.div
              key={isLoading ? 'loading' : getButtonText()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex justify-center items-center w-full"
            >
              {isLoading ? (
                <Loader size={getLoaderSize()} />
              ) : (
                <div className="flex justify-between items-center w-full">
                  <span>{getButtonText()}</span>
                  <PlusCircleIcon />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    </form>

    <QuantityModal
      open={showQuantityModal}
      onOpenChange={setShowQuantityModal}
      onConfirm={handleAddToCart}
      productName={product.title}
      productImage={product.featuredImage?.url || product.images?.[0]?.url}
      maxQuantity={99}
      initialQuantity={1}
    />
    </>
  );
}

export function AddToCart({
  product,
  className,
  iconOnly = false,
  icon = <PlusCircleIcon />,
  ...buttonProps
}: AddToCartProps) {
  const { variants } = product;
  const selectedVariant = useSelectedVariant(product);
  const pathname = useParams<{ handle?: string; slug?: string }>();
  const searchParams = useSearchParams();

  const hasNoVariants = variants.length === 0;
  const defaultVariantId = variants.length === 1 ? variants[0]?.id : undefined;
  const selectedVariantId = selectedVariant?.id || defaultVariantId;
  // Verificar si estamos en la página del producto por handle o slug
  const isTargetingProduct =
    pathname.handle === product.handle ||
    pathname.slug === product.handle ||
    searchParams.get('pid') === getShopifyProductId(product.id);

  const resolvedVariant = useMemo(() => {
    if (hasNoVariants) return getBaseProductVariant(product);
    // Si estamos en la página del producto o hay una variante por defecto, permitir agregar al carrito
    if (isTargetingProduct || defaultVariantId) {
      return variants.find(variant => variant.id === selectedVariantId) || (defaultVariantId ? variants[0] : undefined);
    }
    return undefined;
  }, [hasNoVariants, product, isTargetingProduct, defaultVariantId, variants, selectedVariantId]);

  return (
    <AddToCartButton
      product={product}
      selectedVariant={resolvedVariant}
      className={className}
      iconOnly={iconOnly}
      icon={icon}
      {...buttonProps}
    />
  );
}
