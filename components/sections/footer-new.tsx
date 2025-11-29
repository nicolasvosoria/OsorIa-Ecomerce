"use client"

import { useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useComponentStyle } from "@/contexts/styles-context"
import { useTheme } from "@/contexts/theme-context"

export function FooterNew() {
  const { activeTheme } = useTheme()
  const { styles: styleData } = useComponentStyle("footer", {
    brandName: "OSORIA"
  })

  // Determinar si el tema es oscuro
  const isDarkTheme = useMemo(() => {
    if (!activeTheme) return false
    // Verificar si el nombre del tema contiene "Oscuro"
    if (activeTheme.theme_name.toLowerCase().includes("oscuro")) {
      return true
    }
    // También verificar si el background es oscuro (RGB bajo)
    const bgColor = activeTheme.colors.background
    if (bgColor.startsWith("#")) {
      const r = parseInt(bgColor.slice(1, 3), 16)
      const g = parseInt(bgColor.slice(3, 5), 16)
      const b = parseInt(bgColor.slice(5, 7), 16)
      // Si el promedio de RGB es menor a 128, es un tema oscuro
      const avg = (r + g + b) / 3
      return avg < 128
    }
    return false
  }, [activeTheme])

  const logoSrc = isDarkTheme ? "/logo-osoria-blanco.svg" : "/logo-osoria.png"

  return (
    <footer className="py-8 md:py-12 px-4" style={{ backgroundColor: "var(--background)", borderTop: "1px solid var(--border)" }}>
      <div className="container mx-auto">
        
        {/* Logo */}
        <div className="mb-8 md:mb-12 text-center md:text-left">
          <Link href="/" className="inline-block">
            <Image
              src={logoSrc}
              alt="Osoria Logo"
              width={140}
              height={50}
              className="object-contain mx-auto md:mx-0"
              priority
            />
          </Link>
        </div>

        {/* Footer Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-12 mb-8 md:mb-12">
          <div>
            <h3 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">Navigation</h3>
            <ul className="space-y-1 md:space-y-2">
              <li><Link href="#about" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">About</Link></li>
              <li><Link href="#terms" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">Terms and Conditions</Link></li>
              <li><Link href="#contact" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">Contact</Link></li>
              <li><Link href="#sales" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">Sales</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">Customer service</h3>
            <ul className="space-y-1 md:space-y-2">
              <li><Link href="#help" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">Help & FAQs</Link></li>
              <li><Link href="#track" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">Track Order</Link></li>
              <li><Link href="#shipping" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">Shipping & Delivery</Link></li>
              <li><Link href="#returns" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">Delivery & Returns</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">Our Company</h3>
            <ul className="space-y-1 md:space-y-2">
              <li><Link href="#team" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">Our team</Link></li>
              <li><Link href="#stationary" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">Stationary Stores</Link></li>
              <li><Link href="#cooperation" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">Marketing Cooperation</Link></li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm text-center" style={{ color: "var(--muted-foreground)" }}>
            © 2025 Electronics by Muffin group | All Rights Reserved
          </p>
        </div>
      </div>
    </footer>
  )
}
