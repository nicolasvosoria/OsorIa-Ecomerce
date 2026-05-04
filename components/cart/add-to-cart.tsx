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
        const variantId = resolvedVariant.id;
        const productId = product.id;
        const isCombo = isComboProduct(product);
        
        // Determinar si es una variante o el producto base
        // Si variantId !== productId, es una variante real
        // Si variantId === productId, es el producto base o una variante por defecto
        const isRealVariant = !isCombo && variantId !== productId && product.variants && product.variants.length > 1;
        
        // Validar stock antes de agregar al carrito
        try {
          const { getProductStock, getVariantStock } = await import('@/lib/supabase/products-api');
          
          let stock: number | null = null;
          
          // Si es una variante real, obtener stock de la variante
          if (isRealVariant) {
            stock = await getVariantStock(variantId);
          } else {
            // Es el producto base o variante por defecto, obtener stock del producto
            stock = await getProductStock(productId);
          }
          
          // Si el producto rastrea inventario y hay stock limitado
          if (stock !== null) {
            // Obtener cantidad actual en el carrito para este item
            const existingItem = localCart.items.find(item => item.id === variantId);
            const currentCartQuantity = existingItem?.quantity || 0;
            const totalRequestedQuantity = currentCartQuantity + quantity;
            
            // Validar que haya suficiente stock
            if (stock === 0) {
              const { toast } = await import('sonner');
              toast.error(`${product.title} está agotado`, {
                duration: 4000,
              });
              return;
            }
            
            if (totalRequestedQuantity > stock) {
              const availableQuantity = stock - currentCartQuantity;
              const { toast } = await import('sonner');
              
              if (availableQuantity <= 0) {
                toast.error(`Ya tienes la cantidad máxima disponible de ${product.title} en tu carrito`, {
                  duration: 4000,
                });
              } else {
                toast.warning(`Solo hay ${availableQuantity} unidad${availableQuantity !== 1 ? 'es' : ''} disponible${availableQuantity !== 1 ? 's' : ''} de ${product.title}. Se agregará ${availableQuantity} ${availableQuantity === 1 ? 'unidad' : 'unidades'}`, {
                  duration: 4000,
                });
                // Ajustar cantidad al stock disponible
                quantity = availableQuantity;
              }
              
              if (availableQuantity <= 0) {
                return;
              }
            }
          }
        } catch (error: any) {
          // Si falla la validación, registrar error pero permitir agregar (no bloquear)
          console.error('[Cart] Error al validar stock:', error);
        }
        
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
          productId: isCombo ? undefined : product.id,
          variantId: isRealVariant ? variantId : undefined,
          productSlug: product.handle,
          itemKind: isCombo ? 'combo' : 'product',
          comboId: isCombo ? product.id : undefined,
          comboDetails: product.comboDetails,
          unitPriceAmount: Number(variantPrice),
          currencyCode: resolvedVariant.price.currencyCode,
        }, quantity);
        
        // Mostrar notificación de éxito
        const { toast } = await import('sonner');
        toast.success(`${quantity} ${quantity === 1 ? 'unidad' : 'unidades'} de ${product.title} agregada${quantity === 1 ? '' : 's'} al carrito`, {
          duration: 3000,
        });
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
