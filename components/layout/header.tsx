"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, Heart, ShoppingCart, Palette, AlignLeft, Menu, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useComponentStyle } from "@/contexts/styles-context"
import { useTheme } from "@/contexts/theme-context"
import { ThemeSelectorModal } from "@/components/theme/theme-selector-modal"
import { FontSelectorModal } from "@/components/font/font-selector-modal"
import Image from "next/image"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"

export function Header() {
  const [themeModalOpen, setThemeModalOpen] = useState(false)
  const [fontModalOpen, setFontModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const { activeTheme } = useTheme()
  const { styles: styleData } = useComponentStyle("header", {
    brandName: "Osoria",
    tagline: "Big Sale! Hurry up! Sale ends in 2025",
    bannerBgColor: "#c4faff",
    bannerTextColor: "#005aa1",
    searchPlaceholder: "Search...",
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

  console.log("[v0] Header rendering with styles:", styleData)

  return (
    <header className="sticky top-0 z-50 w-full border-b" style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}>
      <div className="container mx-auto px-4 py-3 md:py-6">
        {/* Banner - Oculto en móvil */}
        <div className="hidden md:flex items-center justify-between gap-6 mb-4 relative">
          <Link href="/" className="flex items-center">
            <Image 
              src={logoSrc}
              alt="Osoria Logo"
              width={120}
              height={40}
              className="object-contain"
              priority
            />
          </Link>

          {/* Botón de menú */}
          <Button
            variant="ghost"
            className="h-10 pl-2 pr-4 rounded-full gap-1"
            style={{ backgroundColor: "transparent" }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--muted)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            onClick={() => setMenuOpen(true)}
            title="Abrir menú"
          >
            <Menu className="h-5 w-5" style={{ color: "var(--foreground)" }} />
            <span className="text-[15px] font-medium" style={{ color: "var(--foreground)" }}>Menú</span>
          </Button>

          <div className="absolute left-1/2 -translate-x-1/2 max-w-xl w-full">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
              <Input
                type="search"
                placeholder={styleData.searchPlaceholder || "Search..."}
                className="pl-12 pr-4 h-10 rounded-full w-full font-inter font-medium"
                style={{
                  backgroundColor: "var(--muted)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full"
              style={{ 
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--muted)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              <Heart className="h-5 w-5" style={{ color: "var(--foreground)" }} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full"
              style={{ 
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--muted)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              onClick={() => setCartOpen(true)}
              title="Ver carrito"
            >
              <ShoppingCart className="h-5 w-5" style={{ color: "var(--foreground)" }} />
            </Button>
          </div>
        </div>

        {/* Móvil: Logo, menú y búsqueda */}
        <div className="md:hidden flex items-center justify-between gap-2 mb-4">
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image 
              src={logoSrc}
              alt="Osoria Logo"
              width={100}
              height={33}
              className="object-contain"
              priority
            />
          </Link>
          <div className="flex-1 relative max-w-xs mx-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
            <Input
              type="search"
              placeholder={styleData.searchPlaceholder || "Search..."}
              className="pl-10 pr-4 h-9 rounded-full w-full text-sm"
              style={{
                backgroundColor: "var(--muted)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--muted)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              onClick={() => setMenuOpen(true)}
              title="Abrir menú"
            >
              <Menu className="h-4 w-4" style={{ color: "var(--foreground)" }} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-full"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--muted)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              onClick={() => setCartOpen(true)}
              title="Ver carrito"
            >
              <ShoppingCart className="h-4 w-4" style={{ color: "var(--foreground)" }} />
            </Button>
          </div>
        </div>

        <nav className="flex items-center gap-4 md:gap-8 pt-3 md:pt-4 border-t -mx-4 md:-mx-4 px-4 md:px-0" style={{ borderColor: "var(--border)" }}>
          <Link
            href="/sale"
            className="text-sm md:text-[16px] font-inter whitespace-nowrap rounded-lg py-1 px-3 md:px-5 cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-105"
            style={{ backgroundColor: styleData.bannerBgColor || "#c4faff" }}
          >
            <span className="font-bold" style={{ color: styleData.bannerTextColor || "#005aa1" }}>
              {styleData.tagline?.split("!")[0] || "Big Sale"}!
            </span>
            <span className="font-medium hidden sm:inline" style={{ color: styleData.bannerTextColor || "#005aa1" }}>
              {" "}
              {styleData.tagline?.split("!").slice(1).join("!") || "Hurry up! Sale ends in 2025"}
            </span>
          </Link>

          <div className="flex items-center gap-2 md:gap-4 lg:gap-8 ml-auto flex-wrap">
            <Link
              href="#speakers"
              className="text-sm md:text-[16px] font-inter font-medium transition-colors"
              style={{ color: "var(--primary)" }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              Speakers
            </Link>
            <Link
              href="#earphones"
              className="text-sm md:text-[16px] font-inter font-medium transition-colors"
              style={{ color: "var(--primary)" }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              Earphones
            </Link>
            <Link
              href="#projectors"
              className="text-sm md:text-[16px] font-inter font-medium transition-colors"
              style={{ color: "var(--primary)" }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              Projectors
            </Link>
            <Link
              href="#stands"
              className="text-sm md:text-[16px] font-inter font-medium transition-colors"
              style={{ color: "var(--primary)" }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              Stands
            </Link>
          </div>
        </nav>
      </div>
      <ThemeSelectorModal open={themeModalOpen} onOpenChange={setThemeModalOpen} />
      <FontSelectorModal open={fontModalOpen} onOpenChange={setFontModalOpen} />
      
      {/* Menú lateral */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent 
          side="left" 
          className="w-[300px] sm:w-[400px] p-0"
          style={{ backgroundColor: "var(--background)" }}
        >
          <SheetHeader className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
            <SheetTitle className="text-xl font-inter font-semibold" style={{ color: "var(--foreground)" }}>
              Menú
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col h-full">
            <div className="flex flex-col p-6 gap-4 flex-1">
              <Link
                href="/"
                className="text-base font-inter font-medium py-3 px-4 rounded-lg transition-colors"
                style={{ color: "var(--foreground)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--muted)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
                onClick={() => setMenuOpen(false)}
              >
                Inicio
              </Link>
              <Link
                href="/sale"
                className="text-base font-inter font-medium py-3 px-4 rounded-lg transition-colors"
                style={{ color: "var(--foreground)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--muted)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
                onClick={() => setMenuOpen(false)}
              >
                Ofertas
              </Link>
              <Link
                href="#speakers"
                className="text-base font-inter font-medium py-3 px-4 rounded-lg transition-colors"
                style={{ color: "var(--foreground)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--muted)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
                onClick={() => setMenuOpen(false)}
              >
                Speakers
              </Link>
              <Link
                href="#earphones"
                className="text-base font-inter font-medium py-3 px-4 rounded-lg transition-colors"
                style={{ color: "var(--foreground)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--muted)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
                onClick={() => setMenuOpen(false)}
              >
                Earphones
              </Link>
              <Link
                href="#projectors"
                className="text-base font-inter font-medium py-3 px-4 rounded-lg transition-colors"
                style={{ color: "var(--foreground)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--muted)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
                onClick={() => setMenuOpen(false)}
              >
                Projectors
              </Link>
              <Link
                href="#stands"
                className="text-base font-inter font-medium py-3 px-4 rounded-lg transition-colors"
                style={{ color: "var(--foreground)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--muted)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
                onClick={() => setMenuOpen(false)}
              >
                Stands
              </Link>
            </div>
            
            <div className="pt-4 mt-auto border-t p-6" style={{ borderColor: "var(--border)" }}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                style={{ color: "var(--foreground)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--muted)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
                onClick={() => {
                  setMenuOpen(false)
                  setThemeModalOpen(true)
                }}
              >
                <Palette className="h-4 w-4" />
                Cambiar tema
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 mt-2"
                style={{ color: "var(--foreground)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--muted)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
                onClick={() => {
                  setMenuOpen(false)
                  setFontModalOpen(true)
                }}
              >
                <AlignLeft className="h-4 w-4" />
                Cambiar fuente
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sidebar del carrito */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent 
          side="right" 
          className="w-[300px] sm:w-[400px] p-0"
          style={{ backgroundColor: "var(--background)" }}
        >
          <SheetHeader className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
            <SheetTitle className="text-xl font-inter font-semibold" style={{ color: "var(--foreground)" }}>
              Carrito de compras
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col h-full">
            {/* Contenido del carrito */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingCart className="h-16 w-16 mb-4" style={{ color: "var(--muted-foreground)", opacity: 0.5 }} />
                <p className="text-base font-inter font-medium mb-2" style={{ color: "var(--foreground)" }}>
                  Tu carrito está vacío
                </p>
                <p className="text-sm font-inter" style={{ color: "var(--muted-foreground)" }}>
                  Agrega productos desde la tienda
                </p>
              </div>
            </div>

            {/* Footer del carrito */}
            <div className="p-6 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-base font-inter font-semibold" style={{ color: "var(--foreground)" }}>
                  Total:
                </span>
                <span className="text-xl font-inter font-bold" style={{ color: "var(--primary)" }}>
                  $0.00
                </span>
              </div>
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
                onClick={() => setCartOpen(false)}
              >
                Finalizar compra
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
