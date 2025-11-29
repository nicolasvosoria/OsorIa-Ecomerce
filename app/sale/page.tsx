"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FooterNew } from "@/components/sections/footer-new"

export default function SalePage() {
  const saleProducts = [
    {
      id: 1,
      name: "Bluetooth Speakers",
      category: "Audio",
      originalPrice: "$356.00",
      salePrice: "$249.00",
      discount: 30,
      image: "/bluetooth-speaker-modern.jpg",
    },
    {
      id: 2,
      name: "Premium Headphones",
      category: "Audio",
      originalPrice: "$199.00",
      salePrice: "$139.00",
      discount: 30,
      image: "/premium-headphones.png",
    },
    {
      id: 3,
      name: "Laptop Stand",
      category: "Accesorios",
      originalPrice: "$82.00",
      salePrice: "$57.00",
      discount: 30,
      image: "/laptop-stand.png",
    },
    {
      id: 4,
      name: "Mini Projector",
      category: "Proyección",
      originalPrice: "$199.00",
      salePrice: "$149.00",
      discount: 25,
      image: "/mini-projector.jpg",
    },
    {
      id: 5,
      name: "Smart Speaker",
      category: "Electronics",
      originalPrice: "$89.00",
      salePrice: "$62.00",
      discount: 30,
      image: "/black-smart-speaker.jpg",
    },
    {
      id: 6,
      name: "Wireless Earphones",
      category: "Audio",
      originalPrice: "$45.00",
      salePrice: "$31.00",
      discount: 31,
      image: "/green-earphones-product.jpg",
    },
    {
      id: 7,
      name: "Phone Case",
      category: "Accesorios",
      originalPrice: "$25.00",
      salePrice: "$17.00",
      discount: 32,
      image: "/modern-phone-case-product.jpg",
    },
    {
      id: 8,
      name: "White Projector",
      category: "Proyección",
      originalPrice: "$1,420.00",
      salePrice: "$994.00",
      discount: 30,
      image: "/white-projector.jpg",
    },
  ]

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <Link href="/">
            <Button
              variant="ghost"
              className="mb-4 gap-2"
              style={{ color: "var(--foreground)" }}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Button>
          </Link>
          <h1 className="text-4xl md:text-6xl lg:text-[72px] font-inter font-bold mb-4" style={{ color: "var(--foreground)" }}>
            Gran Oferta
          </h1>
          <p className="text-lg md:text-xl" style={{ color: "var(--muted-foreground)" }}>
            Aprovecha nuestros descuentos especiales. ¡Ofertas limitadas!
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {saleProducts.map((product) => (
            <div
              key={product.id}
              className="group relative rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300"
              style={{ backgroundColor: "var(--card)" }}
            >
              {/* Discount Badge */}
              <div className="absolute top-4 right-4 z-10">
                <div
                  className="rounded-full px-4 py-2 font-bold text-white text-sm md:text-base shadow-lg"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  -{product.discount}%
                </div>
              </div>

              {/* Product Image */}
              <div
                className="aspect-square flex items-center justify-center p-6 relative overflow-hidden"
                style={{ backgroundColor: "var(--background)" }}
              >
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                />
              </div>

              {/* Product Info */}
              <div className="p-4 md:p-6">
                <p className="text-sm md:text-base font-inter font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
                  {product.category}
                </p>
                <h3 className="text-lg md:text-xl font-inter font-semibold mb-3" style={{ color: "var(--card-foreground)" }}>
                  {product.name}
                </h3>
                
                {/* Pricing */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl md:text-2xl font-inter font-bold" style={{ color: "var(--primary)" }}>
                    {product.salePrice}
                  </span>
                  <span className="text-sm md:text-base line-through" style={{ color: "var(--muted-foreground)" }}>
                    {product.originalPrice}
                  </span>
                </div>

                {/* Add to Cart Button */}
                <Button
                  className="w-full"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1"
                  }}
                >
                  Agregar al carrito
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <FooterNew />
    </main>
  )
}

