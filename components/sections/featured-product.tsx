"use client"

import { Button } from "@/components/ui/button"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"

export function FeaturedProduct() {
  const { styles: styleData } = useComponentStyle("featured", {
    title: "¡Por favor, no detengas la música!",
    subtitle: "La elección de los usuarios en este mundo",
    productName: "Auriculares BelPhones XTRM",
    originalPrice: "$99.99",
    salePrice: "$79.00",
    linkText: "Ver todos los productos",
    mainImage: "/woman-wearing-headphones-smiling.jpg",
    productImage: "/green-earphones-product.jpg",
    bgColor: "#5daba8",
  })
  const { componentEdits } = useAdmin()
  
  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("featured") || {}
  const title = edits.title ?? styleData.title ?? "¡Por favor, no detengas la música!"
  const subtitle = edits.subtitle ?? styleData.subtitle ?? "La elección de los usuarios en este mundo"
  const productName = edits.productName ?? styleData.productName ?? "Auriculares BelPhones XTRM"
  const originalPrice = edits.originalPrice ?? styleData.originalPrice ?? "$99.99"
  const salePrice = edits.salePrice ?? styleData.salePrice ?? "$79.00"
  const linkText = edits.linkText ?? styleData.linkText ?? "Ver todos los productos"
  const mainImage = edits.mainImage ?? styleData.mainImage ?? "/woman-wearing-headphones-smiling.jpg"
  const productImage = edits.productImage ?? styleData.productImage ?? "/green-earphones-product.jpg"
  const bgColor = edits.bgColor ?? styleData.bgColor
  const textColor = edits.textColor ?? styleData.textColor

  return (
    <section 
      data-component="featured"
      className="py-8 md:py-16 px-4 rounded-2xl md:rounded-3xl mx-2 md:mx-4 my-4 md:my-8" 
      style={{ 
        backgroundColor: bgColor || "var(--secondary)",
        ...(textColor && { color: textColor }),
      }}
    >
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-6 md:gap-12 items-center">
          {/* Left - Image */}
          <div className="relative">
            <img
              src={mainImage || "/placeholder.svg"}
              alt={title || "Featured product"}
              className="w-full h-auto rounded-2xl"
            />
          </div>

          {/* Right - Content */}
          <div 
            className="space-y-6 md:space-y-8 text-center md:text-left" 
            style={{ color: textColor || "var(--secondary-foreground)" }}
          >
            <div>
              <h2 className="text-2xl md:text-4xl lg:text-[46.5225px] font-inter font-normal mb-2">
                {title}
              </h2>
              <p className="text-base md:text-lg lg:text-[19.1856px] font-inter font-normal" style={{ opacity: 0.9 }}>
                {subtitle}
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
                {productName}
              </h3>
              <div className="flex items-baseline gap-2 mb-4 md:mb-6">
                <span className="line-through text-sm md:text-base" style={{ color: "var(--muted-foreground)" }}>
                  {originalPrice}
                </span>
                <span className="font-normal text-base md:text-lg" style={{ color: "var(--card-foreground)" }}>
                  {salePrice}
                </span>
              </div>
              <div 
                className="aspect-square flex items-center justify-center rounded-lg"
                style={{ backgroundColor: "var(--background)" }}
              >
                <img
                  src={productImage || "/placeholder.svg"}
                  alt={productName}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <Button 
              variant="link" 
              style={{ color: textColor || "var(--secondary-foreground)" }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              {linkText} →
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
