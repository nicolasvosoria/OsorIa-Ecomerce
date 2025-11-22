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
    <section className="py-16 px-4 bg-background">
      <div className="container mx-auto">
        <h2 className="text-[47px] font-inter font-normal text-left mb-12" style={{ color: "#1e354e" }}>
          {styleData.title || "Why us?"}
        </h2>

        <div className="grid md:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-gray-300">
                <feature.icon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-inter font-normal text-[19px] mb-1" style={{ color: "#1e354e" }}>
                  {feature.title}
                </h3>
                <p className="text-[15px] font-inter font-normal text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
