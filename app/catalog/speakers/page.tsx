"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FooterNew } from "@/components/sections/footer-new"
import { useCart } from "@/contexts/cart-context"
import { toast } from "sonner"

export default function SpeakersPage() {
  const { addToCart } = useCart()
  
  const speakers = [
    {
      id: 1,
      name: "Bocinas Bluetooth",
      category: "Speakers",
      price: "$356.00",
      image: "/bluetooth-speaker-modern.jpg",
    },
    {
      id: 2,
      name: "Bocina Inteligente",
      category: "Speakers",
      price: "$89.00",
      image: "/black-smart-speaker.jpg",
    },
    {
      id: 3,
      name: "Bocinas Bluetooth Premium",
      category: "Speakers",
      price: "$199.00",
      image: "/bluetooth-speaker-modern.jpg",
    },
    {
      id: 4,
      name: "Bocina Portátil",
      category: "Speakers",
      price: "$129.00",
      image: "/bluetooth-speaker-modern.jpg",
    },
    {
      id: 5,
      name: "Bocina Bluetooth Compacta",
      category: "Speakers",
      price: "$79.00",
      image: "/bluetooth-speaker-modern.jpg",
    },
    {
      id: 6,
      name: "Bocina de Alta Potencia",
      category: "Speakers",
      price: "$449.00",
      image: "/bluetooth-speaker-modern.jpg",
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
            Speakers
          </h1>
          <p className="text-lg md:text-xl" style={{ color: "var(--muted-foreground)" }}>
            Explora nuestra amplia selección de bocinas y altavoces de alta calidad
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {speakers.map((product) => (
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
                    addToCart({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: product.image,
                      category: product.category,
                    })
                    toast.success("Producto agregado al carrito", {
                      description: `${product.name} ha sido agregado exitosamente`,
                      duration: 3000,
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
    </main>
  )
}





