"use client"

import { createContext, useContext, useState, ReactNode } from "react"

export interface CartItem {
  id: string | number
  name: string
  price: string
  image: string
  quantity: number
  category?: string
  originalPrice?: string
  salePrice?: string
  productId?: string  // ID del producto en Supabase (para validación de stock)
  variantId?: string  // ID de la variante en Supabase (si aplica)
  productSlug?: string
  itemKind?: "product" | "combo"
  comboId?: string
  comboDetails?: import("@/lib/combos/types").ComboCatalogDetails
  unitPriceAmount?: number
  currencyCode?: string
}

interface CartContextType {
  items: CartItem[]
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void
  removeFromCart: (id: string | number) => void
  updateQuantity: (id: string | number, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemSubtotal: (item: CartItem) => number
  getTotalItems: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addToCart = (item: Omit<CartItem, "quantity">, quantity: number = 1) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id)
      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        )
      }
      return [...prevItems, { ...item, quantity }]
    })
  }

  const removeFromCart = (id: string | number) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: string | number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id)
      return
    }
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  /**
   * Parsea un string de precio a número.
   * Soporta: "Desde $ 450.000", "$ 1.350.000", "450.000", "450,50", "1,350.00" (US), etc.
   */
  const parsePriceString = (priceStr: string): number => {
    if (!priceStr || typeof priceStr !== "string") return 0
    // Quitar prefijos como "Desde ", "From ", símbolos de moneda y espacios
    let cleaned = priceStr.replace(/^(Desde|From)\s*/gi, "").replace(/[$€£\s]/g, "").trim()
    if (!cleaned) return 0
    const hasComma = cleaned.includes(",")
    const hasDot = cleaned.includes(".")
    if (hasComma && hasDot) {
      // Formato US: 1,350.00 -> el último es decimal
      const lastComma = cleaned.lastIndexOf(",")
      const lastDot = cleaned.lastIndexOf(".")
      const decimalSep = lastDot > lastComma ? "." : ","
      const thousandsSep = decimalSep === "." ? "," : "."
      cleaned = cleaned.replace(new RegExp(`\\${thousandsSep}`, "g"), "").replace(decimalSep, ".")
    } else if (hasComma) {
      // Solo coma: decimal (450,50)
      cleaned = cleaned.replace(/\./g, "").replace(",", ".")
    } else {
      // Solo punto o ninguno: punto como miles (450.000)
      cleaned = cleaned.replace(/\./g, "")
    }
    const num = parseFloat(cleaned)
    return Number.isNaN(num) ? 0 : num
  }

  const getTotal = () => {
    return items.reduce((total, item) => total + getItemSubtotal(item), 0)
  }

  const getItemSubtotal = (item: CartItem) => {
    if (typeof item.unitPriceAmount === "number") {
      return item.unitPriceAmount * item.quantity
    }
    const priceStr = item.salePrice || item.price
    const priceNum = parsePriceString(priceStr)
    return priceNum * item.quantity
  }

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotal,
        getItemSubtotal,
        getTotalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}




