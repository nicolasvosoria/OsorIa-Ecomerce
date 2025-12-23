"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader } from "@/components/ui/loader"
import { useRouter } from "next/navigation"
import { useCart } from "@/components/cart/cart-context"
import { toast } from "sonner"

export interface GuestCustomerData {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  country: string
  notes?: string
}

interface GuestCheckoutFormProps {
  onComplete: (customerData: GuestCustomerData) => void
  isLoading?: boolean
}

export function GuestCheckoutForm({ onComplete, isLoading = false }: GuestCheckoutFormProps) {
  const [formData, setFormData] = useState<GuestCustomerData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Colombia",
    notes: "",
  })

  const [errors, setErrors] = useState<Partial<Record<keyof GuestCustomerData, string>>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof GuestCustomerData, string>> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = "El nombre es requerido"
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "El apellido es requerido"
    }

    if (!formData.email.trim()) {
      newErrors.email = "El correo electrónico es requerido"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "El correo electrónico no es válido"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "El teléfono es requerido"
    }

    if (!formData.address.trim()) {
      newErrors.address = "La dirección es requerida"
    }

    if (!formData.city.trim()) {
      newErrors.city = "La ciudad es requerida"
    }

    if (!formData.postalCode.trim()) {
      newErrors.postalCode = "El código postal es requerido"
    }

    if (!formData.country.trim()) {
      newErrors.country = "El país es requerido"
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

    onComplete(formData)
  }

  const handleChange = (field: keyof GuestCustomerData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información de Contacto</CardTitle>
          <CardDescription>
            Completa tus datos para procesar tu pedido
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                placeholder="Juan"
                disabled={isLoading}
                className={errors.firstName ? "border-destructive" : ""}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                Apellido <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                placeholder="Pérez"
                disabled={isLoading}
                className={errors.lastName ? "border-destructive" : ""}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Correo Electrónico <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="juan.perez@ejemplo.com"
              disabled={isLoading}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Teléfono <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+57 300 123 4567"
              disabled={isLoading}
              className={errors.phone ? "border-destructive" : ""}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dirección de Envío</CardTitle>
          <CardDescription>
            Ingresa la dirección donde deseas recibir tu pedido
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">
              Dirección <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Calle 123 #45-67"
              disabled={isLoading}
              className={errors.address ? "border-destructive" : ""}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">
                Ciudad <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Bogotá"
                disabled={isLoading}
                className={errors.city ? "border-destructive" : ""}
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">
                Código Postal <span className="text-destructive">*</span>
              </Label>
              <Input
                id="postalCode"
                type="text"
                value={formData.postalCode}
                onChange={(e) => handleChange("postalCode", e.target.value)}
                placeholder="110111"
                disabled={isLoading}
                className={errors.postalCode ? "border-destructive" : ""}
              />
              {errors.postalCode && (
                <p className="text-sm text-destructive">{errors.postalCode}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">
              País <span className="text-destructive">*</span>
            </Label>
            <Input
              id="country"
              type="text"
              value={formData.country}
              onChange={(e) => handleChange("country", e.target.value)}
              placeholder="Colombia"
              disabled={isLoading}
              className={errors.country ? "border-destructive" : ""}
            />
            {errors.country && (
              <p className="text-sm text-destructive">{errors.country}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionales (opcional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Instrucciones especiales para la entrega..."
              disabled={isLoading}
              rows={3}
            />
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

