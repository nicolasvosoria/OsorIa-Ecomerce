"use client"

import Link from "next/link"
import Image from "next/image"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { formatPrice } from "@/lib/shopify/utils"
import type { RelatedProductCard } from "@/lib/products/public-product-payload"

export function RelatedProductsCarousel({ products }: { products: RelatedProductCard[] }) {
  if (products.length === 0) return null

  return (
    <section className="mt-12 pt-12 border-t">
      <h2 className="text-2xl font-bold mb-6">Productos relacionados</h2>
      <div className="relative">
        <Carousel
          opts={{
            align: "start",
            loop: true,
            dragFree: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 sm:-ml-4">
            {products.map((item) => {
              const slug = item.item_slug || item.id
              const imageUrl = item.primary_image_url || item.images?.[0]?.image_url
              const compareAt = Number(item.compare_at_price) || 0
              const base = Number(item.base_price) || 0
              const hasDiscount = compareAt > 0 && compareAt > base
              return (
                <CarouselItem
                  key={item.id}
                  className="pl-2 sm:pl-4 basis-[70%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                >
                  <Link
                    href={`/products/${slug}`}
                    className="group block bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-square bg-muted overflow-hidden">
                      <Image
                        src={imageUrl || "/placeholder.svg"}
                        alt={item.primary_image_alt || item.item_name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 70vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                      {hasDiscount && (
                        <span
                          className="absolute top-2 left-2 z-10 rounded-md bg-red-600 text-white text-xs font-semibold px-2 py-1 shadow-md"
                          style={{ textShadow: "0 0 1px rgba(0,0,0,0.5)" }}
                        >
                          Oferta
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {item.item_name}
                      </h3>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-base font-bold text-primary">
                          {formatPrice(item.base_price.toString(), item.currency_code)}
                        </span>
                        {hasDiscount && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(String(compareAt), item.currency_code)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              )
            })}
          </CarouselContent>
          <CarouselPrevious
            className="hidden sm:flex -left-2 sm:-left-12 min-h-10 min-w-10 rounded-full border border-border bg-card text-foreground hover:bg-muted"
            aria-label="Anterior"
          />
          <CarouselNext
            className="hidden sm:flex -right-2 sm:-right-12 min-h-10 min-w-10 rounded-full border border-border bg-card text-foreground hover:bg-muted"
            aria-label="Siguiente"
          />
        </Carousel>
      </div>
    </section>
  )
}
