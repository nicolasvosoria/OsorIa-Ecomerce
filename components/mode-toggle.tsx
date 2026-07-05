"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMode } from "@/contexts/mode-context"

export function ModeToggle() {
  const { isDark, setMode } = useMode()
  const label = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 lg:h-10 lg:w-10 rounded-full flex-shrink-0"
      style={{ backgroundColor: "transparent" }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--muted)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      onClick={() => setMode(isDark ? "light" : "dark")}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
    >
      <Sun
        className="h-4 w-4 lg:h-5 lg:w-5 rotate-0 scale-100 motion-safe:transition-transform motion-safe:duration-300 dark:-rotate-90 dark:scale-0"
        style={{ color: "var(--foreground)" }}
      />
      <Moon
        className="absolute h-4 w-4 lg:h-5 lg:w-5 rotate-90 scale-0 motion-safe:transition-transform motion-safe:duration-300 dark:rotate-0 dark:scale-100"
        style={{ color: "var(--foreground)" }}
      />
    </Button>
  )
}
