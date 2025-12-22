import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getItemBySlug } from '@/lib/supabase/products-api';
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
import { ShoppingCart, Heart, Check, AlertCircle } from 'lucide-react';
import { AddToCart } from '@/components/cart/add-to-cart';
import { adaptSupabaseProduct } from '@/lib/products/adapter';
import { cn } from '@/lib/utils';

// Generar parámetros estáticos para productos
export async function generateStaticParams() {
  try {
    // Obtener productos para generar rutas estáticas
    const { getItems } = await import('@/lib/supabase/products-api');
    const result = await getItems({ limit: 100, is_active: true, is_available_for_sale: true });
    
    return result.items
      .filter(item => item.item_slug)
      .map(item => ({
        slug: item.item_slug!,
      }));
  } catch (error) {
    console.error('Error generating static params for products:', error);
    return [];
  }
}

// Generar metadata para SEO
export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
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
}

export default async function ProductDetailPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const product = await getItemBySlug(params.slug);

  if (!product) {
    return notFound();
  }

  // Adaptar producto para usar con componentes existentes
  const adaptedProduct = adaptSupabaseProduct(product);

  // Obtener todas las imágenes del producto
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
      <div className="container mx-auto px-4 py-4 md:py-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Inicio</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.item_name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Galería de imágenes - Móvil y Desktop */}
          <div className="space-y-4">
            {/* Imagen principal */}
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
              {allImages.length > 0 ? (
                <Image
                  src={allImages[0].url}
                  alt={allImages[0].alt}
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Sin imagen
                </div>
              )}
              {hasDiscount && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  -{discountPercentage}%
                </div>
              )}
            </div>

            {/* Miniaturas de imágenes adicionales */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {allImages.slice(1, 5).map((img, index) => (
                  <div
                    key={index}
                    className="relative aspect-square overflow-hidden rounded-lg bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <Image
                      src={img.url}
                      alt={img.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 25vw, 12.5vw"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Información del producto */}
          <div className="space-y-6">
            {/* Título y código */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{product.item_name}</h1>
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

            {/* Variantes y opciones */}
            {hasVariants && product.variants && (
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
              <Button
                variant="outline"
                size="lg"
                className="flex-1 sm:flex-initial"
              >
                <Heart className="h-5 w-5 mr-2" />
                Favoritos
              </Button>
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

              {product.metadata && Object.keys(product.metadata).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Especificaciones</h4>
                  <dl className="space-y-2">
                    {Object.entries(product.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <dt className="text-sm text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}:
                        </dt>
                        <dd className="text-sm font-medium">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
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

        {/* Productos relacionados (opcional - se puede implementar después) */}
      </div>
    </div>
  );
}

