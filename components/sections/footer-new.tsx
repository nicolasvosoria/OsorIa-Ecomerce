"use client"

import Link from "next/link"
import Image from "next/image"
import { useComponentStyle } from "@/contexts/styles-context"

export function FooterNew() {
  const { styles: styleData } = useComponentStyle("footer", {
    brandName: "OSORIA"
  })

  return (
    <footer className="bg-white border-t border-border py-12 px-4">
      <div className="container mx-auto">
        
        {/* Logo */}
        <div className="mb-12">
          <Link href="/" className="inline-block">
            <Image
              src="/logo-osoria.png"
              alt="Osoria Logo"
              width={140}
              height={50}
              className="object-contain"
              priority
            />
          </Link>
        </div>

        {/* Footer Links */}
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3 className="font-semibold text-foreground mb-4">Navigation</h3>
            <ul className="space-y-2">
              <li><Link href="#about" className="text-muted-foreground hover:text-foreground text-sm">About</Link></li>
              <li><Link href="#terms" className="text-muted-foreground hover:text-foreground text-sm">Terms and Conditions</Link></li>
              <li><Link href="#contact" className="text-muted-foreground hover:text-foreground text-sm">Contact</Link></li>
              <li><Link href="#sales" className="text-muted-foreground hover:text-foreground text-sm">Sales</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Customer service</h3>
            <ul className="space-y-2">
              <li><Link href="#help" className="text-muted-foreground hover:text-foreground text-sm">Help & FAQs</Link></li>
              <li><Link href="#track" className="text-muted-foreground hover:text-foreground text-sm">Track Order</Link></li>
              <li><Link href="#shipping" className="text-muted-foreground hover:text-foreground text-sm">Shipping & Delivery</Link></li>
              <li><Link href="#returns" className="text-muted-foreground hover:text-foreground text-sm">Delivery & Returns</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Our Company</h3>
            <ul className="space-y-2">
              <li><Link href="#team" className="text-muted-foreground hover:text-foreground text-sm">Our team</Link></li>
              <li><Link href="#stationary" className="text-muted-foreground hover:text-foreground text-sm">Stationary Stores</Link></li>
              <li><Link href="#cooperation" className="text-muted-foreground hover:text-foreground text-sm">Marketing Cooperation</Link></li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            © 2025 Electronics by Muffin group | All Rights Reserved
          </p>
        </div>
      </div>
    </footer>
  )
}
