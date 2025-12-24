"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader } from "@/components/ui/loader"
import { toast } from "sonner"
import type { UserProfile } from "@/lib/types/user"

interface AuthenticatedCheckoutFormProps {
  user: UserProfile
  onComplete: (data: { phone: string; address: string }) => void
  isLoading?: boolean
}

export function AuthenticatedCheckoutForm({
  user,
  onComplete,
  isLoading = false,
}: AuthenticatedCheckoutFormProps) {
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [errors, setErrors] = useState<{ phone?: string; address?: string }>({})

  const validateForm = (): boolean => {
    const newErrors: { phone?: string; address?: string } = {}

    if (!phone.trim()) {
      newErrors.phone = "El teléfono es requerido"
    }

    if (!address.trim()) {
      newErrors.address = "La dirección es requerida"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error("Por favor, completa todos los campos requeridos")
      return
    }

    onComplete({ phone: phone.trim(), address: address.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información de Envío</CardTitle>
          <CardDescription>
            Completa tus datos de contacto y dirección para procesar tu pedido
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Información del usuario (solo lectura) */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Información de tu cuenta:</p>
            <div className="space-y-1">
              <p className="text-sm">
                <strong>Nombre:</strong> {user.first_name || ""} {user.last_name || ""}
              </p>
              <p className="text-sm">
                <strong>Correo:</strong> {user.email}
              </p>
            </div>
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              Teléfono / Celular <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                if (errors.phone) {
                  setErrors((prev) => ({ ...prev, phone: undefined }))
                }
              }}
              placeholder="+57 300 123 4567"
              disabled={isLoading}
              className={errors.phone ? "border-destructive" : ""}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>

          {/* Dirección */}
          <div className="space-y-2">
            <Label htmlFor="address">
              Dirección de Envío <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address"
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value)
                if (errors.address) {
                  setErrors((prev) => ({ ...prev, address: undefined }))
                }
              }}
              placeholder="Calle 123 #45-67"
              disabled={isLoading}
              className={errors.address ? "border-destructive" : ""}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
          className="min-w-[200px]"
        >
          {isLoading ? (
            <>
              <Loader size="default" className="mr-2" />
              Procesando...
            </>
          ) : (
            "Continuar con el Pago"
          )}
        </Button>
      </div>
    </form>
  )
}

