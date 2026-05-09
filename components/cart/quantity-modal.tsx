/* eslint-disable @next/next/no-img-element -- Existing dynamic storefront images intentionally use native img in these legacy components; converting all to next/image is outside the global-gates cleanup risk budget. */
"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Minus } from "lucide-react"
import { deferStateUpdate } from "@/lib/react/defer-state-update"

interface QuantityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (quantity: number) => void
  productName?: string
  productImage?: string
  maxQuantity?: number
  initialQuantity?: number
}

export function QuantityModal({
  open,
  onOpenChange,
  onConfirm,
  productName = "Producto",
  productImage,
  maxQuantity = 99,
  initialQuantity = 1,
}: QuantityModalProps) {
  const [quantity, setQuantity] = useState(initialQuantity)

  // Resetear cantidad cuando se abre el modal
  useEffect(() => {
    if (open) {
      deferStateUpdate(() => setQuantity(initialQuantity))
    }
  }, [open, initialQuantity])

  const handleIncrement = () => {
    if (quantity < maxQuantity) {
      setQuantity(quantity + 1)
    }
  }

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1
    if (value >= 1 && value <= maxQuantity) {
      setQuantity(value)
    }
  }

  const handleConfirm = () => {
    if (quantity >= 1 && quantity <= maxQuantity) {
      onConfirm(quantity)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-inter font-semibold" style={{ color: "var(--foreground)" }}>
            Seleccionar Cantidad
          </DialogTitle>
          <DialogDescription className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            ¿Cuántas unidades de {productName} deseas agregar al carrito?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Imagen del producto si está disponible */}
          {productImage && (
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                <img
                  src={productImage}
                  alt={productName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Controles de cantidad */}
          <div className="space-y-3">
            <Label htmlFor="quantity" className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Cantidad
            </Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                className="h-10 w-10"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <Input
                id="quantity"
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={handleQuantityChange}
                className="text-center text-lg font-semibold w-20"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleIncrement}
                disabled={quantity >= maxQuantity}
                className="h-10 w-10"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
              Cantidad máxima: {maxQuantity}
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={handleConfirm}
              className="w-full"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              Agregar {quantity} {quantity === 1 ? "unidad" : "unidades"} al carrito
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
              style={{
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}













