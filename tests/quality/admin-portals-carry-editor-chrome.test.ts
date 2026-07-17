import { readdirSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const ADMIN_ROOTS = ["app/admin", "app/(platform)/admin", "components/admin"]
const CHROME_CLASS = "editor-chrome"

// Estos primitivos de Radix montan su contenido en un portal colgado del <body>,
// fuera del subárbol del admin, así que no heredan el chrome y se pintarían con
// el tema de la tienda salvo que lo pidan explícitamente.
const PORTALED_CONTENT = [
  "SelectContent",
  "DropdownMenuContent",
  "PopoverContent",
  "AlertDialogContent",
  "DialogContent",
  "SheetContent",
  "TooltipContent",
]

const openingTag = new RegExp(`<(${PORTALED_CONTENT.join("|")})(\\s[^>]*?)?/?>`, "g")

function adminSourceFiles(): string[] {
  return ADMIN_ROOTS.flatMap((root) =>
    readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((entry) => entry.endsWith(".tsx"))
      .map((entry) => `${root}/${entry}`),
  )
}

function portalsMissingChrome(filePath: string): string[] {
  const source = readFileSync(filePath, "utf8")

  return [...source.matchAll(openingTag)]
    .filter(([, , attributes]) => !(attributes ?? "").includes(CHROME_CLASS))
    .map(([, componentName]) => componentName)
}

describe("admin portals carry the editor chrome", () => {
  it.each(adminSourceFiles())("%s", (filePath) => {
    expect(portalsMissingChrome(filePath)).toEqual([])
  })
})
