"use client"

import { useComponentStyle } from "@/contexts/styles-context"

export function PopularItems() {
  const { styles: styleData } = useComponentStyle("popular", {
    title: "Popular Items",
    priceLabel: "Starting at $29",
  })

  const items = [
    {
      title: "Bluetooth Speakers",
      price: "Starting at $356",
      image: "/bluetooth-speaker-modern.jpg",
    },
    {
      title: "Headphones & Earphones",
      price: "Starting at $29",
      image: "/premium-headphones.png",
    },
    {
      title: "Laptop stands",
      price: "Starting at $82",
      image: "/placeholder.svg?height=400&width=600",
    },
  ]

  return (
    <section className="py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h2 className="text-[48.4146px] font-inter font-normal" style={{ color: "#1e354e" }}>
            {styleData.title || "Popular Items"}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item, index) => (
            <div
              key={index}
              className="relative group cursor-pointer overflow-hidden rounded-2xl aspect-[4/3] bg-gray-100"
            >
              <img
                src={item.image || "/placeholder.svg"}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                <h3 className="text-white text-[31.1153px] font-inter font-medium mb-2">{item.title}</h3>
                <p className="text-white/90 text-[15.447px] font-inter font-medium">{item.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
