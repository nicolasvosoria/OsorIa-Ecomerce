/**
 * Adaptador para convertir productos de Supabase al formato Product
 * Compatible con el formato esperado por los componentes de la tienda
 */

import type {
  StoreItemWithDetails,
  ItemCategory,
  ItemVariant,
  ItemImage,
  ItemOption,
} from '@/lib/types/products';
import type { Product, Collection, ProductVariant, ProductOption, Money, Image } from '@/lib/shopify/types';

// Helper para convertir precio a formato Money
function formatMoney(amount: number, currencyCode: string = 'COP'): Money {
  return {
    amount: amount.toString(),
    currencyCode,
  };
}

// Helper para obtener la primera imagen
function getFirstImage(item: StoreItemWithDetails): Image {
  if (item.primary_image_url) {
    return {
      url: item.primary_image_url,
      altText: item.primary_image_alt || item.item_name,
      height: 600,
      width: 600,
    };
  }

  if (item.images && item.images.length > 0) {
    const firstImage = item.images[0];
    return {
      url: firstImage.image_url,
      altText: firstImage.image_alt || item.item_name,
      height: firstImage.height || 600,
      width: firstImage.width || 600,
    };
  }

  return {
    url: '/placeholder.jpg',
    altText: item.item_name,
    height: 600,
    width: 600,
  };
}

// Convertir opciones de Supabase a formato ProductOption
function adaptOptions(options?: ItemOption[]): ProductOption[] {
  if (!options || options.length === 0) return [];

  return options.map(option => ({
    id: option.id,
    name: option.option_name,
    values: option.option_values.map(value => ({
      id: value.toLowerCase().replace(/\s+/g, '-'),
      name: value,
    })),
  }));
}

// Convertir variantes de Supabase a formato ProductVariant
function adaptVariants(item: StoreItemWithDetails): ProductVariant[] {
  if (!item.variants || item.variants.length === 0) {
    // Si no hay variantes, crear una variante por defecto basada en el producto
    return [
      {
        id: item.id,
        title: 'Default',
        availableForSale: item.is_available_for_sale,
        price: formatMoney(item.base_price, item.currency_code),
        selectedOptions: [],
      },
    ];
  }

  return item.variants.map(variant => {
    const selectedOptions: Array<{ name: string; value: string }> = [];

    // Convertir variant_options JSON a selectedOptions
    if (variant.variant_options && typeof variant.variant_options === 'object') {
      Object.entries(variant.variant_options).forEach(([key, value]) => {
        selectedOptions.push({
          name: key,
          value: String(value),
        });
      });
    }

    return {
      id: variant.id,
      title: variant.variant_code || 'Default',
      availableForSale: variant.is_available && item.is_available_for_sale,
      price: formatMoney(variant.price || item.base_price, item.currency_code),
      selectedOptions,
    };
  });
}

// Convertir imágenes de Supabase a formato Image
function adaptImages(item: StoreItemWithDetails): Image[] {
  const images: Image[] = [];

  // Agregar imagen principal si existe
  if (item.primary_image_url) {
    images.push({
      url: item.primary_image_url,
      altText: item.primary_image_alt || item.item_name,
      height: 600,
      width: 600,
    });
  }

  // Agregar otras imágenes
  if (item.images && item.images.length > 0) {
    item.images.forEach(img => {
      // Evitar duplicar la imagen principal
      if (img.image_url !== item.primary_image_url) {
        images.push({
          url: img.image_url,
          altText: img.image_alt || item.item_name,
          height: img.height || 600,
          width: img.width || 600,
        });
      }
    });
  }

  // Si no hay imágenes, agregar placeholder
  if (images.length === 0) {
    images.push({
      url: '/placeholder.jpg',
      altText: item.item_name,
      height: 600,
      width: 600,
    });
  }

  return images;
}

// Calcular precio mínimo y máximo de las variantes
function calculatePriceRange(item: StoreItemWithDetails): { minVariantPrice: Money; maxVariantPrice: Money } {
  if (!item.variants || item.variants.length === 0) {
    const price = formatMoney(item.base_price, item.currency_code);
    return {
      minVariantPrice: price,
      maxVariantPrice: price,
    };
  }

  const prices = item.variants
    .map(v => v.price || item.base_price)
    .filter(p => p !== null && p !== undefined);

  if (prices.length === 0) {
    const price = formatMoney(item.base_price, item.currency_code);
    return {
      minVariantPrice: price,
      maxVariantPrice: price,
    };
  }

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    minVariantPrice: formatMoney(minPrice, item.currency_code),
    maxVariantPrice: formatMoney(maxPrice, item.currency_code),
  };
}

/**
 * Adapta un producto de Supabase al formato Product esperado por los componentes
 */
export function adaptSupabaseProduct(item: StoreItemWithDetails): Product {
  const featuredImage = getFirstImage(item);
  const priceRange = calculatePriceRange(item);
  const description = item.item_description || item.item_name;

  return {
    id: item.id,
    title: item.item_name,
    handle: item.item_slug || item.id,
    categoryId: item.category?.id,
    description: description.length > 200 ? description.substring(0, 200) + '...' : description,
    descriptionHtml: item.item_description_html || `<p>${description}</p>`,
    featuredImage,
    currencyCode: item.currency_code,
    priceRange,
    compareAtPrice: item.compare_at_price && item.compare_at_price > item.base_price
      ? formatMoney(item.compare_at_price, item.currency_code)
      : undefined,
    seo: {
      title: item.seo_title || item.item_name,
      description: item.seo_description || description,
    },
    options: adaptOptions(item.options),
    tags: item.tags || [],
    variants: adaptVariants(item),
    images: adaptImages(item),
    availableForSale: item.is_available_for_sale && item.is_active,
  };
}

/**
 * Adapta una categoría de Supabase al formato Collection
 */
export function adaptSupabaseCategory(category: ItemCategory): Collection {
  return {
    handle: category.category_name.toLowerCase().replace(/\s+/g, '-'),
    title: category.category_name,
    description: category.category_description || '',
    seo: {
      title: category.category_name,
      description: category.category_description || '',
    },
    parentCategoryTree: [],
    updatedAt: category.updated_at,
    path: `/shop/${category.category_name.toLowerCase().replace(/\s+/g, '-')}`,
  };
}

/**
 * Adapta múltiples productos de Supabase
 */
export function adaptSupabaseProducts(items: StoreItemWithDetails[]): Product[] {
  return items.map(adaptSupabaseProduct);
}

/**
 * Adapta múltiples categorías de Supabase
 */
export function adaptSupabaseCategories(categories: ItemCategory[]): Collection[] {
  return categories.map(adaptSupabaseCategory);
}

