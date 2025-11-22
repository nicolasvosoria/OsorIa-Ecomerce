"use client"

import Link from "next/link"
import Image from "next/image"
import { Search, Heart, ShoppingCart } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useComponentStyle } from "@/contexts/styles-context"

export function Header() {
  const { styles: styleData } = useComponentStyle("header", {
    brandName: "Osoria",
    tagline: "Big Sale! Hurry up! Sale ends in 2025",
  })

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-6 mb-4">
          <div className="text-[16px] font-inter whitespace-nowrap rounded-lg bg-[#c4faff] py-1 px-5">
            <span className="font-bold text-[#005aa1]">Big Sale!</span>
            <span className="font-medium text-[#005aa1]"> Hurry up! Sale ends in 2025</span>
          </div>

          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#adadad]" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-12 pr-4 bg-gray-100 border-gray-200 h-10 rounded-full focus:bg-white w-full text-[#adadad] font-inter font-medium placeholder:text-[#adadad]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-gray-100">
              <Heart className="h-5 w-5 text-gray-700" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-gray-100">
              <ShoppingCart className="h-5 w-5 text-gray-700" />
            </Button>
          </div>
        </div>

        <nav className="flex items-center gap-8 pt-4 border-t">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-osoria.png"
              alt="Osoria Logo"
              width={120}
              height={40}
              className="object-contain"
              priority
            />
          </Link>

          <div className="flex items-center gap-8 ml-auto">
            <Link
              href="#speakers"
              className="text-[16px] font-inter font-medium text-[#005aa1] hover:text-[#005aa1]/80 transition-colors"
            >
              Speakers
            </Link>
            <Link
              href="#earphones"
              className="text-[16px] font-inter font-medium text-[#005aa1] hover:text-[#005aa1]/80 transition-colors"
            >
              Earphones
            </Link>
            <Link
              href="#projectors"
              className="text-[16px] font-inter font-medium text-[#005aa1] hover:text-[#005aa1]/80 transition-colors"
            >
              Projectors
            </Link>
            <Link
              href="#stands"
              className="text-[16px] font-inter font-medium text-[#005aa1] hover:text-[#005aa1]/80 transition-colors"
            >
              Stands
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
