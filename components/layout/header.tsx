/* eslint-disable @next/next/no-img-element -- Existing dynamic storefront images intentionally use native img in these legacy components; converting all to next/image is outside the global-gates cleanup risk budget. */
"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Search, Heart, ShoppingCart, Palette, AlignLeft, Menu, LogIn, LogOut, User, Eye, EyeOff, LayoutDashboard, Edit, Package, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import { resolveFeaturedProductId } from "@/lib/products/featured-product"
import { HeaderMegaMenu } from "@/components/layout/header-mega-menu"
import { HeaderSearchSuggestions } from "@/components/layout/header-search-suggestions"
import { resolveHeaderLayoutVariant } from "@/lib/header/header-layout-variant"
import { resolveHeaderStickyMode } from "@/lib/header/header-sticky-mode"
import { useHeaderScrollHidden } from "@/lib/hooks/use-header-scroll-hidden"
import { cn } from "@/lib/utils"
import { useTheme } from "@/contexts/theme-context"
import { useMode } from "@/contexts/mode-context"
import { useStore } from "@/contexts/store-context"
import { ThemeSelectorModal } from "@/components/theme/theme-selector-modal"
import { ModeToggle } from "@/components/mode-toggle"
import { FontSelectorModal } from "@/components/font/font-selector-modal"
import Image from "next/image"
import { useCart } from "@/contexts/cart-context"
import { useWishlist } from "@/contexts/wishlist-context"
import { useAuth } from "@/contexts/auth-context"
import { Trash2, Plus, Minus } from "lucide-react"
import { toast } from "sonner"
import { resetPassword } from "@/lib/supabase/auth-api"
import { deferStateUpdate } from "@/lib/react/defer-state-update"
import { ADMIN_ACCESS_DENIED_PATH, FORCE_PASSWORD_CHANGE_PATH, getAuthReturnPath, resolvePostAuthDestination } from "@/lib/auth-return-intent"
import { currentUserMustChangePassword, isCurrentUserAdminOrUnverified } from "@/lib/supabase/permissions-api"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCheckoutLoginIntent } from "@/contexts/checkout-login-intent-context"
import { useLanguage } from "@/contexts/language-context"
import { buildLocalCartSummary } from "@/lib/cart/cart-summary"

/**
 * Single source of truth for the header's editable defaults. Imported by
 * `lib/section-editor/component-fields.ts` for `COMPONENT_FIELDS.header.defaults`
 * so the live header and the admin editor never drift apart.
 */
export const HEADER_DEFAULTS = {
  brandName: "Osoria",
  logoImage: "/logo-negro.svg",
  logoImageDark: "/logo-osoria-blanco.svg",
  searchPlaceholder: "Buscar...",
  tagline: "¡Gran venta! Apurate, la oferta termina pronto",
  layoutVariant: "classic",
  stickyMode: "",
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
  linkColor: "var(--foreground)",
  megaMenuDescription:
    "Encontrá los mejores productos de tecnología, seleccionados por su calidad y el mejor precio.",
  viewAllText: "Ver todos los productos",
  megaMenuBgColor: "var(--background)",
  megaMenuTextColor: "var(--foreground)",
  megaMenuFeaturedBgColor: "var(--muted)",
  featuredByCategory: {} as Record<string, string>,
}

const PROMO_BAR_DISMISSED_STORAGE_KEY = "osoria_header_promo_dismissed"

