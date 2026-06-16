"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Loader2, 
  ShieldAlert, 
  ArrowLeft,
  Save,
} from "lucide-react"
import Link from "next/link"
import { createItem, getCategories } from "@/lib/supabase/products-api"
import type { ItemCategory } from "@/lib/types/products"
import { MultiImageUpload } from "@/components/admin/multi-image-upload"
import { toast } from "sonner"

const initialProductFormData = {
  item_name: "",
  item_code: "",
  item_description: "",
  ai_details: "",
  category_id: "",
  base_price: "",
  compare_at_price: "",
  currency_code: "COP",
  is_active: true,
  is_featured: false,
  is_available_for_sale: true,
  track_inventory: false,
  inventory_quantity: "0",
  low_stock_threshold: "10",
  seo_title: "",
  seo_description: "",
  tags: "",
  display_order: "0",
}

const createSubmitIntent = {
  list: "list",
  another: "another",
} as const

type CreateSubmitIntent = (typeof createSubmitIntent)[keyof typeof createSubmitIntent]

type SubmitEventWithSubmitter = Event & {
  submitter?: HTMLElement | null
}

export default function CreateProductPage() {
  const { isAdmin, loading } = useAdminPermissions()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitLockRef = useRef(false)
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  
  // Form state
  const [formData, setFormData] = useState(initialProductFormData)
  const [imageResetToken, setImageResetToken] = useState(0)
  
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/")
    }
  }, [isAdmin, loading, router])

  useEffect(() => {
    const loadCategories = async () => {
      if (!isAdmin) return
      
      setLoadingCategories(true)
      try {
        const cats = await getCategories(true) // Incluir inactivas para el admin
        setCategories(cats)
      } catch (error) {
        console.error("[Create Product] Error al cargar categorías:", error)
        toast.error("Error al cargar categorías")
      } finally {
        setLoadingCategories(false)
      }
    }

    if (isAdmin) {
      loadCategories()
    }
  }, [isAdmin])

  const resetFormForNextProduct = () => {
    setFormData({ ...initialProductFormData })
    setImages([])
    setImageResetToken((token) => token + 1)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget
    const intent = submitIntentFromEvent(event)

    event.preventDefault()

    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }

    if (submitLockRef.current) {
      return
    }
    
    if (!formData.item_name.trim()) {
      toast.error("El nombre del producto es requerido")
      return
    }

    if (!formData.base_price || parseFloat(formData.base_price) <= 0) {
      toast.error("El precio base debe ser mayor a 0")
      return
    }

    // Validar cantidad de stock
    const stockQuantity = parseInt(formData.inventory_quantity) || 0
    if (stockQuantity < 0) {
      toast.error("La cantidad de stock no puede ser negativa")
      return
    }

    // Validar imágenes: máximo 5
    if (images.length > 5) {
      toast.error("Solo se permiten máximo 5 imágenes")
      return
    }

    submitLockRef.current = true
    setIsSubmitting(true)

    try {
      // Separar la primera imagen (primary) de las adicionales
      const primaryImage = images.length > 0 ? images[0] : undefined
      const additionalImages = images.length > 1 ? images.slice(1) : []

      // Preparar metadata con ai_details si existe
      const metadata: Record<string, any> = {}
      if (formData.ai_details.trim()) {
        metadata.ai_details = formData.ai_details.trim()
      }

      const result = await createItem(
        {
          item_name: formData.item_name.trim(),
          item_code: formData.item_code.trim() || undefined,
          item_description: formData.item_description.trim() || undefined,
          category_id: formData.category_id || undefined,
          base_price: parseFloat(formData.base_price),
          compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : undefined,
          currency_code: formData.currency_code,
          is_active: formData.is_active,
          is_featured: formData.is_featured,
          is_available_for_sale: formData.is_available_for_sale,
          track_inventory: formData.track_inventory,
          inventory_quantity: parseInt(formData.inventory_quantity) || 0,
          low_stock_threshold: parseInt(formData.low_stock_threshold) || 10,
          seo_title: formData.seo_title.trim() || undefined,
          seo_description: formData.seo_description.trim() || undefined,
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
          primary_image_url: primaryImage,
          primary_image_alt: formData.item_name.trim(),
          display_order: parseInt(formData.display_order) || 0,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        },
        additionalImages
      )

      if (result.success && result.item) {
        if (intent === createSubmitIntent.another) {
          resetFormForNextProduct()
          toast.success("Producto creado exitosamente. Puedes crear otro producto.")
        } else {
          toast.success("Producto creado exitosamente")
          router.push(`/admin/products`)
        }
      } else {
        toast.error(result.error || "Error al crear el producto")
      }
    } catch (error: any) {
      console.error("[Create Product] Error:", error)
      toast.error(error.message || "Error inesperado al crear el producto")
    } finally {
      submitLockRef.current = false
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: "var(--background)" }}
      >
        <Loader2 
          className="h-8 w-8 animate-spin" 
          style={{ color: "var(--foreground)" }}
        />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div 
        className="flex items-center justify-center h-screen p-4"
        style={{ backgroundColor: "var(--background)" }}
      >
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle>Acceso Denegado</CardTitle>
            </div>
            <CardDescription>
              No tienes permisos para acceder a esta página.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Volver al Inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen" 
      style={{ 
        backgroundColor: "var(--background)",
        background: "linear-gradient(to bottom right, var(--background), var(--muted))"
      }}
    >
      {/* Header */}
      <header 
        className="border-b shadow-sm"
        style={{ 
          backgroundColor: "var(--card)",
          borderColor: "var(--border)"
        }}
      >
        <div className="container mx-auto px-4 py-4 max-w-full">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10" asChild>
                <Link href="/admin/products">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="min-w-0">
                <h1 
                  className="text-lg sm:text-xl md:text-2xl font-bold truncate"
                  style={{ color: "var(--foreground)" }}
                >
                  Crear Nuevo Producto
                </h1>
                <p 
                  className="text-xs sm:text-sm mt-1 truncate"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Completa el formulario para agregar un nuevo producto al catálogo
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-full overflow-x-hidden">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna Principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Información Básica */}
              <Card>
                <CardHeader>
                  <CardTitle>Información Básica</CardTitle>
                  <CardDescription>
                    Datos principales del producto
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="item_name">Nombre del Producto *</Label>
                    <Input
                      id="item_name"
                      value={formData.item_name}
                      onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                      placeholder="Ej: Auriculares Inalámbricos Premium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="item_code">Código del Producto</Label>
                      <Input
                        id="item_code"
                        value={formData.item_code}
                        onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                        placeholder="SKU-001"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category_id">Categoría</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingCategories ? (
                            <div className="p-2 text-center">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            </div>
                          ) : categories.length === 0 ? (
                            <div className="p-2 text-center text-sm text-muted-foreground">
                              No hay categorías disponibles
                            </div>
                          ) : (
                            categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.category_name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="item_description">Descripción</Label>
                    <Textarea
                      id="item_description"
                      value={formData.item_description}
                      onChange={(e) => setFormData({ ...formData, item_description: e.target.value })}
                      placeholder="Descripción del producto..."
                      rows={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai_details">
                      Detalles y Características para el Asistente Virtual
                    </Label>
                    <Textarea
                      id="ai_details"
                      value={formData.ai_details}
                      onChange={(e) => setFormData({ ...formData, ai_details: e.target.value })}
                      placeholder="Ej: Material: Aluminio anodizado. Dimensiones: 15x10x5 cm. Peso: 250g. Incluye: Cable USB-C, manual de usuario. Garantía: 2 años. Compatible con: iOS 12+, Android 8+..."
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Información detallada sobre características, especificaciones técnicas, materiales, compatibilidad, etc. 
                      Esta información será utilizada por el asistente virtual para responder preguntas específicas sobre el producto.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Precios */}
              <Card>
                <CardHeader>
                  <CardTitle>Precios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="base_price">Precio Base *</Label>
                      <Input
                        id="base_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.base_price}
                        onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="compare_at_price">Precio Comparación</Label>
                      <Input
                        id="compare_at_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.compare_at_price}
                        onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currency_code">Moneda</Label>
                      <Select
                        value={formData.currency_code}
                        onValueChange={(value) => setFormData({ ...formData, currency_code: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                          <SelectItem value="USD">USD - Dólar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inventario */}
              <Card>
                <CardHeader>
                  <CardTitle>Inventario</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inventory_quantity">Cantidad en Stock *</Label>
                    <Input
                      id="inventory_quantity"
                      type="number"
                      min="0"
                      value={formData.inventory_quantity}
                      onChange={(e) => setFormData({ ...formData, inventory_quantity: e.target.value })}
                      placeholder="0"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Ingresa la cantidad disponible del producto en stock
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="track_inventory"
                      checked={formData.track_inventory}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, track_inventory: checked === true })
                      }
                    />
                    <Label htmlFor="track_inventory" className="cursor-pointer">
                      Rastrear inventario automáticamente
                    </Label>
                  </div>

                  {formData.track_inventory && (
                    <div className="space-y-2">
                      <Label htmlFor="low_stock_threshold">Umbral de Stock Bajo</Label>
                      <Input
                        id="low_stock_threshold"
                        type="number"
                        min="0"
                        value={formData.low_stock_threshold}
                        onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                        placeholder="10"
                      />
                      <p className="text-xs text-muted-foreground">
                        Se enviará una alerta cuando el stock esté por debajo de este valor
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SEO */}
              <Card>
                <CardHeader>
                  <CardTitle>SEO</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seo_title">Título SEO</Label>
                    <Input
                      id="seo_title"
                      value={formData.seo_title}
                      onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                      placeholder="Título para motores de búsqueda"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo_description">Descripción SEO</Label>
                    <Textarea
                      id="seo_description"
                      value={formData.seo_description}
                      onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                      placeholder="Descripción para motores de búsqueda"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Etiquetas (separadas por comas)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="etiqueta1, etiqueta2, etiqueta3"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Columna Lateral */}
            <div className="space-y-6">
              {/* Imágenes */}
              <Card>
                <CardHeader>
                  <CardTitle>Imágenes del Producto</CardTitle>
                  <CardDescription>
                    Máximo 5 imágenes. Cada imagen debe pesar 1 MB o menos.
                    La primera imagen será la imagen principal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MultiImageUpload
                    images={images}
                    onChange={setImages}
                    maxImages={5}
                    maxSizeMB={1}
                    context="product-images"
                    label="Imágenes del Producto"
                    resetToken={imageResetToken}
                  />
                </CardContent>
              </Card>

              {/* Estado y Configuración */}
              <Card>
                <CardHeader>
                  <CardTitle>Estado y Configuración</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked === true })
                      }
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">
                      Producto activo
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_featured"
                      checked={formData.is_featured}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_featured: checked === true })
                      }
                    />
                    <Label htmlFor="is_featured" className="cursor-pointer">
                      Producto destacado
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_available_for_sale"
                      checked={formData.is_available_for_sale}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_available_for_sale: checked === true })
                      }
                    />
                    <Label htmlFor="is_available_for_sale" className="cursor-pointer">
                      Disponible para venta
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="display_order">Orden de Visualización</Label>
                    <Input
                      id="display_order"
                      type="number"
                      min="0"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Botones de Acción */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="submit"
                  name="createSubmitIntent"
                  value={createSubmitIntent.list}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Crear Producto
                    </>
                  )}
                </Button>
                <Button
                  type="submit"
                  name="createSubmitIntent"
                  value={createSubmitIntent.another}
                  variant="outline"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar y crear otro
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  asChild
                >
                  <Link href="/admin/products">Cancelar</Link>
                </Button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}

function submitIntentFromEvent(event: React.FormEvent<HTMLFormElement>): CreateSubmitIntent {
  const submitter = (event.nativeEvent as SubmitEventWithSubmitter).submitter

  if (submitter instanceof HTMLButtonElement && submitter.value === createSubmitIntent.another) {
    return createSubmitIntent.another
  }

  return createSubmitIntent.list
}
