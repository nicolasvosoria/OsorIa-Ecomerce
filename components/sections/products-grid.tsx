"use client"

import { useComponentStyle } from "@/contexts/styles-context"

export function ProductsGrid() {
  const { styles: styleData } = useComponentStyle("products", {
    title: "Productos populares",
  })

  const products = [
    {
      name: "BeShow Volcano",
      category: "Projectors",
      price: "$1,420.00",
      image: "/white-projector.jpg",
    },
    {
      name: "Laptop stand Desk MUO-g",
      category: "Stands",
      price: "$82.00",
      image: "/laptop-stand.png",
    },
    {
      name: "BeShow Volcano",
      category: "Projectors",
      price: "$1,420.00",
      image: "/white-projector.jpg",
    },
  ]

  return (
    <section className="py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <h2 className="text-[51px] font-inter font-normal mb-8" style={{ color: "#1e354e" }}>
          {styleData.title || "Productos populares"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product, index) => (
            <div key={index} className="bg-gray-50 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-4">
                <h3 className="font-inter font-normal text-[17.4854px] mb-1" style={{ color: "#1e354e" }}>
                  {product.name}
                </h3>
                <p className="text-[13.9775px] font-inter font-normal text-muted-foreground mb-2">{product.category}</p>
                <p className="text-[20.5864px] font-inter font-normal" style={{ color: "#1e354e" }}>
                  {product.price}
                </p>
              </div>

              <div className="aspect-square flex items-center justify-center bg-white p-4">
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