export function Header() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [themeModalOpen, setThemeModalOpen] = useState(false)
  const [fontModalOpen, setFontModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
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
  const [pendingLoginReturnPath, setPendingLoginReturnPath] = useState<string | null>(null)
  const openedLoginReturnIntentRef = useRef<string | null>(null)
  const handledLoginRequestCountRef = useRef(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ id: string; title: string; slug: string; image?: string }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [categories, setCategories] = useState<
    Array<{ id: string; category_name: string; slug: string; display_order: number }>
  >([])
  const [openMegaMenuCategoryId, setOpenMegaMenuCategoryId] = useState<string | null>(null)
  const [categoryFeaturedProductId, setCategoryFeaturedProductId] = useState<Record<string, string | null>>({})
  const { activeTheme } = useTheme()
  const { isDark } = useMode()
  const { items, removeFromCart, updateQuantity, getTotal, getItemSubtotal, getTotalItems } = useCart()
  const { getTotalItems: getWishlistTotalItems } = useWishlist()
  const { user, isAuthenticated, login, register, logout, refreshUser } = useAuth()
  const { isAdmin } = useAdminPermissions()
  const { store } = useStore()
  const { t, language } = useLanguage()
  const { loginRequestCount } = useCheckoutLoginIntent()
  const localCartSummary = buildLocalCartSummary({
    items,
    getItemSubtotal,
    total: getTotal(),
    language,
  })

  const { styles: styleData } = useComponentStyle("header", HEADER_DEFAULTS)
  const { componentEdits } = useAdmin()
  const edits = componentEdits.get("header") || {}
  const header = { ...HEADER_DEFAULTS, ...styleData, ...edits }
  const layoutVariant = resolveHeaderLayoutVariant(header.layoutVariant)
  const stickyMode = resolveHeaderStickyMode(header.stickyMode, layoutVariant)
  const isHeaderScrollHidden = useHeaderScrollHidden(stickyMode === "smart")
  const [promoDismissed, setPromoDismissed] = useState(true)

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

  // Usar logo desde configuración o valores por defecto. `isDarkTheme` (tema de color oscuro,
  // p.ej. "Oscuro") ya elegía el logo oscuro; también lo hacemos cuando el modo claro/oscuro
  // del sitio (`useMode().isDark`) está activo y hay un logo oscuro configurado.
  const logoSrc = isDarkTheme
    ? (header.logoImageDark || "/logo-osoria-blanco.svg")
    : isDark && header.logoImageDark
      ? header.logoImageDark
      : (header.logoImage || "/logo-negro.svg")
  // Sin logo oscuro dedicado: invertir el logo por defecto en modo oscuro para que el
  // wordmark (típicamente negro/monocromático) siga siendo visible sobre fondo oscuro.
  // Sólo se activa vía la variante `dark:` (clase `.dark` en <html>), así que no afecta
  // al modo claro ni duplica la inversión cuando ya se usa un logo oscuro dedicado.
  const logoDarkModeInvertClassName =
    !isDarkTheme && !header.logoImageDark ? "dark:invert dark:brightness-0" : undefined
  const pathname = usePathname()

  useEffect(() => {
    if (searchParams.get("auth") !== "login") {
      return
    }

    const safeReturnPath = getAuthReturnPath(searchParams)
    if (!safeReturnPath) {
      return
    }

    if (openedLoginReturnIntentRef.current === safeReturnPath) {
      return
    }

    openedLoginReturnIntentRef.current = safeReturnPath
    setPendingLoginReturnPath(safeReturnPath)
    setIsRegisterMode(false)
    setLoginModalOpen(true)
  }, [searchParams])

  // El banner de invitado en /checkout pide este modal a través del contexto
  // (D2): cada incremento de loginRequestCount es una nueva solicitud.
  useEffect(() => {
    if (handledLoginRequestCountRef.current === loginRequestCount) {
      return
    }

    handledLoginRequestCountRef.current = loginRequestCount
    setIsRegisterMode(false)
    setLoginModalOpen(true)
  }, [loginRequestCount])

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
        const { searchItems } = await import('@/lib/supabase/products-read')
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
          // Ordenar por display_order
          const sorted = data.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
          setCategories(sorted)
        }
      } catch (error) {
        console.error('Error loading categories:', error)
      }
    }

    loadCategories()
  }, [store?.id]) // Recargar cuando cambie la tienda

  // Resolver el producto destacado de cada categoría para el mega-menu (una consulta liviana por categoría).
  // Sólo la variante classic renderiza el mega-menu, así que el resto de variantes no pagan este costo.
  useEffect(() => {
    if (layoutVariant !== "classic" || categories.length === 0) return

    let active = true

    Promise.all(
      categories.map(async (category) => {
        const productId = await resolveFeaturedProductId(category.id, header.featuredByCategory?.[category.id])
        return [category.id, productId] as const
      })
    )
      .then((entries) => {
        if (active) setCategoryFeaturedProductId(Object.fromEntries(entries))
      })
      .catch((error) => {
        console.error('Error resolving header mega-menu featured products:', error)
      })

    return () => {
      active = false
    }
  }, [layoutVariant, categories, header.featuredByCategory])

  // Leer el estado de descarte de la barra de promoción guardado en el navegador
  useEffect(() => {
    const dismissed = window.localStorage.getItem(PROMO_BAR_DISMISSED_STORAGE_KEY) === "true"
    deferStateUpdate(() => setPromoDismissed(dismissed))
  }, [])

  // Removido console.log para evitar spam en consola y rate limiting

  // Handler para cerrar la barra de promoción (persiste la elección)
  const handleDismissPromoBar = () => {
    window.localStorage.setItem(PROMO_BAR_DISMISSED_STORAGE_KEY, "true")
    setPromoDismissed(true)
  }

  const showPromoBar = !promoDismissed && Boolean(header.tagline?.trim())

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

  // Handlers del mega-menu de categorías (solo desktop)
  const openMegaMenu = (categoryId: string) => setOpenMegaMenuCategoryId(categoryId)
  const closeMegaMenu = () => setOpenMegaMenuCategoryId(null)
  const handleMegaMenuAreaBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      closeMegaMenu()
    }
  }
  const handleMegaMenuAreaKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      closeMegaMenu()
    }
  }

  // Promo pill compacta usada en las variantes classic y centered (fila de utilidad)
  const renderPromoPill = () => {
    if (!showPromoBar) return null
    return (
      <div
        className="flex items-center gap-2 flex-shrink-0 rounded-full px-4 py-2 text-xs lg:text-sm font-medium max-w-[160px] lg:max-w-xs"
        style={{
          backgroundColor: header.bannerBgColor || "var(--secondary)",
          color: header.bannerTextColor || "var(--primary)",
        }}
      >
        <span className="truncate">{header.tagline}</span>
        <button
          type="button"
          onClick={handleDismissPromoBar}
          aria-label="Cerrar promoción"
          className="flex-shrink-0 rounded-full p-0.5 hover:opacity-70 transition-opacity"
          style={{ color: header.bannerTextColor || "var(--primary)" }}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  // Formulario de búsqueda de escritorio (input + sugerencias), compartido por las 3 variantes
  const renderDesktopSearchForm = (formClassName: string) => (
    <form className={formClassName} onSubmit={handleSearch}>
      <div className="relative">
        <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 lg:h-4 lg:w-4 z-10 pointer-events-none" style={{ color: header.searchIconColor || "var(--muted-foreground)" }} />
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
            backgroundColor: header.searchBgColor || "var(--muted)",
            borderColor: header.searchBorderColor || "var(--border)",
            color: header.searchTextColor || "var(--foreground)",
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
          <Search className="h-3.5 w-3.5 lg:h-4 lg:w-4" style={{ color: header.searchIconColor || "var(--muted-foreground)" }} />
        </Button>

        {/* Dropdown de sugerencias */}
        {showSuggestions && searchQuery.trim().length >= 2 && (
          <HeaderSearchSuggestions
            isSearching={isSearching}
            suggestions={searchSuggestions}
            searchQuery={searchQuery}
            onSelectSuggestion={handleSelectSuggestion}
            onViewAllResults={handleSearch}
            t={t}
          />
        )}
      </div>
    </form>
  )

  // Botón de icono con badge de conteo (wishlist/carrito): misma forma en escritorio y móvil,
  // sólo cambian tamaños de clase y el conteo/acción según el llamador.
  const renderBadgeIconButton = ({
    icon,
    count,
    onClick,
    title,
    buttonClassName,
    badgeClassName,
  }: {
    icon: React.ReactNode
    count: number
    onClick: () => void
    title: string
    buttonClassName: string
    badgeClassName: string
  }) => (
    <Button
      variant="ghost"
      size="icon"
      className={buttonClassName}
      style={{ backgroundColor: "transparent" }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = header.iconHoverBg || "var(--muted)"}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
      onClick={onClick}
      title={title}
    >
      {icon}
      {count > 0 && (
        <span className={badgeClassName} style={{ backgroundColor: "var(--primary)" }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  )

  // Iconos de acción (cuenta, wishlist, carrito), compartidos por las 3 variantes
  const renderActionIcons = () => (
    <>
      <ModeToggle />
      {isAuthenticated ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 lg:h-10 px-2.5 lg:px-4 rounded-full gap-1.5 lg:gap-2"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = header.loginButtonHoverBg || "var(--muted)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              <User className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: header.loginButtonColor || "var(--foreground)" }} />
              <span className="text-xs lg:text-sm xl:text-base font-medium hidden xl:inline truncate max-w-[150px]" style={{ color: header.loginButtonColor || "var(--foreground)" }}>
                {isAdmin
                  ? t.nav.admin
                  : user?.first_name && user?.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user?.email?.split('@')[0] || t.nav.account}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}>
            <DropdownMenuLabel style={{ color: "var(--foreground)" }}>
              {isAdmin
                ? "Administrador"
                : user?.first_name && user?.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user?.email || "Usuario"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator style={{ backgroundColor: "var(--border)" }} />
            <DropdownMenuItem asChild style={{ color: "var(--foreground)" }}>
              <Link href="/orders">
                <Package className="mr-2 h-4 w-4" />
                {t.nav.orders}
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator style={{ backgroundColor: "var(--border)" }} />
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
                const wasOnAdminPage = pathname === '/admin' || pathname === '/dashboard'

                await logout()

                if (isAdmin && wasOnAdminPage) {
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
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = header.loginButtonHoverBg || "var(--muted)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          onClick={() => setLoginModalOpen(true)}
          title={t.auth.login}
        >
          <LogIn className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: header.loginButtonColor || "var(--foreground)" }} />
          <span className="text-xs lg:text-sm xl:text-base font-medium hidden xl:inline" style={{ color: header.loginButtonColor || "var(--foreground)" }}>{t.auth.login}</span>
        </Button>
      )}
      {renderBadgeIconButton({
        icon: <Heart className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: header.iconColor || "var(--foreground)" }} />,
        count: getWishlistTotalItems(),
        onClick: () => router.push('/wishlist'),
        title: t.nav.wishlist,
        buttonClassName: "h-9 w-9 lg:h-10 lg:w-10 rounded-full touch-manipulation relative flex-shrink-0",
        badgeClassName: "absolute -top-1 -right-1 h-4 w-4 lg:h-5 lg:w-5 rounded-full flex items-center justify-center text-[10px] lg:text-xs font-bold text-white",
      })}
      {renderBadgeIconButton({
        icon: <ShoppingCart className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: header.iconColor || "var(--foreground)" }} />,
        count: getTotalItems(),
        onClick: () => setCartOpen(true),
        title: t.nav.cart,
        buttonClassName: "h-9 w-9 lg:h-10 lg:w-10 rounded-full touch-manipulation relative flex-shrink-0",
        badgeClassName: "absolute -top-1 -right-1 h-4 w-4 lg:h-5 lg:w-5 rounded-full flex items-center justify-center text-[10px] lg:text-xs font-bold text-white",
      })}
      {isAdmin && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 lg:h-10 lg:w-10 rounded-full touch-manipulation flex-shrink-0"
          style={{ backgroundColor: "transparent" }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = header.menuButtonHoverBg || "var(--muted)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          onClick={() => setMenuOpen(true)}
          title={t.header.menu}
          aria-label={t.header.menu}
        >
          <Menu className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: header.menuButtonColor || "var(--foreground)" }} />
        </Button>
      )}
    </>
  )

  // Logo de escritorio: banda de altura fija compartida por las 3 variantes para que
  // logos horizontales, verticales o cuadrados quepan sin alterar la altura del header.
  // La altura de la banda y la imagen siempre coinciden para que cada variante pueda
  // elegir su propio tamaño (classic es más grande que compact/centered) sin max-h-full.
  const renderDesktopLogo = (heightClass: string, maxWidthClass: string = "max-w-[160px]") => (
    <Link href="/" className={cn("flex flex-shrink-0 items-center", heightClass)}>
      <Image
        src={logoSrc}
        alt="Osoria Logo"
        width={160}
        height={48}
        className={cn("object-contain w-auto", heightClass, maxWidthClass, logoDarkModeInvertClassName)}
        priority
      />
    </Link>
  )

  // Enlaces de categorías, compartidos por las 3 variantes. El mega-menu (hover/foco) sólo
  // se activa cuando `withMegaMenu` es true (variante classic); compact y centered son enlaces planos.
  // `linkTextClass` permite que classic/centered usen un texto más grande sin agrandar compact,
  // que necesita mantenerse denso al ser una sola fila.
  const renderCategoryLinks = (navClassName: string, withMegaMenu: boolean, linkTextClass: string = "text-sm") => (
    <nav className={navClassName}>
      {categories.map((category) => {
        return (
          <Link
            key={category.id}
            href={`/shop/${category.slug}`}
            className={cn(linkTextClass, "font-inter font-medium tracking-wide transition-opacity hover:opacity-70")}
            style={{ color: header.linkColor || "var(--foreground)" }}
            {...(withMegaMenu
              ? {
                  onMouseEnter: () => openMegaMenu(category.id),
                  onFocus: () => openMegaMenu(category.id),
                }
              : {})}
          >
            {category.category_name}
          </Link>
        )
      })}
    </nav>
  )

  // Área de categorías con mega-menu: envuelve el contenido de la fila en el manejo de hover/foco/Escape
  // y superpone el panel del mega-menu de la categoría abierta. Sólo usada por la variante classic.
  // Todas las categorías se montan de una vez (ocultas salvo la abierta) para precargar el producto
  // destacado de cada una y que el flyout aparezca instantáneo al pasar el mouse.
  const renderCategoryNavArea = (
    rowContent: React.ReactNode,
    wrapperClassName: string,
  ) => (
    <div
      className={wrapperClassName}
      onMouseLeave={closeMegaMenu}
      onBlur={handleMegaMenuAreaBlur}
      onKeyDown={handleMegaMenuAreaKeyDown}
      data-testid="header-nav-row"
    >
      {rowContent}

      {categories.map((category) => (
        <div
          key={category.id}
          className={cn(
            "absolute left-1/2 top-full z-40 w-screen -translate-x-1/2 pt-2",
            category.id === openMegaMenuCategoryId ? "block" : "hidden",
          )}
        >
          <div className="container mx-auto px-4">
            <HeaderMegaMenu
              categoryName={category.category_name}
              categoryHref={`/shop/${category.slug}`}
              description={header.megaMenuDescription}
              viewAllText={header.viewAllText}
              featuredProductId={categoryFeaturedProductId[category.id] ?? null}
              bgColor={header.megaMenuBgColor}
              textColor={header.megaMenuTextColor}
              featuredBgColor={header.megaMenuFeaturedBgColor}
            />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <header
      className={cn(
        "w-full z-50 border-b",
        stickyMode !== "none" && "sticky top-0",
        stickyMode === "smart" && "transition-transform duration-300 will-change-transform",
        stickyMode === "smart" && (isHeaderScrollHidden ? "-translate-y-full" : "translate-y-0"),
      )}
      style={{
        backgroundColor: header.bgColor || "var(--background)", 
        borderColor: "var(--border)",
        // Asegurar que el header use el color de fondo del tema
      }}
    >
      {showPromoBar && (
        <div
          className={cn(
            "relative flex items-center justify-center px-4 py-2 text-center text-xs sm:text-sm font-medium",
            layoutVariant === "compact" ? "flex" : "md:hidden",
          )}
          style={{
            backgroundColor: header.bannerBgColor || "var(--secondary)",
            color: header.bannerTextColor || "var(--primary)",
          }}
        >
          <span className="pr-6">{header.tagline}</span>
          <button
            type="button"
            onClick={handleDismissPromoBar}
            aria-label="Cerrar promoción"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:opacity-70 transition-opacity"
            style={{ color: header.bannerTextColor || "var(--primary)" }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div
        className={cn(
          "container mx-auto px-4 py-3",
          // classic es más compacto en escritorio: dos filas + un solo divisor no necesitan
          // el mismo aire vertical que las variantes de una sola fila.
          layoutVariant === "classic" ? "md:py-3" : "md:py-6",
        )}
      >
        {/* Desktop y Tablet: variante "classic" (referencia, 2 filas: utilidad + navegación) */}
        {layoutVariant === "classic" && (
          <div className="hidden md:flex flex-col gap-2" data-testid="header-desktop-classic">
            {/* Fila de utilidad: 3 zonas iguales (promo / búsqueda / iconos) para que la
                búsqueda quede centrada sin importar si la promo está presente o cerrada. */}
            <div className="relative grid grid-cols-3 items-center gap-3 lg:gap-6" data-testid="header-row">
              <div className="flex justify-start">{renderPromoPill()}</div>
              {renderDesktopSearchForm("mx-auto w-full max-w-md lg:max-w-xl relative search-container")}
              <div className="flex items-center justify-end gap-1.5 lg:gap-2 z-10">
                {renderActionIcons()}
              </div>
            </div>

            {renderCategoryNavArea(
              <div className="flex items-center justify-between gap-3 lg:gap-6" data-testid="header-row">
                {renderDesktopLogo("h-11 lg:h-14", "max-w-[180px]")}
                {renderCategoryLinks("flex items-center gap-6 lg:gap-8", true, "text-base lg:text-[17px]")}
              </div>,
              "relative",
            )}
          </div>
        )}

        {/* Desktop y Tablet: variante "compact" (una sola fila densa, enlaces planos sin mega-menu) */}
        {layoutVariant === "compact" && (
          <div className="hidden md:flex flex-col gap-2 mb-4" data-testid="header-desktop-compact">
            <div className="flex items-center gap-3 lg:gap-6" data-testid="header-row">
              {renderDesktopLogo("h-10 lg:h-12")}
              {renderCategoryLinks("flex items-center gap-4 lg:gap-8 flex-shrink-0", false)}
              {renderDesktopSearchForm("flex-1 max-w-sm lg:max-w-md mx-2 lg:mx-4 relative search-container")}
              <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
                {renderActionIcons()}
              </div>
            </div>
          </div>
        )}

        {/* Desktop y Tablet: variante "centered" (logo y navegación centrados, enlaces planos sin mega-menu) */}
        {layoutVariant === "centered" && (
          <div className="hidden md:flex flex-col gap-3 mb-4" data-testid="header-desktop-centered">
            <div className="grid grid-cols-3 items-center gap-3 lg:gap-6" data-testid="header-row">
              <div className="flex items-center gap-3 justify-start">
                {renderPromoPill()}
                {renderDesktopSearchForm("flex-1 max-w-xs relative search-container")}
              </div>
              <div className="flex justify-center">
                {renderDesktopLogo("h-10 lg:h-12")}
              </div>
              <div className="flex items-center justify-end gap-1.5 lg:gap-2">
                {renderActionIcons()}
              </div>
            </div>

            <div className="flex justify-center">
              <div className="flex justify-center" data-testid="header-row">
                {renderCategoryLinks("flex items-center justify-center gap-6 lg:gap-8", false, "text-base lg:text-[17px]")}
              </div>
            </div>
          </div>
        )}

        {/* Móvil: Layout optimizado */}
        <div className="md:hidden flex flex-col gap-3 mb-4">
          {/* Primera fila: Logo, iconos de acción */}
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="flex h-7 sm:h-8 items-center flex-shrink-0">
              <Image
                src={logoSrc}
                alt="Osoria Logo"
                width={100}
                height={33}
                className={cn("object-contain w-auto h-7 sm:h-8 max-w-[120px]", logoDarkModeInvertClassName)}
                priority
              />
            </Link>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <ModeToggle />
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full touch-manipulation"
                      style={{ backgroundColor: "transparent" }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = header.loginButtonHoverBg || "var(--muted)"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      title={isAdmin ? t.nav.admin : t.nav.account}
                    >
                      <User className="h-4 w-4" style={{ color: header.loginButtonColor || "var(--foreground)" }} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}>
                    <DropdownMenuLabel style={{ color: "var(--foreground)" }}>
                      {isAdmin
                        ? "Administrador"
                        : user?.first_name && user?.last_name 
                          ? `${user.first_name} ${user.last_name}`
                          : user?.email || "Usuario"}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator style={{ backgroundColor: "var(--border)" }} />
                    <DropdownMenuItem asChild style={{ color: "var(--foreground)" }}>
                      <Link href="/orders">
                        <Package className="mr-2 h-4 w-4" />
                        {t.nav.orders}
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator style={{ backgroundColor: "var(--border)" }} />
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
                        const wasOnAdminPage = pathname === '/admin' || pathname === '/dashboard'

                        await logout()

                        if (isAdmin && wasOnAdminPage) {
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
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = header.loginButtonHoverBg || "var(--muted)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  onClick={() => setLoginModalOpen(true)}
                  title={t.auth.login}
                >
                  <LogIn className="h-4.5 w-4.5" style={{ color: header.loginButtonColor || "var(--foreground)" }} />
                </Button>
              )}
              {renderBadgeIconButton({
                icon: <Heart className="h-4 w-4" style={{ color: header.iconColor || "var(--foreground)" }} />,
                count: getWishlistTotalItems(),
                onClick: () => router.push('/wishlist'),
                title: t.nav.wishlist,
                buttonClassName: "h-10 w-10 rounded-full touch-manipulation relative flex-shrink-0",
                badgeClassName: "absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
              })}
              {renderBadgeIconButton({
                icon: <ShoppingCart className="h-4 w-4" style={{ color: header.iconColor || "var(--foreground)" }} />,
                count: getTotalItems(),
                onClick: () => setCartOpen(true),
                title: t.nav.cart,
                buttonClassName: "h-10 w-10 rounded-full relative touch-manipulation flex-shrink-0",
                badgeClassName: "absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
              })}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full touch-manipulation flex-shrink-0"
                style={{ backgroundColor: "transparent" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = header.menuButtonHoverBg || "var(--muted)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                onClick={() => setMenuOpen(true)}
                title={t.header.menu}
              >
                <Menu className="h-4 w-4" style={{ color: header.menuButtonColor || "var(--foreground)" }} />
              </Button>
            </div>
          </div>
          
          {/* Segunda fila: Barra de búsqueda */}
          <form 
            className="relative w-full search-container"
            onSubmit={handleSearch}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 z-10 pointer-events-none" style={{ color: header.searchIconColor || "var(--muted-foreground)" }} />
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
                  backgroundColor: header.searchBgColor || "var(--muted)",
                  borderColor: header.searchBorderColor || "var(--border)",
                  color: header.searchTextColor || "var(--foreground)",
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
                <Search className="h-4 w-4" style={{ color: header.searchIconColor || "var(--muted-foreground)" }} />
              </Button>

              {/* Dropdown de sugerencias - Móvil */}
              {showSuggestions && searchQuery.trim().length >= 2 && (
                <HeaderSearchSuggestions
                  isSearching={isSearching}
                  suggestions={searchSuggestions}
                  searchQuery={searchQuery}
                  onSelectSuggestion={handleSelectSuggestion}
                  onViewAllResults={handleSearch}
                  t={t}
                />
              )}
            </div>
          </form>
        </div>

      </div>
      <ThemeSelectorModal open={themeModalOpen} onOpenChange={setThemeModalOpen} />
      <FontSelectorModal open={fontModalOpen} onOpenChange={setFontModalOpen} />
      
      {/* Menú lateral */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="w-[300px] sm:w-[400px] p-0 flex flex-col"
          style={{ backgroundColor: "var(--background)" }}
        >
          <SheetHeader className="p-6 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
            <SheetTitle className="text-xl font-inter font-semibold" style={{ color: "var(--foreground)" }}>
              {t.header.menu}
            </SheetTitle>
            {/* Mensaje de bienvenida para usuarios autenticados - Solo en desktop */}
            {isAuthenticated && user && (
              <p className="hidden md:block text-base font-medium mt-4" style={{ color: "var(--foreground)" }}>
                {isAdmin
                  ? t.header.welcomeAdmin
                  : t.header.welcome.replace('{name}', user.first_name || user.email.split('@')[0])}
              </p>
            )}
          </SheetHeader>

          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex flex-col p-6 gap-4 flex-1 min-h-0 overflow-y-auto">
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
              {/* Categorías dinámicas desde la BD */}
              {categories.length > 0 ? (
                categories.map((category) => {
                  return (
                    <Link
                      key={category.id}
                      href={`/shop/${category.slug}`}
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
              {isAdmin && (
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
            {isAdmin && (
              <div className="flex-shrink-0 border-t p-6" style={{ borderColor: "var(--border)" }}>
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
                        {item.itemKind === "combo" ? ` (${t.cart.combo})` : ""}
                      </span>
                      <span style={{ color: "var(--foreground)", fontWeight: 500 }}>
                        {localCartSummary.lines.find(line => line.id === String(item.id))?.formattedLineTotal}
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
                    {localCartSummary.formattedTotal}
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
                    // D2: la sesión decide el formulario en /checkout, no un
                    // diálogo intermedio; ambos casos (guest y logueado) navegan directo.
                    setCartOpen(false)
                    router.push("/checkout")
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
                    const canAccessAdmin = await isCurrentUserAdminOrUnverified()
                    toast.success(t.header.accountCreated, {
                      description: canAccessAdmin
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
                  const canAccessAdmin = await isCurrentUserAdminOrUnverified()

                  toast.success(t.header.sessionStarted, {
                    description: canAccessAdmin
                      ? t.header.welcomeAdminLogin
                      : "Bienvenido de nuevo!",
                    duration: 3000,
                  })
                  
                  const loginReturnPath = pendingLoginReturnPath
                  setPendingLoginReturnPath(null)
                  setLoginModalOpen(false)
                  setEmail("")
                  setPassword("")
                  setConfirmPassword("")
                  setFirstName("")
                  setLastName("")
                  setShowPassword(false)
                  setShowConfirmPassword(false)
                  setIsRegisterMode(false)

                  // Un dueño con clave temporal (D21) va a cambiarla antes que a
                  // cualquier destino; el guard de servidor de /admin sigue siendo
                  // la red de seguridad si este adelanto de UX no concluye.
                  if (await currentUserMustChangePassword()) {
                    router.push(FORCE_PASSWORD_CHANGE_PATH)
                  } else if (loginReturnPath) {
                    const nextDestination = resolvePostAuthDestination({
                      returnPath: loginReturnPath,
                      canAccessAdmin,
                      fallback: ADMIN_ACCESS_DENIED_PATH,
                    })
                    router.push(nextDestination)
                  }
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
    </header>
  )
}
