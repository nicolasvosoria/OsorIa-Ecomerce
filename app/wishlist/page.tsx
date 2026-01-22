"use client"

import { useWishlist } from "@/contexts/wishlist-context"
import { Button } from "@/components/ui/button"
import { Heart, ShoppingCart, Trash2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { formatPrice } from "@/lib/shopify/utils"
import { toast } from "sonner"
import { useCart } from "@/contexts/cart-context"
import { AddToCartButton } from "@/components/cart/add-to-cart"
import { Product } from "@/lib/shopify/types"
import { useLanguage } from "@/contexts/language-context"

export default function WishlistPage() {
  const { items, removeFromWishlist, clearWishlist } = useWishlist()
  const { addToCart } = useCart()
  const { t } = useLanguage()

  const handleAddToCart = (item: typeof items[0]) => {
    // Crear un producto adaptado para AddToCartButton
    const product: Product = {
      id: item.id,
      title: item.title,
      handle: item.handle,
      description: "",
      descriptionHtml: "",
      categoryId: "",
      featuredImage: item.image ? { url: item.image, altText: item.title, width: 400, height: 400 } : { url: "/placeholder.svg", altText: item.title, width: 400, height: 400 },
      currencyCode: item.currencyCode || "COP",
      priceRange: {
        minVariantPrice: {
          amount: item.price || "0",
          currencyCode: item.currencyCode || "COP",
        },
        maxVariantPrice: {
          amount: item.price || "0",
          currencyCode: item.currencyCode || "COP",
        },
      },
      compareAtPrice: item.compareAtPrice ? {
        amount: item.compareAtPrice,
        currencyCode: item.currencyCode || "COP",
      } : undefined,
      options: [],
      tags: [],
      variants: [],
      images: [],
      availableForSale: true,
      seo: {
        title: item.title,
        description: "",
      },
    }

    // Agregar al carrito local
    addToCart({
      id: item.id,
      name: item.title,
      price: item.price || "0",
      image: item.image || "/placeholder.svg",
    }, 1)

    toast.success(t.wishlist.addedToCart)
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Heart className="h-16 w-16 md:h-24 md:w-24 text-muted-foreground mb-4" />
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{t.wishlist.empty}</h1>
            <p className="text-muted-foreground mb-6 max-w-md">
              {t.wishlist.emptyDescription}
            </p>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t.wishlist.exploreProducts}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{t.wishlist.myFavorites}</h1>
            <p className="text-muted-foreground">
              {items.length} {items.length === 1 ? t.wishlist.item : t.wishlist.items} {t.wishlist.itemsCount}
            </p>
          </div>
          {items.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                clearWishlist()
                toast.success(t.wishlist.cleared)
              }}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t.wishlist.clearAll}
            </Button>
          )}
        </div>

        {/* Grid de productos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Botón eliminar */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm"
                onClick={() => {
                  removeFromWishlist(item.id)
                  toast.success(t.wishlist.removedFromFavorites)
                }}
                title={t.wishlist.removeFromFavorites}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>

              {/* Imagen del producto */}
              <Link href={`/products/${item.handle}`}>
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Heart className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </Link>

              {/* Información del producto */}
              <div className="p-4">
                <Link href={`/products/${item.handle}`}>
                  <h3 className="font-semibold mb-2 line-clamp-2 hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                </Link>
                
                {/* Precio */}
                {item.price && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-bold">
                      {formatPrice(item.price, item.currencyCode || "COP")}
                    </span>
                    {item.compareAtPrice && parseFloat(item.compareAtPrice) > parseFloat(item.price) && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(item.compareAtPrice, item.currencyCode || "COP")}
                      </span>
                    )}
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAddToCart(item)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {t.wishlist.add}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    asChild
                  >
                    <Link href={`/products/${item.handle}`}>
                      {t.wishlist.viewDetails}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

