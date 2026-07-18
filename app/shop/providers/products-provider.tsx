'use client';

import { Product } from '@/lib/commerce/types';
import { createContext, useContext, useState, ReactNode } from 'react';

interface ProductsContextValue {
  loadedProducts: Product[];
  setLoadedProducts: (products: Product[]) => void;
  total: number;
  setTotal: (total: number) => void;
}

const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [loadedProducts, setLoadedProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);

  return (
    <ProductsContext.Provider value={{ loadedProducts, setLoadedProducts, total, setTotal }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
}
