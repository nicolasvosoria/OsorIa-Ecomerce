"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useStore } from "@/contexts/store-context";
import {
  getHomeDiscountPopupStorageKey,
  isHomeDiscountPopupEligible,
  type PublicHomeDiscountPopupConfig,
} from "@/lib/home-discount-popup";

function getStorageSnapshot(storageKey: string): Record<string, string | null> {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    [storageKey]: window.localStorage.getItem(storageKey),
  };
}

function persistDismissal(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    storageKey,
    JSON.stringify({ dismissedAt: new Date().toISOString() }),
  );
}

function dismissPopup(storageKey: string, onDismiss: () => void) {
  persistDismissal(storageKey);
  onDismiss();
}

async function copyCoupon(coupon: string) {
  await navigator.clipboard.writeText(coupon);
  toast.success("Cupon copiado");
}

function PopupCard({
  config,
  onDismiss,
  storageKey,
  previewMode = false,
}: {
  config: PublicHomeDiscountPopupConfig;
  onDismiss: () => void;
  storageKey: string;
  previewMode?: boolean;
}) {
  const handleCopy = async () => {
    if (previewMode) {
      return;
    }

    await copyCoupon(config.coupon);
    dismissPopup(storageKey, onDismiss);
  };

  const handleRedirect = () => {
    if (previewMode) {
      return;
    }

    dismissPopup(storageKey, onDismiss);
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 sm:left-auto sm:right-4 sm:max-w-md">
      <div className="overflow-hidden rounded-2xl border bg-background/95 shadow-2xl backdrop-blur">
        <button
          type="button"
          aria-label="Cerrar popup"
          className="absolute right-3 top-3 rounded-full border bg-background/80 p-1 text-muted-foreground transition hover:text-foreground"
          onClick={() => {
            if (previewMode) {
              onDismiss();
              return;
            }

            dismissPopup(storageKey, onDismiss);
          }}
        >
          <X className="h-4 w-4" />
        </button>

        {config.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.imageUrl}
            alt={config.title}
            className="h-40 w-full object-cover"
          />
        ) : null}

        <div className="space-y-3 p-5">
          <div className="space-y-1 pr-8">
            <p className="text-lg font-semibold leading-tight text-foreground">
              {config.title}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {config.text}
            </p>
          </div>

          {config.coupon ? (
            <div className="rounded-xl border border-dashed bg-muted/50 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Cupon
              </p>
              <p className="text-base font-semibold text-foreground">
                {config.coupon}
              </p>
            </div>
          ) : null}

          {config.ctaMode === "redirect" && config.ctaUrl ? (
            previewMode ? (
              <Button className="w-full" disabled>
                {config.ctaText}
              </Button>
            ) : (
              <Button asChild className="w-full">
                <a href={config.ctaUrl} onClick={handleRedirect}>
                  {config.ctaText}
                </a>
              </Button>
            )
          ) : (
            <Button
              className="w-full"
              onClick={handleCopy}
              disabled={previewMode}
            >
              {config.ctaText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function HomeDiscountPopupPreview({
  config,
  onDismiss,
}: {
  config: PublicHomeDiscountPopupConfig;
  onDismiss: () => void;
}) {
  return (
    <PopupCard
      config={config}
      storageKey="home-discount-popup-preview"
      onDismiss={onDismiss}
      previewMode
    />
  );
}

export function HomeDiscountPopup() {
  const pathname = usePathname();
  const { store } = useStore();
  const [isVisible, setIsVisible] = useState(false);

  const config = store?.homeDiscountPopup ?? null;
  const storageKey = useMemo(() => {
    if (!store?.id || !config?.fingerprint) {
      return null;
    }

    return getHomeDiscountPopupStorageKey(store.id, config.fingerprint);
  }, [config?.fingerprint, store?.id]);

  useEffect(() => {
    setIsVisible(false);

    if (!config || !storageKey) {
      return;
    }

    const eligibility = isHomeDiscountPopupEligible({
      config,
      pathname,
      now: new Date(),
      storageKey,
      storageSnapshot: getStorageSnapshot(storageKey),
    });

    if (!eligibility.eligible) {
      return;
    }

    const showTimer = window.setTimeout(() => {
      setIsVisible(true);
    }, config.delaySeconds * 1000);

    return () => {
      window.clearTimeout(showTimer);
    };
  }, [config, pathname, storageKey]);

  useEffect(() => {
    if (!isVisible || !config || !storageKey) {
      return;
    }

    const hideTimer = window.setTimeout(() => {
      dismissPopup(storageKey, () => setIsVisible(false));
    }, config.visibleDurationSeconds * 1000);

    return () => {
      window.clearTimeout(hideTimer);
    };
  }, [config, isVisible, storageKey]);

  if (!config || !storageKey || !isVisible) {
    return null;
  }

  return (
    <PopupCard
      config={config}
      storageKey={storageKey}
      onDismiss={() => setIsVisible(false)}
    />
  );
}
