"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FooterNew } from "@/components/sections/footer-new"
import { useQuantityModal } from "@/hooks/use-quantity-modal"

export default function EarphonesPage() {
  const { openModal, QuantityModalComponent } = useQuantityModal()
  
  const earphones = [
    {
      id: 1,
      name: "Auriculares Premium",
      category: "Earphones",
      price: "$199.00",
      image: "/premium-headphones.png",
    },
    {
      id: 2,
      name: "Audífonos Inalámbricos",
      category: "Earphones",
      price: "$45.00",
      image: "/green-earphones-product.jpg",
    },
    {
      id: 3,
      name: "Auriculares con Cancelación de Ruido",
      category: "Earphones",
      price: "$249.00",
      image: "/premium-headphones.png",
    },
    {
      id: 4,
      name: "Audífonos Deportivos",
      category: "Earphones",
      price: "$79.00",
      image: "/green-earphones-product.jpg",
    },
    {
      id: 5,
      name: "Auriculares Bluetooth",
      category: "Earphones",
      price: "$129.00",
      image: "/premium-headphones.png",
    },
    {
      id: 6,
      name: "Audífonos True Wireless",
      category: "Earphones",
      price: "$89.00",
      image: "/green-earphones-product.jpg",
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
            Earphones
          </h1>
          <p className="text-lg md:text-xl" style={{ color: "var(--muted-foreground)" }}>
            Descubre nuestra colección de auriculares y audífonos de última generación
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {earphones.map((product) => (
            <div
              key={product.id}
              className="group relative rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300"
              style={{ backgroundColor: "var(--card)" }}
            >
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
                    {product.price}
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
                  onClick={() => {
                    openModal({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: product.image,
                      category: product.category,
                    })
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

      {/* Modal de cantidad */}
      {QuantityModalComponent}
    </main>
  )
}





