"use client"

import { Headphones, Truck, CreditCard, Tag } from "lucide-react"
import { useComponentStyle } from "@/contexts/styles-context"

export function WhyUs() {
  const { styles: styleData } = useComponentStyle("whyus", {
    title: "Why us?",
  })

  const features = [
    {
      icon: Headphones,
      title: "24/7 Support",
      description: "& 24/6 (holiday)",
    },
    {
      icon: Truck,
      title: "Free Shipping",
      description: "Delivery 10 Days",
    },
    {
      icon: CreditCard,
      title: "Easy Payment",
      description: "Credit, Debit, QR",
    },
    {
      icon: Tag,
      title: "Big Discounts",
      description: "Up Big Stock",
    },
  ]

  return (
    <section className="py-8 md:py-16 px-4" style={{ backgroundColor: "var(--background)" }}>
      <div className="container mx-auto">
        <h2 className="text-2xl md:text-4xl lg:text-[47px] font-inter font-normal text-center md:text-left mb-6 md:mb-12" style={{ color: "var(--foreground)" }}>
          {styleData.title || "Why us?"}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center space-y-2 md:space-y-4">
              <div 
                className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2"
                style={{ 
                  backgroundColor: "var(--muted)",
                  borderColor: "var(--border)"
                }}
              >
                <feature.icon className="h-6 w-6 md:h-8 md:w-8" style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <h3 className="font-inter font-normal text-sm md:text-[19px] mb-1" style={{ color: "var(--foreground)" }}>
                  {feature.title}
                </h3>
                <p className="text-xs md:text-[15px] font-inter font-normal" style={{ color: "var(--muted-foreground)" }}>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
