'use client';

import { PlusCircleIcon } from 'lucide-react';
import { Product, ProductVariant } from '@/lib/commerce/types';
import { useMemo, useTransition, useState } from 'react';
import { useCart as useLocalCart } from '@/contexts/cart-context';
import { Button, ButtonProps } from '../ui/button';
import { useSelectedVariant } from '@/components/products/variant-selector';
import { useParams, useSearchParams } from 'next/navigation';
import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader } from '../ui/loader';
import { getProductId } from '@/lib/commerce/utils';
import { QuantityModal } from './quantity-modal';
import { formatPrice } from '@/lib/commerce/utils';

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

type ItemContext = {
  productId: string;
  isCombo: boolean;
  isRealVariant: boolean;
};

const CART_QUANTITY_CEILING = 99;

const getBaseProductVariant = (product: Product): ProductVariant => {
  return {
    id: product.id,
    title: product.title,
    availableForSale: product.availableForSale,
    selectedOptions: [],
    price: product.priceRange.minVariantPrice,
  };
};

function isComboProduct(product: Product): boolean {
  return product.productKind === 'combo' || product.tags.includes('combo');
}

export function AddToCartButton({
  product,
  selectedVariant,
  className,
  iconOnly = false,
  icon = <PlusCircleIcon />,
  ...buttonProps
}: AddToCartButtonProps) {
  const localCart = useLocalCart();
  const [isLoading, startTransition] = useTransition();
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectableQuantity, setSelectableQuantity] = useState<number | null>(null);

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

  const resolveItemContext = (variantId: string): ItemContext => {
    const productId = product.id;
    const isCombo = isComboProduct(product);
    const isRealVariant =
      !isCombo && variantId !== productId && product.variants.length > 1;
    return { productId, isCombo, isRealVariant };
  };

  const readStock = async (
    variantId: string,
    { productId, isCombo, isRealVariant }: ItemContext,
  ): Promise<number | null> => {
    if (isCombo) {
      const { getComboStock } = await import('@/lib/supabase/combos-api');
      return getComboStock(productId);
    }

    const { getProductStock, getVariantStock } = await import('@/lib/supabase/products-read');
    return isRealVariant ? getVariantStock(variantId) : getProductStock(productId);
  };

  const cartQuantityFor = (variantId: string) =>
    localCart.items.find((item) => item.id === variantId)?.quantity ?? 0;

  const notifySoldOut = async () => {
    const { toast } = await import('sonner');
    toast.error(`${product.title} está agotado`, { duration: 4000 });
  };

  const notifyCartAlreadyHoldsAll = async () => {
    const { toast } = await import('sonner');
    toast.error(`Ya tienes la cantidad máxima disponible de ${product.title} en tu carrito`, {
      duration: 4000,
    });
  };

  const openQuantityModal = (variantId: string) => {
    setSelectableQuantity(null);
    setShowQuantityModal(true);

    void readStock(variantId, resolveItemContext(variantId))
      .then(async (stock) => {
        if (stock === null) return;

        const remaining = stock - cartQuantityFor(variantId);
        if (remaining > 0) {
          setSelectableQuantity(remaining);
          return;
        }

        setShowQuantityModal(false);
        await (stock === 0 ? notifySoldOut() : notifyCartAlreadyHoldsAll());
      })
      .catch((error: unknown) => {
        console.error('[Cart] Error al resolver el stock disponible:', error);
      });
  };

  const handleAddToCart = (quantity: number) => {
    if (!resolvedVariant) return;

    startTransition(async () => {
      const variantId = resolvedVariant.id;
      const itemContext = resolveItemContext(variantId);
      const { isCombo, isRealVariant } = itemContext;

      try {
        const stock = await readStock(variantId, itemContext);

        if (stock !== null) {
          if (stock === 0) {
            await notifySoldOut();
            return;
          }

          const remaining = stock - cartQuantityFor(variantId);

          if (remaining <= 0) {
            await notifyCartAlreadyHoldsAll();
            return;
          }

          if (quantity > remaining) {
            const { toast } = await import('sonner');
            toast.warning(`Solo hay ${remaining} unidad${remaining !== 1 ? 'es' : ''} disponible${remaining !== 1 ? 's' : ''} de ${product.title}. Se agregará ${remaining} ${remaining === 1 ? 'unidad' : 'unidades'}`, {
              duration: 4000,
            });
            quantity = remaining;
          }
        }
      } catch (error: any) {
        console.error('[Cart] Error al validar stock:', error);
      }

      const variantPrice = resolvedVariant.price.amount;
      const formattedPrice = formatPrice(variantPrice, resolvedVariant.price.currencyCode);

      let originalPrice: string | undefined;
      let salePrice: string | undefined;

      if (product.compareAtPrice && parseFloat(product.compareAtPrice.amount) > parseFloat(variantPrice)) {
        originalPrice = formatPrice(product.compareAtPrice.amount, product.compareAtPrice.currencyCode);
        salePrice = formattedPrice;
      }

      localCart.addToCart({
        id: resolvedVariant.id,
        name: product.title,
        price: formattedPrice,
        image: product.featuredImage?.url || product.images?.[0]?.url || '/placeholder.jpg',
        category: product.categoryName,
        originalPrice: originalPrice,
        salePrice: salePrice,
        productId: isCombo ? undefined : product.id,
        variantId: isRealVariant ? variantId : undefined,
        productSlug: product.handle,
        itemKind: isCombo ? 'combo' : 'product',
        comboId: isCombo ? product.id : undefined,
        comboDetails: product.comboDetails,
        unitPriceAmount: Number(variantPrice),
        currencyCode: resolvedVariant.price.currencyCode,
      }, quantity);

      const { toast } = await import('sonner');
      toast.success(`${quantity} ${quantity === 1 ? 'unidad' : 'unidades'} de ${product.title} agregada${quantity === 1 ? '' : 's'} al carrito`, {
        duration: 3000,
      });
    });
  };

  return (
    <>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (resolvedVariant) {
            openQuantityModal(resolvedVariant.id);
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
      maxQuantity={Math.min(selectableQuantity ?? CART_QUANTITY_CEILING, CART_QUANTITY_CEILING)}
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
    searchParams.get('pid') === getProductId(product.id);

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
