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
    <section 
      className="py-8 md:py-16 px-4 rounded-2xl md:rounded-3xl mx-2 md:mx-4 my-4 md:my-8" 
      style={{ backgroundColor: "var(--secondary)" }}
    >
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-6 md:gap-12 items-center">
          {/* Left - Image */}
          <div className="relative">
            <img
              src="/woman-wearing-headphones-smiling.jpg"
              alt="Woman enjoying music"
              className="w-full h-auto rounded-2xl"
            />
          </div>

          {/* Right - Content */}
          <div className="space-y-6 md:space-y-8 text-center md:text-left" style={{ color: "var(--secondary-foreground)" }}>
            <div>
              <h2 className="text-2xl md:text-4xl lg:text-[46.5225px] font-inter font-normal mb-2">
                {styleData.title || "Please, don't stop the music!"}
              </h2>
              <p className="text-base md:text-lg lg:text-[19.1856px] font-inter font-normal" style={{ opacity: 0.9 }}>
                {styleData.subtitle || "Users choice in this world"}
              </p>
            </div>

            {/* Product Card */}
            <div 
              className="rounded-xl md:rounded-2xl p-4 md:p-8" 
              style={{ 
                backgroundColor: "var(--card)", 
                color: "var(--card-foreground)",
                border: "1px solid var(--border)"
              }}
            >
              <h3 className="mb-3 md:mb-4 font-semibold text-sm md:text-base" style={{ color: "var(--card-foreground)" }}>
                {styleData.productName || "BelPhones XTRM earphones"}
              </h3>
              <div className="flex items-baseline gap-2 mb-4 md:mb-6">
                <span className="line-through text-sm md:text-base" style={{ color: "var(--muted-foreground)" }}>
                  {styleData.originalPrice || "$99.99"}
                </span>
                <span className="font-normal text-base md:text-lg" style={{ color: "var(--card-foreground)" }}>
                  {styleData.salePrice || "$79.00"}
                </span>
              </div>
              <div 
                className="aspect-square flex items-center justify-center rounded-lg"
                style={{ backgroundColor: "var(--background)" }}
              >
                <img
                  src="/green-earphones-product.jpg"
                  alt={styleData.productName}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <Button 
              variant="link" 
              style={{ color: "var(--secondary-foreground)" }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              {styleData.linkText || "See all products"} →
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
