"use client"

import { useState } from "react"
import { QuantityModal } from "@/components/cart/quantity-modal"
import { useCart } from "@/contexts/cart-context"
import { toast } from "sonner"

interface ProductItem {
  id: string | number
  name: string
  price: string
  image: string
  category?: string
  originalPrice?: string
  salePrice?: string
}

export function useQuantityModal() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null)
  const { addToCart } = useCart()

  const openModal = (product: ProductItem) => {
    setSelectedProduct(product)
    setModalOpen(true)
  }

  const handleConfirm = (quantity: number) => {
    if (selectedProduct) {
      addToCart(selectedProduct, quantity)
      toast.success("Producto agregado al carrito", {
        description: `${quantity} ${quantity === 1 ? "unidad" : "unidades"} de ${selectedProduct.name} ${quantity === 1 ? "ha sido" : "han sido"} agregada${quantity === 1 ? "" : "s"} exitosamente`,
        duration: 3000,
      })
      setSelectedProduct(null)
    }
  }

  const QuantityModalComponent = selectedProduct ? (
    <QuantityModal
      open={modalOpen}
      onOpenChange={setModalOpen}
      onConfirm={handleConfirm}
      productName={selectedProduct.name}
      productImage={selectedProduct.image}
      maxQuantity={99}
      initialQuantity={1}
    />
  ) : null

  return {
    openModal,
    QuantityModalComponent,
  }
}












