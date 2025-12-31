import { ProductCollectionSortKey, ProductSortKey, ShopifyCart, ShopifyCollection, ShopifyProduct } from './types';

import { parseShopifyDomain } from './parse-shopify-domain';
import { DEFAULT_PAGE_SIZE, DEFAULT_SORT_KEY } from './constants';

const rawStoreDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const fallbackStoreDomain = 'v0-template.myshopify.com';
const SHOPIFY_STORE_DOMAIN = rawStoreDomain ? parseShopifyDomain(rawStoreDomain) : fallbackStoreDomain;
const SHOPIFY_ENABLED = !!rawStoreDomain && rawStoreDomain.trim() !== '';

const SHOPIFY_STOREFRONT_API_URL = `https://${SHOPIFY_STORE_DOMAIN}/api/2025-07/graphql.json`;

// Tokenless Shopify API request
async function shopifyFetch<T>({
  query,
  variables = {},
}: {
  query: string;
  variables?: Record<string, any>;
}): Promise<{ data: T; errors?: any[] }> {
  // Si Shopify no está configurado, retornar datos vacíos en lugar de fallar
  if (!SHOPIFY_ENABLED) {
    console.warn('[Shopify] ⚠️ Shopify no está configurado. NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN no está definido. Retornando datos vacíos.');
    // Retornar estructura vacía según el tipo esperado
    return { data: {} as T };
  }

  try {
    const response = await fetch(SHOPIFY_STOREFRONT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      cache: 'no-store', // Ensure fresh data for cart operations
      // Agregar timeout para evitar que se quede colgado
      signal: AbortSignal.timeout(10000), // 10 segundos timeout
    });

    if (!response.ok) {
      const errorBody = await response.text();
      // Si es un error 404 o de conexión, puede ser que Shopify no esté configurado
      if (response.status === 404 || response.status === 0) {
        console.warn('[Shopify] ⚠️ No se pudo conectar a Shopify. Verifica que NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN esté configurado correctamente.');
        // Retornar datos vacíos en lugar de lanzar error
        return { data: {} as T };
      }
      throw new Error(`Shopify API HTTP error! Status: ${response.status}, Body: ${errorBody}`);
    }

    const json = await response.json();

    if (json.errors) {
      console.error('Shopify API errors:', json.errors);
      // Si hay errores pero no son críticos, retornar datos vacíos
      if (json.errors.some((err: any) => err.message?.includes('not found') || err.message?.includes('does not exist'))) {
        console.warn('[Shopify] ⚠️ Recurso no encontrado en Shopify. Retornando datos vacíos.');
        return { data: {} as T };
      }
      throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
    }

    return json;
  } catch (error) {
    // Si es un error de red, conexión o timeout, retornar datos vacíos en lugar de fallar
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('[Shopify] ⚠️ Error de conexión con Shopify. Shopify no está disponible o no está configurado correctamente.');
      console.warn('[Shopify] 💡 Si no usas Shopify, puedes ignorar este mensaje. La aplicación funcionará con Supabase.');
      // Retornar datos vacíos en lugar de lanzar error
      return { data: {} as T };
    }
    
    // Si es un error de AbortSignal (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[Shopify] ⚠️ Timeout al conectar con Shopify. Retornando datos vacíos.');
      return { data: {} as T };
    }
    
    // Para otros errores, loguear pero retornar datos vacíos
    console.warn('[Shopify] ⚠️ Error al conectar con Shopify:', error);
    console.warn('[Shopify] 💡 Si no usas Shopify, puedes ignorar este mensaje.');
    return { data: {} as T };
  }
}

