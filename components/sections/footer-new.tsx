"use client"

import { useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { useTheme } from "@/contexts/theme-context"
import { useMode } from "@/contexts/mode-context"
import { useStore } from "@/contexts/store-context"
import { cn } from "@/lib/utils"

type FooterLink = { label: string; url: string }

/**
 * Single source of truth for the footer's editable defaults. Imported by
 * `lib/section-editor/component-fields.ts` for `COMPONENT_FIELDS.footer.defaults`
 * so the live footer and the admin editor never drift apart. Link groups ship
 * with the only routes that actually exist; a store fills the rest from the editor.
 */
export const FOOTER_DEFAULTS = {
  brandName: "Osoria",
  copyrightText: "Todos los derechos reservados",
  logoImage: "/logo-negro.svg",
  logoImageDark: "/logo-osoria-blanco.svg",
  group1Title: "Navegación",
  group1Links: [
    { label: "Inicio", url: "/" },
    { label: "Tienda", url: "/shop" },
    { label: "Catálogo", url: "/catalog" },
  ] satisfies FooterLink[],
  group2Title: "Atención al cliente",
  group2Links: [
    { label: "Mis pedidos", url: "/dashboard" },
    { label: "Lista de deseos", url: "/wishlist" },
  ] satisfies FooterLink[],
  group3Title: "Nuestra empresa",
  group3Links: [] satisfies FooterLink[],
}

function resolveFooterLogoSrc({
  isDarkTheme,
  isDark,
  logoImage,
  logoImageDark,
}: {
  isDarkTheme: boolean
  isDark: boolean
  logoImage: string | undefined
  logoImageDark: string | undefined
}): string {
  if (isDarkTheme) return logoImageDark || "/logo-osoria-blanco.svg"
  if (isDark && logoImageDark) return logoImageDark
  return logoImage || "/logo-negro.svg"
}

export function FooterNew() {
  const { activeTheme } = useTheme()
  const { isDark } = useMode()
  const { store } = useStore()

  const { styles: styleData } = useComponentStyle("footer", FOOTER_DEFAULTS)
  const { componentEdits } = useAdmin()
  const edits = componentEdits.get("footer") || {}
  const footer = { ...FOOTER_DEFAULTS, ...styleData, ...edits }

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

  const logoSrc = resolveFooterLogoSrc({
    isDarkTheme,
    isDark,
    logoImage: footer.logoImage,
    logoImageDark: footer.logoImageDark,
  })
  // Sin logo oscuro dedicado: invertir el logo por defecto en modo oscuro para que el
  // wordmark siga siendo visible sobre fondo oscuro. Sólo se activa vía la variante `dark:`.
  const logoDarkModeInvertClassName =
    !isDarkTheme && !footer.logoImageDark ? "dark:invert dark:brightness-0" : undefined

  const linkGroups: Array<{ key: string; title: string; links: FooterLink[] }> = [
    { key: "group1", title: footer.group1Title, links: footer.group1Links },
    { key: "group2", title: footer.group2Title, links: footer.group2Links },
    { key: "group3", title: footer.group3Title, links: footer.group3Links },
  ]
  const visibleGroups = linkGroups.filter((group) => group.links.length > 0)
  const brandName = store?.store_name || footer.brandName

  return (
    <footer data-component="footer" className="py-8 md:py-12 px-4" style={{ backgroundColor: "var(--background)", borderTop: "1px solid var(--border)" }}>
      <div className="container mx-auto">

        {/* Logo o Nombre de la marca */}
        <div className="mb-8 md:mb-12 text-center md:text-left">
          <Link href="/" className="inline-block">
            <Image
              src={logoSrc}
              alt="Osoria Logo"
              width={140}
              height={50}
              className={cn("object-contain mx-auto md:mx-0", logoDarkModeInvertClassName)}
              priority
            />
          </Link>
        </div>

        {/* Footer Links */}
        {visibleGroups.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-12 mb-8 md:mb-12">
            {visibleGroups.map((group) => (
              <div key={group.key}>
                <h3 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">{group.title}</h3>
                <ul className="space-y-1 md:space-y-2">
                  {group.links.map((link) => (
                    <li key={`${link.label}-${link.url}`}>
                      <Link href={link.url} className="text-muted-foreground hover:text-foreground text-xs md:text-sm">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Copyright */}
        <div className="pt-8 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm text-center" style={{ color: "var(--muted-foreground)" }}>
            © {new Date().getFullYear()} {brandName} · {footer.copyrightText}
          </p>
        </div>
      </div>
    </footer>
  )
}
