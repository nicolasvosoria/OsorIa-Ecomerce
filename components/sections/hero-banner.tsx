"use client"

import { Button } from "@/components/ui/button"
import { useComponentStyle } from "@/contexts/styles-context"

export function HeroBanner() {
  const { styles: styleData } = useComponentStyle("hero", {
    label: "Electronics",
    title: "BALFE",
    subtitle: "NUEVO MODELO",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua",
    buttonText: "Comprar ahora",
  })

  return (
    <section className="relative overflow-hidden rounded-3xl mx-4 mt-4 mb-8 bg-[#4a5568]">
      <div className="container mx-auto px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-white space-y-6">
            <span className="inline-block bg-white/20 rounded text-[14.21px] font-inter font-medium rounded-lg px-6 py-1">
              {styleData.label || "Electronics"}
            </span>
            <div>
              <h1 className="text-[92px] font-inter font-medium tracking-tight leading-tight">
                {styleData.title || "BALFE"}
              </h1>
              <h2 className="text-[51px] font-inter font-light tracking-tight">
                {styleData.subtitle || "NUEVO MODELO"}
              </h2>
            </div>
            <p className="text-white/90 text-[16px] font-inter font-medium max-w-md leading-relaxed">
              {styleData.description || "It won't be a bigger problem to find one video game lover in your neighbor"}
            </p>
            <Button
              size="lg"
              className="bg-[#7da54e] hover:bg-[#6b8e42] text-white text-[16px] font-inter font-medium rounded px-8"
            >
              {styleData.buttonText || "Comprar ahora"} →
            </Button>
          </div>

          {/* Right - Product Image */}
          <div className="relative h-[400px] lg:h-[500px]">
            <img src="/black-smart-speaker.jpg" alt="Product" className="w-full h-full object-contain" />
            {/* Feature Callouts */}
            <div className="absolute top-[20%] right-[10%] bg-white rounded-full p-3">
              <div className="w-3 h-3 bg-gray-800 rounded-full" />
            </div>
            <div className="absolute top-[45%] left-[15%] bg-white rounded-full p-3">
              <div className="w-3 h-3 bg-gray-800 rounded-full" />
            </div>
            <div className="absolute bottom-[30%] right-[20%] bg-white rounded-full p-3">
              <div className="w-3 h-3 bg-gray-800 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-[#c19a6b] to-[#8b6f47]" />
    </section>
  )
}
