"use client"

import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWishlist } from "@/contexts/wishlist-context"
import { Product } from "@/lib/shopify/types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/language-context"

interface WishlistButtonProps {
  product: Product
  variant?: "default" | "outline" | "ghost" | "icon"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  iconOnly?: boolean
}

export function WishlistButton({ 
  product, 
  variant = "ghost", 
  size = "icon",
  className,
  iconOnly = true 
}: WishlistButtonProps) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()
  const { t } = useLanguage()
  const inWishlist = isInWishlist(product.id)

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (inWishlist) {
      removeFromWishlist(product.id)
      toast.success(t.wishlist.removedFromFavorites)
    } else {
      addToWishlist({
        id: product.id,
        title: product.title,
        handle: product.handle,
        image: product.featuredImage?.url,
        price: product.priceRange.minVariantPrice.amount,
        compareAtPrice: product.compareAtPrice?.amount,
        currencyCode: product.priceRange.minVariantPrice.currencyCode,
      })
      toast.success(t.wishlist.addToFavorites)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        "relative",
        inWishlist && "text-red-500 hover:text-red-600",
        className
      )}
      onClick={handleToggle}
      aria-label={inWishlist ? t.wishlist.removeFromFavorites : t.wishlist.addToFavorites}
      title={inWishlist ? t.wishlist.removeFromFavorites : t.wishlist.addToFavorites}
    >
      <Heart 
        className={cn(
          "h-4 w-4 transition-all",
          inWishlist && "fill-current"
        )} 
      />
      {!iconOnly && (
        <span className="ml-2">
          {inWishlist ? t.wishlist.inFavorites : t.wishlist.addToFavorites}
        </span>
      )}
    </Button>
  )
}




