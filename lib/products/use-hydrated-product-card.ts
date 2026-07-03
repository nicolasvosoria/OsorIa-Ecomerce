"use client";

import { useEffect, useState } from "react";
import { getItemById } from "@/lib/supabase/products-api";
import { toCommerceProductCard } from "@/lib/products/adapter";
import type { CommerceProductCard } from "@/lib/types/products";

export function useHydratedProductCard(
  productId: string,
): { card: CommerceProductCard | null } {
  const [fetched, setFetched] = useState<{
    id: string;
    card: CommerceProductCard | null;
  } | null>(null);

  useEffect(() => {
    if (!productId) return;

    let active = true;
    getItemById(productId)
      .then((item) => {
        if (active)
          setFetched({ id: productId, card: item ? toCommerceProductCard(item) : null });
      })
      .catch((error) => {
        console.error("Error fetching hydrated product card:", error);
        if (active) setFetched({ id: productId, card: null });
      });

    return () => {
      active = false;
    };
  }, [productId]);

  const card = fetched && fetched.id === productId ? fetched.card : null;
  return { card };
}
