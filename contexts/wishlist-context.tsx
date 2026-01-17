"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export interface WishlistItem {
  id: string
  title: string
  handle: string
  image?: string
  price?: string
  compareAtPrice?: string
  currencyCode?: string
}

interface WishlistContextType {
  items: WishlistItem[]
  addToWishlist: (item: WishlistItem) => void
  removeFromWishlist: (id: string) => void
  isInWishlist: (id: string) => boolean
  clearWishlist: () => void
  getTotalItems: () => number
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

const WISHLIST_STORAGE_KEY = 'osoria-wishlist'

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([])

  // Cargar wishlist desde localStorage al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setItems(parsed)
      }
    } catch (error) {
      console.error('Error loading wishlist from localStorage:', error)
    }
  }, [])

  // Guardar wishlist en localStorage cuando cambie
  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error('Error saving wishlist to localStorage:', error)
    }
  }, [items])

  const addToWishlist = (item: WishlistItem) => {
    setItems((prevItems) => {
      // Verificar si el producto ya está en la wishlist
      if (prevItems.find((i) => i.id === item.id)) {
        return prevItems
      }
      return [...prevItems, item]
    })
  }

  const removeFromWishlist = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id))
  }

  const isInWishlist = (id: string) => {
    return items.some((item) => item.id === id)
  }

  const clearWishlist = () => {
    setItems([])
  }

  const getTotalItems = () => {
    return items.length
  }

  return (
    <WishlistContext.Provider
      value={{
        items,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        clearWishlist,
        getTotalItems,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider")
  }
  return context
}




