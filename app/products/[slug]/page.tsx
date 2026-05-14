import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getItemBySlug, getRelatedItems } from '@/lib/supabase/products-api';
import { formatPrice } from '@/lib/shopify/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Check, AlertCircle, PackageCheck } from 'lucide-react';
import { AddToCart } from '@/components/cart/add-to-cart';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { adaptSupabaseProduct } from '@/lib/products/adapter';
import { cn } from '@/lib/utils';
import { ProductImageGallery } from './components/product-image-gallery';
import { RelatedProductsCarousel } from './components/related-products-carousel';
import { PublicProductMetadata } from '@/components/products/public-product-metadata';
import { toRelatedProductCards } from '@/lib/products/public-product-payload';

// Generar parámetros estáticos para productos
// Con cacheComponents habilitado, debe retornar al menos un resultado
export async function generateStaticParams() {
  try {
    // Intentar obtener al menos un producto para validación
    const { getItems } = await import('@/lib/supabase/products-api');
    const result = await getItems({ limit: 1, is_active: true, is_available_for_sale: true });
    
    if (result.items.length > 0 && result.items[0].item_slug) {
      return [{
        slug: result.items[0].item_slug,
      }];
    }
    
    // Si no hay productos, retornar un slug dummy para cumplir con el requisito
    return [{ slug: 'placeholder' }];
  } catch (error) {
    // Si falla, retornar un slug dummy para cumplir con el requisito de cacheComponents
    if (process.env.NODE_ENV === 'development') {
      console.error('Error generating static params for products:', error);
    }
    return [{ slug: 'placeholder' }];
  }
}

// Generar metadata para SEO
export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const params = await props.params;
    const product = await getItemBySlug(params.slug);

    if (!product) {
      return {
        title: 'Producto no encontrado',
      };
    }

    const imageUrl = product.primary_image_url || (product.images && product.images[0]?.image_url);

    return {
      title: product.seo_title || product.item_name,
      description: product.seo_description || product.item_description || product.item_name,
      openGraph: imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                alt: product.primary_image_alt || product.item_name,
              },
            ],
          }
        : undefined,
    };
  } catch {
    return {
      title: 'Producto',
    };
  }
}

