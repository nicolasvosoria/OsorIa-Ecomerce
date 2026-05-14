"use client"

import { useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useComponentStyle } from "@/contexts/styles-context"
import { useTheme } from "@/contexts/theme-context"
import { useStore } from "@/contexts/store-context"
import { useLanguage } from "@/contexts/language-context"

export function FooterNew() {
  const { store } = useStore()
  const { activeTheme } = useTheme()
  const { t } = useLanguage()
  useComponentStyle("footer", {
    brandName: "OSORIA"
  })
  
  // Determinar si es la tienda de repostería
  const isReposteria = store?.subdomain === 'reposteria'

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

  const logoSrc = isDarkTheme ? "/logo-osoria-blanco.svg" : "/logo-negro.svg"
  const brandName = isReposteria ? (store?.store_name || "Tienda de Postres") : "OSORIA"

  return (
    <footer data-component="footer" className="py-8 md:py-12 px-4" style={{ backgroundColor: "var(--background)", borderTop: "1px solid var(--border)" }}>
      <div className="container mx-auto">
        
        {/* Logo o Nombre de la marca */}
        <div className="mb-8 md:mb-12 text-center md:text-left">
          {!isReposteria ? (
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
          ) : (
            <Link href="/" className="inline-block">
              <h2 className="text-2xl md:text-3xl font-serif text-foreground font-bold">
                {brandName}
              </h2>
            </Link>
          )}
        </div>

        {/* Footer Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-12 mb-8 md:mb-12">
          {isReposteria ? (
            <>
              <div>
                <h3 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">{t.footer.navigation}</h3>
                <ul className="space-y-1 md:space-y-2">
                  <li><Link href="/shop" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.shop}</Link></li>
                  <li><Link href="/catalog" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.catalog}</Link></li>
                  <li><Link href="#about" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.about}</Link></li>
                  <li><Link href="#contact" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.contact}</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">{t.footer.products}</h3>
                <ul className="space-y-1 md:space-y-2">
                  <li><Link href="/shop?category=Pasteles" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">Pasteles</Link></li>
                  <li><Link href="/shop?category=Cupcakes" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">Cupcakes</Link></li>
                  <li><Link href="/shop?category=Macarons" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">Macarons</Link></li>
                  <li><Link href="/shop?category=Tartas" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">Tartas</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">{t.footer.information}</h3>
                <ul className="space-y-1 md:space-y-2">
                  <li><Link href="#shipping" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.shippingAndDelivery}</Link></li>
                  <li><Link href="#orders" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.customOrders}</Link></li>
                  <li><Link href="#faq" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.faq}</Link></li>
                  <li><Link href="#terms" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.terms}</Link></li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">{t.footer.navigation}</h3>
                <ul className="space-y-1 md:space-y-2">
                  <li><Link href="#about" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.about}</Link></li>
                  <li><Link href="#terms" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.terms}</Link></li>
                  <li><Link href="#contact" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.contact}</Link></li>
                  <li><Link href="#sales" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.sales}</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">{t.footer.customerService}</h3>
                <ul className="space-y-1 md:space-y-2">
                  <li><Link href="#help" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.help}</Link></li>
                  <li><Link href="#track" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.trackOrder}</Link></li>
                  <li><Link href="#shipping" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.shipping}</Link></li>
                  <li><Link href="#returns" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.returns}</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">{t.footer.ourCompany}</h3>
                <ul className="space-y-1 md:space-y-2">
                  <li><Link href="#team" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.team}</Link></li>
                  <li><Link href="#stationary" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.stores}</Link></li>
                  <li><Link href="#cooperation" className="text-muted-foreground hover:text-foreground text-xs md:text-sm">{t.footer.marketing}</Link></li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm text-center" style={{ color: "var(--muted-foreground)" }}>
            {isReposteria ? (
              <>© 2025 {brandName} | {t.footer.allRightsReserved} | {t.footer.madeWith}</>
            ) : (
              <>© 2025 {t.footer.electronicsBy} | {t.footer.allRightsReserved}</>
            )}
          </p>
        </div>
      </div>
    </footer>
  )
}
