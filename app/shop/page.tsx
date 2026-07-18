import ProductList from './components/product-list';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductGrid } from './components/product-grid';
import { ProductCardSkeleton } from './components/product-card-skeleton';
import { resolveStoreNameForMetadata } from '@/lib/metadata/store-name';

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await resolveStoreNameForMetadata();
  return {
    title: `${storeName} | Tienda`,
    description: `Explorá el catálogo de ${storeName}.`,
  };
}

// Cache is handled via 'use cache' directive in getProducts()
export default async function Shop(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <>
      <Suspense
        fallback={
          <ProductGrid>
            {Array.from({ length: 12 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </ProductGrid>
        }
      >
        <ProductList collection="" searchParams={searchParams} />
      </Suspense>
    </>
  );
}
