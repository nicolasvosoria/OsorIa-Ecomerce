/* eslint-disable @next/next/no-img-element -- Existing dynamic storefront images intentionally use native img in these legacy components; converting all to next/image is outside the global-gates cleanup risk budget. */
"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Search, Heart, ShoppingCart, Palette, AlignLeft, Menu, LogIn, LogOut, User, Eye, EyeOff, CreditCard, Building2, Wallet, LayoutDashboard, Edit } from "lucide-react"
import { VisaIcon, MasterCardIcon, AmexIcon } from "@/components/icons/cc-icons"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useComponentStyle } from "@/contexts/styles-context"
import { useTheme } from "@/contexts/theme-context"
import { useStore } from "@/contexts/store-context"
import { ThemeSelectorModal } from "@/components/theme/theme-selector-modal"
import { FontSelectorModal } from "@/components/font/font-selector-modal"
import Image from "next/image"
import { useCart } from "@/contexts/cart-context"
import { useWishlist } from "@/contexts/wishlist-context"
import { useAuth } from "@/contexts/auth-context"
import { Trash2, Plus, Minus } from "lucide-react"
import { toast } from "sonner"
import { resetPassword } from "@/lib/supabase/auth-api"
import { deferStateUpdate } from "@/lib/react/defer-state-update"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CheckoutOptionsDialog } from "@/components/cart/checkout-options-dialog"
import { useLanguage } from "@/contexts/language-context"