// Get all products
export async function getProducts({
  first = DEFAULT_PAGE_SIZE,
  sortKey = DEFAULT_SORT_KEY,
  reverse = false,
  query: searchQuery,
}: {
  first?: number;
  sortKey?: ProductSortKey;
  reverse?: boolean;
  query?: string;
}): Promise<ShopifyProduct[]> {
  const query = /* gql */ `
    query getProducts($first: Int!, $sortKey: ProductSortKeys!, $reverse: Boolean) {
      products(first: $first, sortKey: $sortKey, reverse: $reverse) {
        edges {
          node {
            id
            title
            description
            descriptionHtml
            handle
            productType
            options {
              id
              name
              values
            }
            images(first: 5) {
              edges {
                node {
                  url
                  altText
                  thumbhash
                }
              }
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            compareAtPriceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  availableForSale
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await shopifyFetch<{
    products: {
      edges: Array<{ node: ShopifyProduct }>;
    };
  }>({
    query,
    variables: { first, sortKey, reverse, query: searchQuery },
  });

  // Si no hay datos o productos, retornar array vacío
  if (!data || !data.products || !data.products.edges) {
    return [];
  }

  return data.products.edges.map(edge => edge.node);
}

// Get single product by handle
export async function getProduct(handle: string): Promise<ShopifyProduct | null> {
  const query = /* gql */ `
    query getProduct($handle: String!) {
      product(handle: $handle) {
        id
        title
        description
        descriptionHtml
        handle
        productType
        category {
          id
          name
        }
        options {
          id
          name
          values
        }
        images(first: 10) {
          edges {
            node {
              url
              altText
              thumbhash
            }
          }
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        compareAtPriceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              price {
                amount
                currencyCode
              }
              availableForSale
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await shopifyFetch<{
    product: ShopifyProduct | null;
  }>({
    query,
    variables: { handle },
  });

  // Si no hay datos, retornar null
  if (!data || !data.product) {
    return null;
  }

  return data.product;
}

// Get collections
export async function getCollections(first = 10): Promise<ShopifyCollection[]> {
  const query = /* gql */ `
    query getCollections($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            id
            title
            handle
            description
            image {
              url
              altText
              thumbhash
            }
          }
        }
      }
    }
  `;

  const { data } = await shopifyFetch<{
    collections: {
      edges: Array<{ node: ShopifyCollection }>;
    };
  }>({
    query,
    variables: { first },
  });

  // Si no hay datos o colecciones, retornar array vacío
  if (!data || !data.collections || !data.collections.edges) {
    return [];
  }

  return data.collections.edges.map(edge => edge.node);
}

// Get products from a specific collection (simplified - no server-side filtering)
export async function getCollectionProducts({
  collection,
  limit = DEFAULT_PAGE_SIZE,
  sortKey = DEFAULT_SORT_KEY,
  query: searchQuery,
  reverse = false,
}: {
  collection: string;
  limit?: number;
  sortKey?: ProductCollectionSortKey;
  query?: string;
  reverse?: boolean;
}): Promise<ShopifyProduct[]> {
  const query = /* gql */ `
    query getCollectionProducts($handle: String!, $first: Int!, $sortKey: ProductCollectionSortKeys!, $reverse: Boolean) {
      collection(handle: $handle) {
        products(first: $first, sortKey: $sortKey, reverse: $reverse) {
          edges {
            node {
              id
              title
              description
              descriptionHtml
              handle
              productType
              category {
                id
                name
              }
              options {
                id
                name
                values
              }
              images(first: 5) {
                edges {
                  node {
                    url
                    altText
                    thumbhash
                  }
                }
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              compareAtPriceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    availableForSale
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await shopifyFetch<{
    collection: {
      products: {
        edges: Array<{ node: ShopifyProduct }>;
      };
    } | null;
  }>({
    query,
    variables: { handle: collection, first: limit, sortKey, query: searchQuery, reverse },
  });

  // Si no hay datos, colección o productos, retornar array vacío
  if (!data || !data.collection || !data.collection.products || !data.collection.products.edges) {
    return [];
  }

  return data.collection.products.edges.map(edge => edge.node);
}

// Create cart
export async function createCart(): Promise<ShopifyCart | null> {
  const query = /* gql */ `
    mutation cartCreate {
      cartCreate {
        cart {
          id
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
                      images(first: 1) {
                        edges {
                          node {
                            url
                            altText
                            thumbhash
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const { data } = await shopifyFetch<{
    cartCreate: {
      cart: ShopifyCart;
      userErrors: Array<{ field: string; message: string }>;
    };
  }>({ query });

  // Si no hay datos o Shopify no está configurado, retornar null
  if (!data || !data.cartCreate) {
    return null;
  }

  if (data.cartCreate.userErrors && data.cartCreate.userErrors.length > 0) {
    console.error('[Shopify] ❌ Error creando carrito:', data.cartCreate.userErrors);
    return null;
  }

  return data.cartCreate.cart;
}

// Add items to cart
export async function addCartLines(
  cartId: string,
  lines: Array<{ merchandiseId: string; quantity: number }>
): Promise<ShopifyCart> {
  const query = /* gql */ `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
                      images(first: 1) {
                        edges {
                          node {
                            url
                            altText
                            thumbhash
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const { data } = await shopifyFetch<{
    cartLinesAdd: {
      cart: ShopifyCart;
      userErrors: Array<{ field: string; message: string }>;
    };
  }>({
    query,
    variables: {
      cartId,
      lines,
    },
  });

  // Si no hay datos o Shopify no está configurado, lanzar error descriptivo
  if (!data || !data.cartLinesAdd) {
    throw new Error('Shopify no está configurado. No se puede agregar items al carrito.');
  }

  if (data.cartLinesAdd.userErrors && data.cartLinesAdd.userErrors.length > 0) {
    throw new Error(data.cartLinesAdd.userErrors[0].message);
  }

  return data.cartLinesAdd.cart;
}

// Update items in cart
export async function updateCartLines(
  cartId: string,
  lines: Array<{ id: string; quantity: number }>
): Promise<ShopifyCart> {
  const query = /* gql */ `
    mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          id
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
                      images(first: 1) {
                        edges {
                          node {
                            url
                            altText
                            thumbhash
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const { data } = await shopifyFetch<{
    cartLinesUpdate: {
      cart: ShopifyCart;
      userErrors: Array<{ field: string; message: string }>;
    };
  }>({
    query,
    variables: {
      cartId,
      lines,
    },
  });

  // Si no hay datos o Shopify no está configurado, lanzar error descriptivo
  if (!data || !data.cartLinesUpdate) {
    throw new Error('Shopify no está configurado. No se puede actualizar el carrito.');
  }

  if (data.cartLinesUpdate.userErrors && data.cartLinesUpdate.userErrors.length > 0) {
    throw new Error(data.cartLinesUpdate.userErrors[0].message);
  }

  return data.cartLinesUpdate.cart;
}

// Remove items from cart
export async function removeCartLines(cartId: string, lineIds: string[]): Promise<ShopifyCart> {
  const query = /* gql */ `
    mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          id
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
                      images(first: 1) {
                        edges {
                          node {
                            url
                            altText
                            thumbhash
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const { data } = await shopifyFetch<{
    cartLinesRemove: {
      cart: ShopifyCart;
      userErrors: Array<{ field: string; message: string }>;
    };
  }>({
    query,
    variables: {
      cartId,
      lineIds,
    },
  });

  // Si no hay datos o Shopify no está configurado, lanzar error descriptivo
  if (!data || !data.cartLinesRemove) {
    throw new Error('Shopify no está configurado. No se puede eliminar items del carrito.');
  }

  if (data.cartLinesRemove.userErrors && data.cartLinesRemove.userErrors.length > 0) {
    throw new Error(data.cartLinesRemove.userErrors[0].message);
  }

  return data.cartLinesRemove.cart;
}

// Get cart
export async function getCart(cartId: string): Promise<ShopifyCart | null> {
  const query = /* gql */ `
    query getCart($cartId: ID!) {
      cart(id: $cartId) {
        id
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  selectedOptions {
                    name
                    value
                  }
                  product {
                    title
                    handle
                    images(first: 10) {
                      edges {
                        node {
                          url
                          altText
                          thumbhash
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        cost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
            amount
            currencyCode
          }
          totalTaxAmount {
            amount
            currencyCode
          }
        }
        checkoutUrl
      }
    }
  `;

  const { data } = await shopifyFetch<{
    cart: ShopifyCart | null;
  }>({
    query,
    variables: { cartId },
  });

  // Si no hay datos o Shopify no está configurado, retornar null
  if (!data || !data.cart) {
    return null;
  }

  return data.cart;
}
