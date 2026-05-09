"use client"

import { useLanguage } from "@/contexts/language-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"
import { useComponentStyle } from "@/contexts/styles-context"

export function LanguageSelector() {
  const { language, setLanguage, availableLanguages } = useLanguage()
  const currentLang = availableLanguages.find(lang => lang.code === language)
  const { styles: styleData } = useComponentStyle("header", {
    iconColor: "#1a1a1a",
    iconHoverBg: "#f5f5f5",
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full relative touch-manipulation flex-shrink-0"
          style={{ backgroundColor: "transparent" }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styleData.iconHoverBg || "var(--muted)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          title={currentLang?.name || 'Idioma'}
        >
          <Globe className="h-4 w-4" style={{ color: styleData.iconColor || "var(--foreground)" }} />
          <span className="sr-only">Cambiar idioma / Change language / Mudar idioma</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`cursor-pointer flex items-center gap-2 ${
              language === lang.code ? 'bg-accent' : ''
            }`}
          >
            <span className="text-xl">{lang.flag}</span>
            <span>{lang.name}</span>
            {language === lang.code && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