// Helper para generar slug desde el nombre de categoría
function generateCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function Header() {
  const router = useRouter()
  const [themeModalOpen, setThemeModalOpen] = useState(false)
  const [fontModalOpen, setFontModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [loginRequiredDialogOpen, setLoginRequiredDialogOpen] = useState(false)
  const [showCheckoutOptionsDialog, setShowCheckoutOptionsDialog] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ id: string; title: string; slug: string; image?: string }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [categories, setCategories] = useState<Array<{ id: string; category_name: string; display_order: number }>>([])
  const { activeTheme } = useTheme()
  const { items, removeFromCart, updateQuantity, getTotal, getItemSubtotal, getTotalItems } = useCart()
  const { getTotalItems: getWishlistTotalItems } = useWishlist()
  const { user, isAuthenticated, login, register, logout, refreshUser } = useAuth()
  const { store } = useStore()
  const { t } = useLanguage()
  const { styles: styleData } = useComponentStyle("header", {
    brandName: "Osoria",
    logoImage: "/logo-negro.svg",
    logoImageDark: "/logo-osoria-blanco.svg",
    searchPlaceholder: "Buscar...",
    tagline: "Big Sale! Hurry up! Sale ends in 2025",
    // Usar variables CSS del tema para que se adapte a temas oscuros
    bgColor: "var(--background)",
    bannerBgColor: "var(--secondary)",
    bannerTextColor: "var(--primary)",
    menuButtonColor: "var(--foreground)",
    menuButtonHoverBg: "var(--muted)",
    loginButtonColor: "var(--foreground)",
    loginButtonHoverBg: "var(--muted)",
    iconColor: "var(--foreground)",
    iconHoverBg: "var(--muted)",
    searchIconColor: "var(--muted-foreground)",
    searchBgColor: "var(--muted)",
    searchTextColor: "var(--foreground)",
    searchBorderColor: "var(--border)",
    linkColor: "var(--primary)",
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

  // Usar logo desde configuración o valores por defecto
  const logoSrc = isDarkTheme 
    ? (styleData.logoImageDark || "/logo-osoria-blanco.svg")
    : (styleData.logoImage || "/logo-negro.svg")
  const pathname = usePathname()

  // Sincronizar el query de búsqueda con la URL cuando esté en /shop
  useEffect(() => {
    if (pathname === '/shop') {
      const params = new URLSearchParams(window.location.search)
      const queryParam = params.get('q')
      if (queryParam) {
        deferStateUpdate(() => setSearchQuery(queryParam))
      }
    }
  }, [pathname])

  // Buscar sugerencias mientras el usuario escribe (con debounce)
  useEffect(() => {
    const query = searchQuery.trim()
    
    // Si el query está vacío, ocultar sugerencias
    if (!query || query.length < 2) {
      deferStateUpdate(() => {
        setSearchSuggestions([])
        setShowSuggestions(false)
      })
      return
    }

    // Debounce: esperar 300ms después de que el usuario deje de escribir
    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      try {
        // Usar directamente searchItems de Supabase (funciona en cliente)
        const { searchItems } = await import('@/lib/supabase/products-api')
        const items = await searchItems(query, 5) // Limitar a 5 sugerencias
        setSearchSuggestions(
          items.map(item => ({
            id: item.id,
            title: item.item_name,
            slug: item.item_slug || item.id,
            image: item.primary_image_url,
          }))
        )
        setShowSuggestions(items.length > 0)
      } catch (error) {
        console.error('Error fetching search suggestions:', error)
        setSearchSuggestions([])
        setShowSuggestions(false)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Ocultar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.search-container')) {
        setShowSuggestions(false)
      }
    }

    if (showSuggestions) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showSuggestions])

  // Cargar categorías desde la API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        if (response.ok) {
          const data = await response.json()
          // Filtrar categorías no deseadas (por si acaso)
          const filtered = data.filter(
            (cat: any) => 
              cat.category_name?.toLowerCase() !== 'sin categoría' &&
              cat.category_name?.toLowerCase() !== 'ropa'
          )
          // Ordenar por display_order
          const sorted = filtered.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
          setCategories(sorted)
        }
      } catch (error) {
        console.error('Error loading categories:', error)
      }
    }

    loadCategories()
  }, [store?.id]) // Recargar cuando cambie la tienda

  // Removido console.log para evitar spam en consola y rate limiting

  // Handler para búsqueda
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    setShowSuggestions(false)
    const query = searchQuery.trim()
    if (query) {
      router.push(`/shop?q=${encodeURIComponent(query)}`)
    } else {
      router.push('/shop')
    }
  }

  // Handler para Enter en el input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  // Handler para seleccionar una sugerencia
  const handleSelectSuggestion = (slug: string) => {
    setShowSuggestions(false)
    router.push(`/products/${slug}`)
  }

  return (
    <header 
      className="sticky top-0 z-50 w-full border-b" 
      style={{ 
        backgroundColor: styleData.bgColor || "var(--background)", 
        borderColor: "var(--border)",
        // Asegurar que el header use el color de fondo del tema
      }}
    >
      <div className="container mx-auto px-4 py-3 md:py-6">
        {/* Desktop y Tablet: Layout completo */}
        <div className="hidden md:flex items-center justify-between gap-3 lg:gap-6 mb-4 relative">
          {/* Logo - Izquierda */}
          <Link href="/" className="flex items-center flex-shrink-0 z-10">
            <Image 
              src={logoSrc}
              alt="Osoria Logo"
              width={120}
              height={40}
              className="object-contain w-auto h-8 lg:h-10"
              priority
            />
          </Link>

          {/* Botón de menú - Izquierda después del logo */}
          <Button
            variant="ghost"
            className="h-9 lg:h-10 pl-2 pr-3 lg:pr-4 rounded-full gap-1.5 flex-shrink-0 z-10"
            style={{ backgroundColor: "transparent" }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styleData.menuButtonHoverBg || "var(--muted)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            onClick={() => setMenuOpen(true)}
            title={t.header.menu}
          >
            <Menu className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: styleData.menuButtonColor || "var(--foreground)" }} />
            <span className="text-sm lg:text-[15px] font-medium hidden lg:inline" style={{ color: styleData.menuButtonColor || "var(--foreground)" }}>{t.header.menu}</span>
          </Button>

          {/* Barra de búsqueda - Centro (responsive) */}
          <form 
            className="flex-1 max-w-md lg:max-w-xl mx-2 lg:mx-4 relative search-container"
            onSubmit={handleSearch}
          >
            <div className="relative">
              <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 lg:h-4 lg:w-4 z-10 pointer-events-none" style={{ color: styleData.searchIconColor || "var(--muted-foreground)" }} />
              <Input
                type="search"
                placeholder={t.header.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value.trim().length >= 2) {
                    setShowSuggestions(true)
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2 && searchSuggestions.length > 0) {
                    setShowSuggestions(true)
                  }
                }}
                className="pl-10 lg:pl-14 pr-4 h-9 lg:h-10 rounded-full w-full font-inter font-medium text-sm lg:text-base border"
                style={{
                  backgroundColor: styleData.searchBgColor || "var(--muted)",
                  borderColor: styleData.searchBorderColor || "var(--border)",
                  color: styleData.searchTextColor || "var(--foreground)",
                  paddingLeft: "2.5rem",
                }}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 lg:h-8 lg:w-8 rounded-full hover:bg-transparent"
                style={{ backgroundColor: "transparent" }}
                onClick={handleSearch}
                title={t.header.search}
              >
                <Search className="h-3.5 w-3.5 lg:h-4 lg:w-4" style={{ color: styleData.searchIconColor || "var(--muted-foreground)" }} />
              </Button>

              {/* Dropdown de sugerencias */}
              {showSuggestions && searchQuery.trim().length >= 2 && (
                <div 
                  className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--background)",
                  }}
                >
                  {isSearching ? (
                    <div className="p-4 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                      Buscando...
                    </div>
                  ) : searchSuggestions.length > 0 ? (
                    <>
                      <div className="p-2 border-b" style={{ borderColor: "var(--border)" }}>
                        <p className="text-xs font-medium px-2" style={{ color: "var(--muted-foreground)" }}>
                          Productos sugeridos
                        </p>
                      </div>
                      {searchSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(suggestion.slug)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                          style={{ 
                            backgroundColor: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--muted)"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent"
                          }}
                        >
                          {suggestion.image ? (
                            <img 
                              src={suggestion.image} 
                              alt={suggestion.title}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg"
                              }}
                            />
                          ) : (
                            <div 
                              className="w-12 h-12 rounded flex items-center justify-center"
                              style={{ backgroundColor: "var(--muted)" }}
                            >
                              <Search className="h-5 w-5" style={{ color: "var(--muted-foreground)" }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                              {suggestion.title}
                            </p>
                          </div>
                        </button>
                      ))}
                      <div className="p-2 border-t" style={{ borderColor: "var(--border)" }}>
                        <button
                          type="button"
                          onClick={handleSearch}
                          className="w-full text-sm font-medium text-center py-2 hover:underline"
                          style={{ color: "var(--primary)" }}
                        >
                          {t.header.viewAllResults.replace('{query}', searchQuery)}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                      {t.header.noProductsFound}
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>

          {/* Iconos de acción - Derecha */}
          <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0 z-10">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-9 lg:h-10 px-2.5 lg:px-4 rounded-full gap-1.5 lg:gap-2"
                    style={{ backgroundColor: "transparent" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styleData.loginButtonHoverBg || "var(--muted)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <User className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: styleData.loginButtonColor || "var(--foreground)" }} />
                    <span className="text-xs lg:text-sm xl:text-base font-medium hidden xl:inline truncate max-w-[150px]" style={{ color: styleData.loginButtonColor || "var(--foreground)" }}>
                      {user?.role === 'admin' 
                        ? t.nav.admin
                        : user?.first_name && user?.last_name 
                          ? `${user.first_name} ${user.last_name}`
                          : user?.email?.split('@')[0] || t.nav.account}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}>
                  <DropdownMenuLabel style={{ color: "var(--foreground)" }}>
                    {user?.role === 'admin' 
                      ? "Administrador"
                      : user?.first_name && user?.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : user?.email || "Usuario"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator style={{ backgroundColor: "var(--border)" }} />
                  {user?.role === 'admin' && (
                    <>
                      <DropdownMenuItem asChild style={{ color: "var(--foreground)" }}>
                        <Link href="/dashboard">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          {t.nav.dashboard}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild style={{ color: "var(--foreground)" }}>
                        <Link href="/admin">
                          <Edit className="mr-2 h-4 w-4" />
                          {t.admin.pageEditor}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator style={{ backgroundColor: "var(--border)" }} />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={async () => {
                      // Guardar si el usuario es administrador antes de cerrar sesión
                      const wasAdmin = user?.role === 'admin'
                      const wasOnAdminPage = pathname === '/admin' || pathname === '/dashboard'
                      
                      await logout()
                      
                      // Si era administrador, redirigir a la página principal
                      if (wasAdmin && wasOnAdminPage) {
                        router.push('/')
                      }
                      
                      toast.success(t.header.sessionClosed, {
                        description: t.header.sessionClosedDescription,
                        duration: 3000,
                      })
                    }}
                    style={{ color: "var(--foreground)" }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t.auth.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="ghost" 
                className="h-9 lg:h-10 px-2.5 lg:px-4 rounded-full gap-1.5 lg:gap-2"
                style={{ backgroundColor: "transparent" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styleData.loginButtonHoverBg || "var(--muted)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                onClick={() => setLoginModalOpen(true)}
                title={t.auth.login}
              >
                <LogIn className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: styleData.loginButtonColor || "var(--foreground)" }} />
                <span className="text-xs lg:text-sm xl:text-base font-medium hidden xl:inline" style={{ color: styleData.loginButtonColor || "var(--foreground)" }}>{t.auth.login}</span>
              </Button>
            )}
            <Button
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 lg:h-10 lg:w-10 rounded-full touch-manipulation relative flex-shrink-0"
              style={{ 
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styleData.iconHoverBg || "var(--muted)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              onClick={() => router.push('/wishlist')}
              title={t.nav.wishlist}
            >
              <Heart className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: styleData.iconColor || "var(--foreground)" }} />
              {getWishlistTotalItems() > 0 && (
                <span
                  className="absolute -top-1 -right-1 h-4 w-4 lg:h-5 lg:w-5 rounded-full flex items-center justify-center text-[10px] lg:text-xs font-bold text-white"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {getWishlistTotalItems() > 99 ? '99+' : getWishlistTotalItems()}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 lg:h-10 lg:w-10 rounded-full touch-manipulation relative flex-shrink-0"
              style={{ 
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styleData.iconHoverBg || "var(--muted)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              onClick={() => setCartOpen(true)}
              title={t.nav.cart}
            >
              <ShoppingCart className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: styleData.iconColor || "var(--foreground)" }} />
              {getTotalItems() > 0 && (
                <span
                  className="absolute -top-1 -right-1 h-4 w-4 lg:h-5 lg:w-5 rounded-full flex items-center justify-center text-[10px] lg:text-xs font-bold text-white"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {getTotalItems() > 99 ? '99+' : getTotalItems()}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Móvil: Layout optimizado */}
        <div className="md:hidden flex flex-col gap-3 mb-4">
          {/* Primera fila: Logo, iconos de acción */}
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="flex items-center flex-shrink-0">
              <Image 
                src={logoSrc}
                alt="Osoria Logo"
                width={100}
                height={33}
                className="object-contain h-7 sm:h-8"
                priority
              />
            </Link>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full touch-manipulation"
                      style={{ backgroundColor: "transparent" }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styleData.loginButtonHoverBg || "var(--muted)"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      title={user?.role === 'admin' ? t.nav.admin : t.nav.account}
                    >
                      <User className="h-4 w-4" style={{ color: styleData.loginButtonColor || "var(--foreground)" }} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}>
                    <DropdownMenuLabel style={{ color: "var(--foreground)" }}>
                      {user?.role === 'admin' 
                        ? "Administrador"
                        : user?.first_name && user?.last_name 
                          ? `${user.first_name} ${user.last_name}`
                          : user?.email || "Usuario"}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator style={{ backgroundColor: "var(--border)" }} />
                    {user?.role === 'admin' && (
                      <>
                        <DropdownMenuItem asChild style={{ color: "var(--foreground)" }}>
                          <Link href="/dashboard">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            {t.nav.dashboard}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild style={{ color: "var(--foreground)" }}>
                          <Link href="/admin">
                            <Edit className="mr-2 h-4 w-4" />
                            {t.admin.pageEditor}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator style={{ backgroundColor: "var(--border)" }} />
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={async () => {
                        const wasAdmin = user?.role === 'admin'
                        const wasOnAdminPage = pathname === '/admin' || pathname === '/dashboard'
                        
                        await logout()
                        
                        if (wasAdmin && wasOnAdminPage) {
                          router.push('/')
                        }
                        
                        toast.success("Sesión cerrada", {
                          description: "Has cerrado sesión exitosamente",
                          duration: 3000,
                        })
                      }}
                      style={{ color: "var(--foreground)" }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t.auth.logout}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full touch-manipulation"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styleData.loginButtonHoverBg || "var(--muted)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  onClick={() => setLoginModalOpen(true)}
                  title={t.auth.login}
                >
                  <LogIn className="h-4.5 w-4.5" style={{ color: styleData.loginButtonColor || "var(--foreground)" }} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full touch-manipulation relative flex-shrink-0"
                style={{ backgroundColor: "transparent" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styleData.iconHoverBg || "var(--muted)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                onClick={() => router.push('/wishlist')}
                title={t.nav.wishlist}
              >
                <Heart className="h-4 w-4" style={{ color: styleData.iconColor || "var(--foreground)" }} />
                {getWishlistTotalItems() > 0 && (
                  <span
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    {getWishlistTotalItems() > 99 ? '99+' : getWishlistTotalItems()}
                  </span>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full relative touch-manipulation flex-shrink-0"
                style={{ backgroundColor: "transparent" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styleData.iconHoverBg || "var(--muted)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                onClick={() => setCartOpen(true)}
                title={t.nav.cart}
              >
                <ShoppingCart className="h-4 w-4" style={{ color: styleData.iconColor || "var(--foreground)" }} />
                {getTotalItems() > 0 && (
                  <span
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    {getTotalItems() > 99 ? '99+' : getTotalItems()}
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full touch-manipulation flex-shrink-0"
                style={{ backgroundColor: "transparent" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styleData.menuButtonHoverBg || "var(--muted)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                onClick={() => setMenuOpen(true)}
                title={t.header.menu}
              >
                <Menu className="h-4 w-4" style={{ color: styleData.menuButtonColor || "var(--foreground)" }} />
              </Button>
            </div>
          </div>
          
          {/* Segunda fila: Barra de búsqueda */}
          <form 
            className="relative w-full search-container"
            onSubmit={handleSearch}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 z-10 pointer-events-none" style={{ color: styleData.searchIconColor || "var(--muted-foreground)" }} />
              <Input
                type="search"
                placeholder={t.header.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value.trim().length >= 2) {
                    setShowSuggestions(true)
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2 && searchSuggestions.length > 0) {
                    setShowSuggestions(true)
                  }
                }}
                className="pl-10 pr-10 h-10 rounded-full w-full text-sm border"
                style={{
                  backgroundColor: styleData.searchBgColor || "var(--muted)",
                  borderColor: styleData.searchBorderColor || "var(--border)",
                  color: styleData.searchTextColor || "var(--foreground)",
                  paddingLeft: "2.5rem",
                }}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-transparent"
                style={{ backgroundColor: "transparent" }}
                onClick={handleSearch}
                title={t.header.search}
              >
                <Search className="h-4 w-4" style={{ color: styleData.searchIconColor || "var(--muted-foreground)" }} />
              </Button>

              {/* Dropdown de sugerencias - Móvil */}
              {showSuggestions && searchQuery.trim().length >= 2 && (
                <div 
                  className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--background)",
                  }}
                >
                  {isSearching ? (
                    <div className="p-4 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                      Buscando...
                    </div>
                  ) : searchSuggestions.length > 0 ? (
                    <>
                      <div className="p-2 border-b" style={{ borderColor: "var(--border)" }}>
                        <p className="text-xs font-medium px-2" style={{ color: "var(--muted-foreground)" }}>
                          Productos sugeridos
                        </p>
                      </div>
                      {searchSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(suggestion.slug)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                          style={{ 
                            backgroundColor: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--muted)"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent"
                          }}
                        >
                          {suggestion.image ? (
                            <img 
                              src={suggestion.image} 
                              alt={suggestion.title}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg"
                              }}
                            />
                          ) : (
                            <div 
                              className="w-12 h-12 rounded flex items-center justify-center"
                              style={{ backgroundColor: "var(--muted)" }}
                            >
                              <Search className="h-5 w-5" style={{ color: "var(--muted-foreground)" }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                              {suggestion.title}
                            </p>
                          </div>
                        </button>
                      ))}
                      <div className="p-2 border-t" style={{ borderColor: "var(--border)" }}>
                        <button
                          type="button"
                          onClick={handleSearch}
                          className="w-full text-sm font-medium text-center py-2 hover:underline"
                          style={{ color: "var(--primary)" }}
                        >
                          {t.header.viewAllResults.replace('{query}', searchQuery)}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                      {t.header.noProductsFound}
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Navegación eliminada - categorías y banner Big Sale removidos */}
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
              {t.header.menu}
            </SheetTitle>
            {/* Mensaje de bienvenida para usuarios autenticados - Solo en desktop */}
            {isAuthenticated && user && (
              <p className="hidden md:block text-base font-medium mt-4" style={{ color: "var(--foreground)" }}>
                {user?.role === 'admin' 
                  ? t.header.welcomeAdmin
                  : t.header.welcome.replace('{name}', user.first_name || user.email.split('@')[0])}
              </p>
            )}
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
                {t.nav.home}
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
                {t.header.offers}
              </Link>
              {/* Categorías dinámicas desde la BD */}
              {categories.length > 0 ? (
                categories.map((category) => {
                  const categorySlug = generateCategorySlug(category.category_name)
                  return (
                    <Link
                      key={category.id}
                      href={`/catalog/${categorySlug}`}
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
                      {category.category_name}
                    </Link>
                  )
                })
              ) : (
                // Fallback mientras se cargan las categorías
                <div className="text-sm text-muted-foreground px-4 py-2">
                  {t.header.loadingCategories}
                </div>
              )}
              
              {/* Sección de Administrador */}
              {user?.role === 'admin' && (
                <>
                  <div className="my-2 border-t" style={{ borderColor: "var(--border)" }}></div>
                  <div className="text-xs font-semibold uppercase tracking-wider px-4 py-2" style={{ color: "var(--muted-foreground)" }}>
                    {t.admin.administration}
                  </div>
                  <Link
                    href="/dashboard"
                    className="text-base font-inter font-medium py-3 px-4 rounded-lg transition-colors flex items-center gap-2"
                    style={{ color: "var(--primary)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--muted)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }}
                    onClick={() => setMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    {t.nav.dashboard}
                  </Link>
                  <Link
                    href="/admin"
                    className="text-base font-inter font-medium py-3 px-4 rounded-lg transition-colors flex items-center gap-2"
                    style={{ color: "var(--foreground)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--muted)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Edit className="h-5 w-5" />
                    {t.admin.pageEditor}
                  </Link>
                </>
              )}
            </div>
            
            {/* Botones de tema y tipografía - Solo visibles para administradores */}
            {user?.role === 'admin' && (
              <div className="pt-4 mt-auto border-t p-6" style={{ borderColor: "var(--border)" }}>
                {/* Botón de tema - Oculto para subdominio reposteria */}
                {store?.subdomain !== 'reposteria' && (
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
                    {t.admin.changeTheme}
                  </Button>
                )}
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
                  {t.admin.changeFont}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sidebar del carrito */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent 
          side="right" 
          className="w-[300px] sm:w-[400px] p-0 flex flex-col"
          style={{ backgroundColor: "var(--background)" }}
        >
          <SheetHeader className="p-6 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
            <SheetTitle className="text-xl font-inter font-semibold" style={{ color: "var(--foreground)" }}>
              {t.cart.title}
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Contenido del carrito */}
            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingCart className="h-16 w-16 mb-4" style={{ color: "var(--muted-foreground)", opacity: 0.5 }} />
                  <p className="text-base font-inter font-medium mb-2" style={{ color: "var(--foreground)" }}>
                    {t.cart.empty}
                  </p>
                  <p className="text-sm font-inter" style={{ color: "var(--muted-foreground)" }}>
                    {t.cart.emptyDescription}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-4 rounded-lg border"
                      style={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                      }}
                    >
                      {/* Imagen del producto */}
                      <div
                        className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: "var(--background)" }}
                      >
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Información del producto */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-sm font-inter font-semibold mb-1 truncate"
                          style={{ color: "var(--card-foreground)" }}
                        >
                          {item.name}
                        </h3>
                        {item.category && (
                          <p
                            className="text-xs font-inter mb-2"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {item.category}
                          </p>
                        )}
                        {item.itemKind === "combo" && item.comboDetails && (
                          <ul className="mb-2 space-y-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {item.comboDetails.components.map((component) => (
                              <li key={`${component.productId}-${component.variantId || "base"}`}>
                                {component.quantity}× {component.productName}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          {item.salePrice && item.originalPrice && (
                            <span
                              className="text-xs line-through"
                              style={{ color: "var(--muted-foreground)" }}
                            >
                              {item.originalPrice}
                            </span>
                          )}
                          <span
                            className="text-sm font-inter font-bold"
                            style={{ color: "var(--primary)" }}
                          >
                            {item.salePrice || item.price}
                          </span>
                        </div>

                        {/* Controles de cantidad */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 md:h-7 md:w-7 touch-manipulation"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            style={{
                              backgroundColor: "var(--muted)",
                              color: "var(--foreground)",
                            }}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span
                            className="text-sm font-inter font-medium w-8 text-center"
                            style={{ color: "var(--foreground)" }}
                          >
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 md:h-7 md:w-7 touch-manipulation"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            style={{
                              backgroundColor: "var(--muted)",
                              color: "var(--foreground)",
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 md:h-7 md:w-7 ml-auto touch-manipulation"
                            onClick={() => {
                              removeFromCart(item.id)
                              toast.success(t.header.productRemoved, {
                                description: t.header.productRemovedDescription.replace('{name}', item.name),
                                duration: 3000,
                              })
                            }}
                            style={{
                              backgroundColor: "transparent",
                              color: "var(--destructive)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "var(--muted)"
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent"
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer del carrito */}
            {items.length > 0 && (
              <div className="p-6 border-t flex-shrink-0 bg-background" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
                {/* Resumen de productos */}
                <div className="space-y-2 mb-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span style={{ color: "var(--muted-foreground)" }}>
                        {item.name} x{item.quantity}
                        {item.itemKind === "combo" ? " (combo)" : ""}
                      </span>
                      <span style={{ color: "var(--foreground)", fontWeight: 500 }}>
                        ${getItemSubtotal(item).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Línea separadora */}
                <div className="border-t mb-4" style={{ borderColor: "var(--border)" }}></div>
                
                {/* Total */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-inter font-semibold" style={{ color: "var(--foreground)" }}>
                    {t.cart.total}:
                  </span>
                  <span className="text-2xl font-inter font-bold" style={{ color: "var(--primary)" }}>
                    ${getTotal().toFixed(2)}
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
                  onClick={() => {
                    // Mostrar diálogo de opciones de checkout (invitado o crear cuenta)
                    setShowCheckoutOptionsDialog(true)
                  }}
                >
                  {t.cart.checkout}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal de Inicio de Sesión */}
      <Dialog 
        open={loginModalOpen} 
        onOpenChange={(open) => {
          setLoginModalOpen(open)
          if (!open) {
            setEmail("")
            setPassword("")
            setConfirmPassword("")
            setFirstName("")
            setLastName("")
            setShowPassword(false)
            setShowConfirmPassword(false)
            setIsRegisterMode(false)
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-inter font-semibold" style={{ color: "var(--foreground)" }}>
              {isRegisterMode ? t.auth.createAccount : t.auth.login}
            </DialogTitle>
            <DialogDescription className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {isRegisterMode 
                ? t.auth.createAccount 
                : t.auth.login}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (isRegisterMode) {
                // Validar que las contraseñas coincidan
                if (password !== confirmPassword) {
                  toast.error(t.header.passwordsDoNotMatch, {
                    description: t.header.passwordsDoNotMatchDescription,
                    duration: 3000,
                  })
                  return
                }
                // Validar que todos los campos estén completos
                if (!firstName || !lastName || !email || !password) {
                  toast.error(t.header.incompleteFields, {
                    description: t.header.incompleteFieldsDescription,
                    duration: 3000,
                  })
                  return
                }
                // Validar longitud mínima de contraseña (Supabase requiere al menos 6)
                if (password.length < 6) {
                  toast.error(t.header.passwordMinLength, { duration: 3000 })
                  return
                }
                // Registrar usuario
                const result = await register(email, password, firstName, lastName)
                if (result.success) {
                  await refreshUser()
                  if (result.emailSent) {
                    toast.success(t.header.confirmEmailSent, {
                      description: t.header.confirmEmailDescription,
                      duration: 6000,
                    })
                  } else {
                    toast.success(t.header.accountCreated, {
                      description: result.user?.role === 'admin'
                        ? t.header.welcomeAdminMessage
                        : t.header.accountCreatedSuccess,
                      duration: 3000,
                    })
                  }
                  
                  setLoginModalOpen(false)
                  setEmail("")
                  setPassword("")
                  setConfirmPassword("")
                  setFirstName("")
                  setLastName("")
                  setShowPassword(false)
                  setShowConfirmPassword(false)
                  setIsRegisterMode(false)
                } else {
                  toast.error(t.header.errorCreatingAccount, {
                    description: result.error || "Por favor, intenta nuevamente",
                    duration: 3000,
                  })
                }
              } else {
                // Validar que los campos estén completos
                if (!email || !password) {
                  toast.error("Campos incompletos", {
                    description: "Por favor, ingresa tu correo y contraseña",
                    duration: 3000,
                  })
                  return
                }
                // Iniciar sesión
                const result = await login(email, password)
                if (result.success) {
                  // Refrescar el usuario para obtener el rol actualizado
                  await refreshUser()
                  
                  // Todos los usuarios (admin y user) van a la página principal
                  toast.success(t.header.sessionStarted, {
                    description: result.user?.role === 'admin' 
                      ? t.header.welcomeAdminLogin 
                      : "Bienvenido de nuevo!",
                    duration: 3000,
                  })
                  
                  setLoginModalOpen(false)
                  setEmail("")
                  setPassword("")
                  setConfirmPassword("")
                  setFirstName("")
                  setLastName("")
                  setShowPassword(false)
                  setShowConfirmPassword(false)
                  setIsRegisterMode(false)
                } else {
                  toast.error(t.header.errorLoggingIn, {
                    description: result.error || "Verifica tus credenciales e intenta nuevamente",
                    duration: 5000,
                  })
                }
              }
            }}
            className="space-y-4 mt-4"
          >
            {isRegisterMode && (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="firstName"
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {t.auth.firstName}
                  </label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Juan"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full placeholder:opacity-50"
                    style={{
                      backgroundColor: "var(--background)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="lastName"
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {t.auth.lastName}
                  </label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Pérez"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full placeholder:opacity-50"
                    style={{
                      backgroundColor: "var(--background)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {t.auth.email}
              </label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full placeholder:opacity-50"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {t.auth.password}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-10 placeholder:opacity-50"
                  style={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? t.header.hidePassword : t.header.showPassword}
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {isRegisterMode && (
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {t.auth.confirmPassword}
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pr-10 placeholder:opacity-50"
                    style={{
                      backgroundColor: "var(--background)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? t.header.hidePassword : t.header.showPassword}
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <Button
                type="submit"
                className="w-full"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                {isRegisterMode ? t.auth.createAccount : t.auth.signIn}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setLoginModalOpen(false)}
                style={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                Cancelar
              </Button>
            </div>

            <div className="text-center text-sm pt-2 space-y-2">
              {!isRegisterMode && (
                <div>
                  <button
                    type="button"
                    className="font-medium hover:underline text-sm"
                    style={{ color: "var(--primary)" }}
                    onClick={() => {
                      setLoginModalOpen(false)
                      setForgotPasswordModalOpen(true)
                    }}
                  >
                    {t.auth.forgotPassword}
                  </button>
                </div>
              )}
              {isRegisterMode ? (
                <>
                  <span style={{ color: "var(--muted-foreground)" }}>
                    {t.auth.alreadyHaveAccount}{" "}
                  </span>
                  <button
                    type="button"
                    className="font-medium hover:underline"
                    style={{ color: "var(--primary)" }}
                    onClick={() => {
                      setIsRegisterMode(false)
                      setEmail("")
                      setPassword("")
                      setConfirmPassword("")
                      setFirstName("")
                      setLastName("")
                      setShowPassword(false)
                      setShowConfirmPassword(false)
                    }}
                  >
                    Inicia sesión
                  </button>
                </>
              ) : (
                <>
                  <span style={{ color: "var(--muted-foreground)" }}>
                    {t.auth.dontHaveAccount}{" "}
                  </span>
                  <button
                    type="button"
                    className="font-medium hover:underline"
                    style={{ color: "var(--primary)" }}
                    onClick={() => {
                      setIsRegisterMode(true)
                      setEmail("")
                      setPassword("")
                      setConfirmPassword("")
                      setFirstName("")
                      setLastName("")
                      setShowPassword(false)
                      setShowConfirmPassword(false)
                    }}
                  >
                    Regístrate
                  </button>
                </>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de advertencia: Iniciar sesión requerido */}
      <AlertDialog open={loginRequiredDialogOpen} onOpenChange={setLoginRequiredDialogOpen}>
        <AlertDialogContent 
          className="w-[95vw] max-w-[600px] p-8"
          style={{ backgroundColor: "var(--background)" }}
        >
          <AlertDialogHeader className="space-y-4">
            <AlertDialogTitle 
              className="text-3xl md:text-4xl font-inter font-bold text-center"
              style={{ color: "var(--foreground)" }}
            >
              {t.header.loginRequired}
            </AlertDialogTitle>
            <AlertDialogDescription 
              className="text-lg md:text-xl text-center mt-4 leading-relaxed"
              style={{ color: "var(--muted-foreground)" }}
            >
              {t.header.loginRequiredDescription}
              <br />
              <br />
              {t.header.loginRequiredDescription2}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-8">
            <AlertDialogAction
              onClick={() => {
                setLoginRequiredDialogOpen(false)
                setCartOpen(false)
                setIsRegisterMode(false)
                setLoginModalOpen(true)
              }}
              className="w-full sm:w-auto text-base px-6 py-3 font-semibold"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {t.auth.login}
            </AlertDialogAction>
            <Button
              onClick={() => {
                setLoginRequiredDialogOpen(false)
                setCartOpen(false)
                setIsRegisterMode(true)
                setLoginModalOpen(true)
              }}
              className="w-full sm:w-auto text-base px-6 py-3 font-semibold"
              style={{
                backgroundColor: "var(--secondary)",
                color: "var(--secondary-foreground)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.9"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1"
              }}
            >
              Regístrate
            </Button>
            <AlertDialogCancel
              onClick={() => setLoginRequiredDialogOpen(false)}
              className="w-full sm:w-auto text-base px-6 py-3"
              style={{
                borderColor: "var(--border)",
                color: "var(--foreground)",
                backgroundColor: "transparent",
              }}
            >
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Medios de Pago */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-inter font-bold" style={{ color: "var(--foreground)" }}>
              Seleccionar Medio de Pago
            </DialogTitle>
            <DialogDescription className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Elige cómo deseas pagar tu compra
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {/* Tarjeta de Crédito */}
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod("credit_card")}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                selectedPaymentMethod === "credit_card"
                  ? "border-primary"
                  : "border-border"
              }`}
              style={{
                backgroundColor: selectedPaymentMethod === "credit_card" ? "var(--muted)" : "var(--background)",
                borderColor: selectedPaymentMethod === "credit_card" ? "var(--primary)" : "var(--border)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 rounded-lg flex items-center justify-center gap-0.5 px-1.5" style={{ backgroundColor: "var(--primary)", opacity: 0.1 }}>
                  <div className="flex items-center justify-center" style={{ width: "20px", height: "12px" }}>
                    <VisaIcon className="w-full h-full" style={{ width: "20px", height: "12px" }} />
                  </div>
                  <div className="flex items-center justify-center" style={{ width: "20px", height: "12px" }}>
                    <MasterCardIcon className="w-full h-full" style={{ width: "20px", height: "12px" }} />
                  </div>
                  <div className="flex items-center justify-center" style={{ width: "20px", height: "12px" }}>
                    <AmexIcon className="w-full h-full" style={{ width: "20px", height: "12px" }} />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold" style={{ color: "var(--foreground)" }}>Tarjeta de Crédito</p>
                  <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Visa, Mastercard, American Express</p>
                </div>
                {selectedPaymentMethod === "credit_card" && (
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: "var(--primary)" }}>
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>

            {/* Tarjeta de Débito */}
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod("debit_card")}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                selectedPaymentMethod === "debit_card"
                  ? "border-primary"
                  : "border-border"
              }`}
              style={{
                backgroundColor: selectedPaymentMethod === "debit_card" ? "var(--muted)" : "var(--background)",
                borderColor: selectedPaymentMethod === "debit_card" ? "var(--primary)" : "var(--border)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--primary)", opacity: 0.1 }}>
                  <CreditCard className="w-6 h-6" style={{ color: "var(--primary)" }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold" style={{ color: "var(--foreground)" }}>Tarjeta de Débito</p>
                  <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Pago directo desde tu cuenta</p>
                </div>
                {selectedPaymentMethod === "debit_card" && (
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: "var(--primary)" }}>
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>

            {/* PayPal */}
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod("paypal")}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                selectedPaymentMethod === "paypal"
                  ? "border-primary"
                  : "border-border"
              }`}
              style={{
                backgroundColor: selectedPaymentMethod === "paypal" ? "var(--muted)" : "var(--background)",
                borderColor: selectedPaymentMethod === "paypal" ? "var(--primary)" : "var(--border)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#0070ba", opacity: 0.15 }}>
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.076 18.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.174 1.305 1.05 2.785.927 3.723l-.122.95c-.061.46-.41.85-.87.85h-2.05c-.276 0-.508.19-.55.46l-.127.99c-.042.33-.31.58-.64.58h-1.48c-.276 0-.508.19-.55.46l-.127.99c-.042.33-.31.58-.64.58h-2.05c-.276 0-.508.19-.55.46l-.127.99c-.042.33-.31.58-.64.58H8.14c-.276 0-.508.19-.55.46l-.127.99c-.042.33-.31.58-.64.58H5.998c-.276 0-.508.19-.55.46l-.127.99c-.042.33-.31.58-.64.58z" fill="#0070ba"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold" style={{ color: "var(--foreground)" }}>PayPal</p>
                  <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Paga con tu cuenta PayPal</p>
                </div>
                {selectedPaymentMethod === "paypal" && (
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: "var(--primary)" }}>
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>

            {/* Transferencia Bancaria */}
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod("bank_transfer")}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                selectedPaymentMethod === "bank_transfer"
                  ? "border-primary"
                  : "border-border"
              }`}
              style={{
                backgroundColor: selectedPaymentMethod === "bank_transfer" ? "var(--muted)" : "var(--background)",
                borderColor: selectedPaymentMethod === "bank_transfer" ? "var(--primary)" : "var(--border)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--primary)", opacity: 0.1 }}>
                  <Building2 className="w-6 h-6" style={{ color: "var(--primary)" }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold" style={{ color: "var(--foreground)" }}>Transferencia Bancaria</p>
                  <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Pago directo desde tu banco</p>
                </div>
                {selectedPaymentMethod === "bank_transfer" && (
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: "var(--primary)" }}>
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>

            {/* Efectivo al Recoger */}
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod("cash_on_delivery")}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                selectedPaymentMethod === "cash_on_delivery"
                  ? "border-primary"
                  : "border-border"
              }`}
              style={{
                backgroundColor: selectedPaymentMethod === "cash_on_delivery" ? "var(--muted)" : "var(--background)",
                borderColor: selectedPaymentMethod === "cash_on_delivery" ? "var(--primary)" : "var(--border)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--primary)", opacity: 0.1 }}>
                  <Wallet className="w-6 h-6" style={{ color: "var(--primary)" }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold" style={{ color: "var(--foreground)" }}>Efectivo al Recoger</p>
                  <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Paga cuando recibas tu pedido</p>
                </div>
                {selectedPaymentMethod === "cash_on_delivery" && (
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: "var(--primary)" }}>
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Resumen de compra */}
          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: "var(--muted)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>{t.cart.subtotal}:</span>
              <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                ${getTotal().toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>{t.cart.shipping}:</span>
              <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                $0.00
              </span>
            </div>
            <div className="border-t pt-2 mt-2" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Total:</span>
                <span className="text-xl font-bold" style={{ color: "var(--primary)" }}>
                  ${getTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col gap-2 mt-6">
            <Button
              onClick={() => {
                if (!selectedPaymentMethod) {
                  toast.error(t.cart.selectPaymentMethod, {
                    description: t.cart.selectPaymentMethodDescription,
                    duration: 3000,
                  })
                  return
                }
                // Aquí iría la lógica para procesar el pago
                toast.success(t.cart.purchaseProcessed, {
                  description: t.cart.purchaseProcessedDescription.replace('{method}', getPaymentMethodName(selectedPaymentMethod)),
                  duration: 3000,
                })
                setPaymentModalOpen(false)
                setCartOpen(false)
                setSelectedPaymentMethod(null)
              }}
              className="w-full"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
              disabled={!selectedPaymentMethod}
            >
              {t.header.confirmPayment}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPaymentModalOpen(false)
                setSelectedPaymentMethod(null)
              }}
              className="w-full"
              style={{
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Recuperación de Contraseña */}
      <Dialog 
        open={forgotPasswordModalOpen} 
        onOpenChange={(open) => {
          setForgotPasswordModalOpen(open)
          if (!open) {
            setResetEmail("")
            setResetEmailSent(false)
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-inter font-semibold" style={{ color: "var(--foreground)" }}>
              {resetEmailSent ? t.header.emailSent : t.header.forgotPasswordTitle}
            </DialogTitle>
            <DialogDescription className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {resetEmailSent 
                ? t.header.forgotPasswordDescription2
                : t.header.forgotPasswordDescription}
            </DialogDescription>
          </DialogHeader>

          {!resetEmailSent ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!resetEmail) {
                    toast.error(t.common.error, {
                      description: t.header.enterEmail,
                    duration: 3000,
                  })
                  return
                }

                const result = await resetPassword(resetEmail)
                if (result.success) {
                  setResetEmailSent(true)
                  toast.success("Email enviado", {
                    description: t.header.checkEmail,
                    duration: 5000,
                  })
                } else {
                  toast.error("Error al enviar email", {
                    description: result.error || "Por favor, intenta nuevamente",
                    duration: 5000,
                  })
                }
              }}
              className="space-y-4 mt-4"
            >
              <div className="space-y-2">
                <label
                  htmlFor="resetEmail"
                  className="text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {t.auth.email}
                </label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="tu@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="w-full placeholder:opacity-50"
                  style={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  Enviar link de recuperación
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setForgotPasswordModalOpen(false)
                    setResetEmail("")
                  }}
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: "var(--muted)" }}>
                <p className="text-sm" style={{ color: "var(--foreground)" }}>
                  Hemos enviado un link de recuperación a:
                </p>
                <p className="text-sm font-semibold mt-2" style={{ color: "var(--primary)" }}>
                  {resetEmail}
                </p>
                <p className="text-xs mt-4" style={{ color: "var(--muted-foreground)" }}>
                  Si no recibes el email, verifica tu carpeta de spam o intenta nuevamente.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setForgotPasswordModalOpen(false)
                    setResetEmail("")
                    setResetEmailSent(false)
                    setLoginModalOpen(true)
                  }}
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  {t.header.backToLogin}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setResetEmail("")
                    setResetEmailSent(false)
                  }}
                  style={{
                    color: "var(--primary)",
                  }}
                >
                  {t.header.sendToAnotherEmail}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de opciones de checkout */}
      <CheckoutOptionsDialog
        open={showCheckoutOptionsDialog}
        onOpenChange={setShowCheckoutOptionsDialog}
        onCloseCart={() => setCartOpen(false)}
      />
    </header>
  )
}

// Función helper para obtener el nombre del método de pago
function getPaymentMethodName(method: string): string {
  const methods: Record<string, string> = {
    credit_card: "Tarjeta de Crédito",
    debit_card: "Tarjeta de Débito",
    paypal: "PayPal",
    bank_transfer: "Transferencia Bancaria",
    cash_on_delivery: "Efectivo al Recoger",
  }
  return methods[method] || method
}
