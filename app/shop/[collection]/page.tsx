import { Metadata } from 'next';
import { getCollection, getCollections } from '@/lib/shopify';
import { notFound } from 'next/navigation';
import ProductList from '../components/product-list';

// Generate static params for all collections at build time
export async function generateStaticParams() {
  try {
    const collections = await getCollections();

    // Next.js 16 with Cache Components requires at least one result
    if (collections.length === 0) {
      // Return a default collection to satisfy the requirement
      return [{ collection: 'all' }];
    }

    return collections.map(collection => ({
      collection: collection.handle,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    // Return a default collection to satisfy Next.js requirement
    return [{ collection: 'all' }];
  }
}

// Cache is handled via 'use cache' directive in getCollection()
export async function generateMetadata(props: { params: Promise<{ collection: string }> }): Promise<Metadata> {
  const params = await props.params;
  const collection = await getCollection(params.collection);

  if (!collection) return notFound();

  return {
    title: `ACME Store | ${collection.seo?.title || collection.title}`,
    description: collection.seo?.description || collection.description || `${collection.title} products`,
  };
}

export default async function ShopCategory(props: {
  params: Promise<{ collection: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  return <ProductList collection={params.collection} searchParams={searchParams} />;
}
