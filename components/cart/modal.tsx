'use client';

import { ArrowRight, PlusCircleIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useCart } from './cart-context';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';
import { Loader } from '../ui/loader';
import { CartItemCard } from './cart-item';
import { buildShopifyCartSummary } from '@/lib/cart/cart-summary';
import { useBodyScrollLock } from '@/lib/hooks/use-body-scroll-lock';
import { useLanguage } from '@/contexts/language-context';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Cart } from '../../lib/shopify/types';
import { CheckoutOptionsDialog } from './checkout-options-dialog';

const CartContainer = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <div className={cn('px-3 md:px-4', className)}>{children}</div>;
};

const CartItems = ({ closeCart }: { closeCart: () => void }) => {
  const { cart } = useCart();
  const { language, t } = useLanguage();
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);

  if (!cart) return <></>;

  const summary = buildShopifyCartSummary(cart, language);

  return (
    <>
      <div className="flex flex-col justify-between h-full overflow-hidden">
        <CartContainer className="flex justify-between text-sm text-muted-foreground">
          <span>{t.cart.products}</span>
          <span>{t.cart.itemsCount.replace('{count}', String(cart.totalQuantity || cart.lines.length))}</span>
        </CartContainer>
        <div className="relative flex-1 min-h-0 py-4 overflow-x-hidden">
          <CartContainer className="overflow-y-auto flex flex-col gap-y-3 h-full scrollbar-hide">
            <AnimatePresence>
              {cart.lines.map(item => (
                <motion.div
                  key={item.merchandise.id}
                  layout
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <CartItemCard item={item} onCloseCart={closeCart} />
                </motion.div>
              ))}
            </AnimatePresence>
          </CartContainer>
        </div>
        <CartContainer>
          <div className="py-4 text-sm text-foreground/50 shrink-0">
            <div className="flex justify-between items-center pb-1 mb-3 border-b border-muted-foreground/20">
              <p>{t.cart.subtotal}</p>
              <p className="text-right text-foreground">{summary.formattedSubtotal}</p>
            </div>
            <div className="flex justify-between items-center pb-1 mb-3 border-b border-muted-foreground/20">
              <p>{t.cart.tax}</p>
              <p className="text-right">{t.cart.calculatedAtCheckout}</p>
            </div>
            <div className="flex justify-between items-center pt-1 pb-1 mb-3 border-b border-muted-foreground/20">
              <p>{t.cart.shipping}</p>
              <p className="text-right">{t.cart.calculatedAtCheckout}</p>
            </div>
            <div className="flex justify-between items-center pt-1 pb-1 mb-1.5 text-lg font-semibold">
              <p>{t.cart.total}</p>
              <p className="text-base text-right text-foreground">{summary.formattedTotal}</p>
            </div>
          </div>
          <CheckoutButton onCheckoutClick={() => setShowCheckoutDialog(true)} />
        </CartContainer>
      </div>
      <CheckoutOptionsDialog
        open={showCheckoutDialog}
        onOpenChange={setShowCheckoutDialog}
        onCloseCart={closeCart}
      />
    </>
  );
};

const serializeCart = (cart: Cart) => {
  return JSON.stringify(
    cart.lines.map(line => ({
      merchandiseId: line.merchandise.id,
      quantity: line.quantity,
    }))
  );
};

export default function CartModal() {
  const { isPending, cart } = useCart();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const serializedCart = useRef(cart ? serializeCart(cart) : undefined);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!cart || isPending) return;

    const newSerializedCart = serializeCart(cart);

    // Initialize on first load
    if (serializedCart.current === undefined) {
      serializedCart.current = newSerializedCart;
      return;
    }

    // Only open cart if items were actually added/changed
    if (serializedCart.current !== newSerializedCart) {
      serializedCart.current = newSerializedCart;
      setIsOpen(true);
    }
  }, [cart, isPending]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const renderCartContent = () => {
    if (!cart) {
      return (
        <CartContainer className="flex flex-1 items-center justify-center text-center text-muted-foreground">
          <div className="flex flex-col items-center gap-3">
            <Loader size="default" />
            <p>{t.cart.loading}</p>
          </div>
        </CartContainer>
      );
    }

    if (cart.lines.length === 0) {
      return (
        <CartContainer className="flex w-full">
          <Link
            href="/shop"
            className="p-2 w-full rounded-lg border border-dashed bg-background border-border"
            onClick={closeCart}
          >
            <div className="flex flex-row gap-6">
              <div className="flex overflow-hidden relative justify-center items-center rounded-sm border border-dashed size-20 shrink-0 border-border">
                <PlusCircleIcon className="size-6 text-muted-foreground" />
              </div>
              <div className="flex flex-col flex-1 gap-2 justify-center 2xl:gap-3">
                <span className="text-lg font-semibold 2xl:text-xl">{t.cart.empty}</span>
                <p className="text-sm text-muted-foreground hover:underline">{t.cart.emptyDescription}</p>
              </div>
            </div>
          </Link>
        </CartContainer>
      );
    }

    return <CartItems closeCart={closeCart} />;
  };

  return (
    <>
      <Button aria-label={t.nav.cart} onClick={openCart} className="uppercase" size={'sm'}>
        <span className="max-md:hidden">{t.nav.cart}</span> ({cart?.totalQuantity || 0})
      </Button>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed inset-0 z-50 bg-foreground/30"
              onClick={closeCart}
              aria-hidden="true"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed top-0 bottom-0 right-0 flex w-full md:w-[500px] p-modal-sides z-50"
            >
              <div className="flex flex-col py-3 w-full rounded bg-muted md:py-4">
                <CartContainer className="flex justify-between items-baseline mb-10">
                  <p className="text-2xl font-semibold">{t.cart.title}</p>
                  <Button size="sm" variant="ghost" aria-label={t.common.close} onClick={closeCart}>
                    {t.common.close}
                  </Button>
                </CartContainer>

                {renderCartContent()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function CheckoutButton({ onCheckoutClick }: { onCheckoutClick: () => void }) {
  const { pending } = useFormStatus();
  const { cart, isPending } = useCart();
  const { t } = useLanguage();

  const isLoading = pending;
  const isDisabled = !cart || cart.lines.length === 0 || isPending;

  return (
    <Button
      type="button"
      aria-label={t.cart.checkout}
      disabled={isDisabled}
      size="lg"
      className="flex relative gap-3 justify-between items-center w-full"
      onClick={onCheckoutClick}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={isLoading ? 'loading' : 'content'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex justify-center items-center w-full"
        >
          {isLoading ? (
            <Loader size="default" />
          ) : (
            <div className="flex justify-between items-center w-full">
              <span>{t.cart.checkout}</span>
              <ArrowRight className="size-6" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Button>
  );
}
