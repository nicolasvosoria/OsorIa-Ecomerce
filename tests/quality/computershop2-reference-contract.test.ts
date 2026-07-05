import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import manifest from "@/data/visual-reference/computershop2-manifest.json"

const scriptPath = path.join(process.cwd(), "scripts/prepare-computershop2-reference.mjs")

describe("BeComputerShop2 reference manifest", () => {
  it("keeps licensed reference data out of React hardcoding and maps every product to a declared asset", () => {
    const assetKeys = new Set(manifest.assets.map((asset) => asset.key))

    expect(manifest.reference.url).toBe("https://themes.muffingroup.com/be/computershop2/")
    expect(manifest.storage.bucket).toBe("products")
    expect(manifest.storage.prefix).toBe("visual-reference/computershop2")
    expect(manifest.products.length).toBeGreaterThanOrEqual(8)
    manifest.products.forEach((product) => {
      expect(assetKeys.has(product.assetKey)).toBe(true)
    })
  })

  it("uses an ecommerce-only reset/import script with an explicit confirmation gate", () => {
    const source = fs.readFileSync(scriptPath, "utf8")

    expect(source).toContain("const ECOMMERCE_SCHEMA = 'ecommerce'")
    expect(source).toContain("--confirm-default-reset")
    expect(source).toContain("backupDefaultStore")
    expect(source).not.toMatch(/\.schema\(['\"]public['\"]\)/)
    expect(source).not.toMatch(/from\(['\"]public\./)
  })

  it("backs up and resets combo dependencies before deleting default-store products", () => {
    const source = fs.readFileSync(scriptPath, "utf8")
    const comboComponentsIndex = source.indexOf("product_combo_components")
    const productCombosIndex = source.indexOf("product_combos")
    const storeItemsDeleteIndex = source.indexOf("reset ecommerce.store_items")

    expect(source).toContain("productCombos")
    expect(source).toContain("productComboComponents")
    expect(comboComponentsIndex).toBeGreaterThan(-1)
    expect(productCombosIndex).toBeGreaterThan(-1)
    expect(storeItemsDeleteIndex).toBeGreaterThan(-1)
    expect(comboComponentsIndex).toBeLessThan(storeItemsDeleteIndex)
    expect(productCombosIndex).toBeLessThan(storeItemsDeleteIndex)
  })
})
