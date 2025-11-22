"use client"

import { Button } from "@/components/ui/button"
import { useComponentStyle } from "@/contexts/styles-context"

export function FeaturedProduct() {
  const { styles: styleData } = useComponentStyle("featured", {
    title: "Please, don't stop the music!",
    subtitle: "Users choice in this world",
    productName: "BelPhones XTRM earphones",
    originalPrice: "$99.99",
    salePrice: "$79.00",
    linkText: "See all products",
    bgColor: "#5daba8",
  })

  return (
    <section className="py-16 px-4 rounded-3xl mx-4 my-8" style={{ backgroundColor: styleData.bgColor || "#5daba8" }}>
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Image */}
          <div className="relative">
            <img
              src="/woman-wearing-headphones-smiling.jpg"
              alt="Woman enjoying music"
              className="w-full h-auto rounded-2xl"
            />
          </div>

          {/* Right - Content */}
          <div className="text-white space-y-8">
            <div>
              <h2 className="text-[46.5225px] font-inter font-normal mb-2">
                {styleData.title || "Please, don't stop the music!"}
              </h2>
              <p className="text-white/90 text-[19.1856px] font-inter font-normal">
                {styleData.subtitle || "Users choice in this world"}
              </p>
            </div>

            {/* Product Card */}
            <div className="bg-white rounded-2xl p-8 text-foreground">
              <h3 className="mb-4 text-[rgba(30,53,78,1)] font-semibold">{styleData.productName || "BelPhones XTRM earphones"}</h3>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-muted-foreground line-through">{styleData.originalPrice || "$99.99"}</span>
                <span className="text-[rgba(30,53,78,1)] font-normal text-lg">{styleData.salePrice || "$79.00"}</span>
              </div>
              <div className="aspect-square flex items-center justify-center">
                <img
                  src="/green-earphones-product.jpg"
                  alt={styleData.productName}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <Button variant="link" className="text-white hover:text-white/80">
              {styleData.linkText || "See all products"} →
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