async function ProductContent({ slug }: { slug: string }) {
  let product;
  try {
    // Primero intentar buscar por slug
    product = await getItemBySlug(slug);
    
    // Si no se encuentra por slug, intentar buscar por ID (en caso de que el slug sea un UUID)
    if (!product) {
      const { getItemById } = await import('@/lib/supabase/products-api');
      // Solo intentar por ID si el slug parece ser un UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(slug)) {
        product = await getItemById(slug);
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching product:', error);
    }
    return notFound();
  }

  if (!product) {
    return notFound();
  }

  const relatedProducts = await getRelatedItems(product.id, product.category_id ?? null, 6);

  // Adaptar producto para usar con componentes existentes
  const adaptedProduct = adaptSupabaseProduct(product);

  // Obtener todas las imágenes del producto (primary + imágenes de item_images)
  const allImages = [
    ...(product.primary_image_url ? [{
      url: product.primary_image_url,
      alt: product.primary_image_alt || product.item_name,
    }] : []),
    ...(product.images?.map(img => ({
      url: img.image_url,
      alt: img.image_alt || product.item_name,
    })) || []),
  ].filter((img, index, self) => 
    index === self.findIndex(i => i.url === img.url)
  );

  const hasVariants = product.variants && product.variants.length > 0;
  const isCombo = product.item_kind === 'combo' && product.combo;
  // Determinar disponibilidad: si track_inventory es true, verificar cantidad; si no, solo verificar flags
  const isAvailable = product.is_available_for_sale && product.is_active && 
    (product.track_inventory ? product.inventory_quantity > 0 : true);
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.base_price;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.compare_at_price! - product.base_price) / product.compare_at_price!) * 100)
    : 0;

  // Calcular precio mínimo y máximo de variantes
  const prices = hasVariants && product.variants
    ? product.variants.map(v => v.price || product.base_price)
    : [product.base_price];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const hasPriceRange = minPrice !== maxPrice;

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumbs */}
      <div className="container mx-auto px-4 py-3 md:py-4 lg:py-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Inicio</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-[200px] md:max-w-none">{product.item_name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 pb-6 md:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
          {/* Galería de imágenes - Móvil y Desktop */}
          <ProductImageGallery 
            images={allImages} 
            discountPercentage={hasDiscount ? discountPercentage : undefined}
          />

          {/* Información del producto */}
          <div className="space-y-6">
            {/* Título y código */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{product.item_name}</h1>
              {isCombo && (
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  <PackageCheck className="h-4 w-4" />
                  Combo con descuento
                </div>
              )}
              {product.item_code && (
                <p className="text-sm text-muted-foreground">Código: {product.item_code}</p>
              )}
            </div>

            {/* Precio */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl md:text-4xl font-bold text-primary">
                  {hasPriceRange ? (
                    <>
                      {formatPrice(minPrice.toString(), product.currency_code)}
                      {minPrice !== maxPrice && (
                        <span className="text-xl"> - {formatPrice(maxPrice.toString(), product.currency_code)}</span>
                      )}
                    </>
                  ) : (
                    formatPrice(product.base_price.toString(), product.currency_code)
                  )}
                </span>
                {hasDiscount && (
                  <span className="text-xl line-through text-muted-foreground">
                    {formatPrice(product.compare_at_price!.toString(), product.currency_code)}
                  </span>
                )}
              </div>
              {hasDiscount && (
                <p className="text-sm text-green-600 font-medium">
                  Ahorra {formatPrice((product.compare_at_price! - product.base_price).toString(), product.currency_code)} ({discountPercentage}% de descuento)
                </p>
              )}
              {isCombo && product.combo && (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="font-semibold">Precio del combo recalculado con precios actuales</p>
                  <p className="text-muted-foreground">
                    Subtotal componentes: {formatPrice(product.combo.pricing.componentSubtotal.toString(), product.currency_code)}
                    {' · '}Descuento: {formatPrice(product.combo.pricing.discountAmount.toString(), product.currency_code)}
                  </p>
                </div>
              )}
            </div>

            {/* Estado de disponibilidad */}
            <div className="flex items-center gap-2">
              {isAvailable ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-green-600 font-medium">Disponible</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-600 font-medium">Agotado</span>
                </>
              )}
            </div>

            {/* Descripción corta */}
            {product.item_description && (
              <p className="text-base text-muted-foreground leading-relaxed">
                {product.item_description}
              </p>
            )}

            {isCombo && product.combo && (
              <div className="space-y-3 rounded-lg border p-4">
                <h3 className="text-lg font-semibold">Incluye</h3>
                <ul className="space-y-2">
                  {product.combo.components.map((component) => (
                    <li
                      key={`${component.productId}-${component.variantId || 'base'}`}
                      className="flex justify-between gap-3 text-sm"
                    >
                      <span>
                        {component.quantity}× {component.productName}
                        {component.variantTitle && (
                          <span className="text-muted-foreground"> · {component.variantTitle}</span>
                        )}
                      </span>
                      <span className="font-medium">
                        {formatPrice(component.lineSubtotal.toString(), product.currency_code)}
                      </span>
                    </li>
                  ))}
                </ul>
                {!product.combo.availability.isAvailable && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {product.combo.availability.blockingComponents.map((component) => component.message).join('. ')}
                  </div>
                )}
              </div>
            )}

            {/* Variantes y opciones */}
            {!isCombo && hasVariants && product.variants && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Variantes disponibles</h3>
                <div className="grid grid-cols-2 gap-2">
                  {product.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer transition-colors",
                        variant.is_available
                          ? "border-border hover:border-primary"
                          : "border-muted opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{variant.variant_code || 'Variante'}</span>
                        <span className="text-sm font-semibold">
                          {formatPrice((variant.price || product.base_price).toString(), product.currency_code)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opciones del producto */}
            {product.options && product.options.length > 0 && (
              <div className="space-y-4">
                {product.options.map((option) => (
                  <div key={option.id}>
                    <label className="block text-sm font-medium mb-2">
                      {option.option_name}
                      {option.is_required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {option.option_values.map((value, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="capitalize"
                        >
                          {value}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {isAvailable ? (
                <AddToCart
                  product={adaptedProduct}
                  size="lg"
                  className="flex-1"
                />
              ) : (
                <Button
                  size="lg"
                  className="flex-1"
                  disabled
                >
                  No disponible
                </Button>
              )}
              <WishlistButton
                product={adaptedProduct}
                variant="outline"
                size="lg"
                iconOnly={false}
                className="flex-1 sm:flex-initial"
              />
            </div>

            {/* Información adicional */}
            <div className="pt-6 border-t space-y-4">
              {product.tags && product.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Etiquetas</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-muted rounded-md text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <PublicProductMetadata metadata={product.metadata} />
            </div>
          </div>
        </div>

        {/* Descripción HTML completa */}
        {product.item_description_html && (
          <div className="mt-12 pt-12 border-t">
            <h2 className="text-2xl font-bold mb-6">Descripción del producto</h2>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: product.item_description_html }}
            />
          </div>
        )}

        {/* Productos relacionados */}
        {relatedProducts.length > 0 && (
          <RelatedProductsCarousel products={toRelatedProductCards(relatedProducts)} />
        )}
      </div>
    </div>
  );
}

export default async function ProductDetailPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Cargando producto...</p>
        </div>
      </div>
    }>
      <ProductContent slug={params.slug} />
    </Suspense>
  );
}
