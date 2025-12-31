"use client"

import { useEffect } from "react"
import { useStore } from "@/contexts/store-context"

/**
 * Componente que cambia el título de la página dinámicamente basado en la tienda
 */
export function DynamicTitle() {
  const { store } = useStore()

  useEffect(() => {
    if (store?.subdomain === 'reposteria') {
      document.title = "Tienda de Postres"
    } else if (store?.store_name) {
      document.title = store.store_name
    } else {
      document.title = "Ecommerce"
    }
  }, [store?.subdomain, store?.store_name])

  return null
}

