"use client"

import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { Loader2, ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import type { ItemCategory, StoreItemWithDetails } from "@/lib/types/products"
import { MultiImageUpload } from "@/components/admin/multi-image-upload"
import { toast } from "sonner"
import { getAdminCompareAtPriceNotice } from "@/lib/products/pricing"
import { editProductSchema, type ProductFormValues } from "@/lib/products/schemas"
import { updateProductAction } from "../../../actions"
import { FieldError } from "@/components/admin/field-error"

function toFormValues(product: StoreItemWithDetails): ProductFormValues {
  const images: string[] = []
  if (product.primary_image_url) {
    images.push(product.primary_image_url)
  }
  for (const image of product.images || []) {
    if (image.image_url && !images.includes(image.image_url)) {
      images.push(image.image_url)
    }
  }

  const aiDetails = (product.metadata as Record<string, any>)?.ai_details || ""

  return {
    item_name: product.item_name || "",
    item_code: product.item_code || "",
    item_description: product.item_description || "",
    ai_details: aiDetails,
    category_id: product.category_id || "",
    base_price: product.base_price.toString(),
    compare_at_price: product.compare_at_price?.toString() || "",
    currency_code: product.currency_code || "COP",
    is_active: product.is_active,
    is_featured: product.is_featured,
    is_available_for_sale: product.is_available_for_sale,
    track_inventory: product.track_inventory,
    inventory_quantity: product.inventory_quantity.toString(),
    low_stock_threshold: product.low_stock_threshold.toString(),
    seo_title: product.seo_title || "",
    seo_description: product.seo_description || "",
    tags: product.tags?.join(", ") || "",
    display_order: product.display_order.toString(),
    images,
  }
}

type EditProductFormProps = {
  product: StoreItemWithDetails
  categories: ItemCategory[]
}

export function EditProductForm({ product, categories }: EditProductFormProps) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(editProductSchema),
    defaultValues: toFormValues(product),
  })

  const images = useWatch({ control, name: "images" })
  const trackInventory = useWatch({ control, name: "track_inventory" })
  const basePrice = useWatch({ control, name: "base_price" })
  const compareAtPrice = useWatch({ control, name: "compare_at_price" })
  const compareAtPriceNotice = getAdminCompareAtPriceNotice(basePrice, compareAtPrice)

  const onSubmit = async (values: ProductFormValues) => {
    if (values.compare_at_price && compareAtPriceNotice) {
      toast.warning(compareAtPriceNotice)
    }

    try {
      const result = await updateProductAction(product.id, values)

      if (result.success) {
        toast.success("Producto actualizado exitosamente")
        router.push("/admin/products")
      } else {
        toast.error(result.error || "Error al actualizar el producto")
      }
    } catch (error: any) {
      console.error("[Edit Product] Error:", error)
      toast.error(error.message || "Error inesperado al actualizar el producto")
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/admin/products">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">Editar Producto</h1>
            <p className="text-sm text-muted-foreground">
              Modifica la información del producto
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
                <CardDescription>Datos principales del producto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="item_name">Nombre del Producto *</Label>
                  <Input
                    id="item_name"
                    placeholder="Ej: Auriculares Inalámbricos Premium"
                    {...register("item_name")}
                  />
                  <FieldError message={errors.item_name?.message} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="item_code">Código del Producto</Label>
                    <Input id="item_code" placeholder="SKU-001" {...register("item_code")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category_id">Categoría</Label>
                    <Controller
                      control={control}
                      name="category_id"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.length === 0 ? (
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
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item_description">Descripción</Label>
                  <Textarea
                    id="item_description"
                    placeholder="Descripción del producto..."
                    rows={6}
                    {...register("item_description")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_details">
                    Detalles y Características para el Asistente Virtual
                  </Label>
                  <Textarea
                    id="ai_details"
                    placeholder="Ej: Material: Aluminio anodizado. Dimensiones: 15x10x5 cm. Peso: 250g. Incluye: Cable USB-C, manual de usuario. Garantía: 2 años. Compatible con: iOS 12+, Android 8+..."
                    rows={6}
                    className="font-mono text-sm"
                    {...register("ai_details")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Información detallada sobre características, especificaciones técnicas,
                    materiales, compatibilidad, etc. Esta información será utilizada por el
                    asistente virtual para responder preguntas específicas sobre el producto.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Precios</CardTitle>
                <CardDescription>
                  El precio de venta actual es el que paga el cliente. El precio anterior solo se
                  muestra tachado si es mayor.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="base_price">Precio base / venta actual *</Label>
                    <Input
                      id="base_price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register("base_price")}
                    />
                    <FieldError message={errors.base_price?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="compare_at_price">Precio anterior / precio de comparación</Label>
                    <Input
                      id="compare_at_price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register("compare_at_price")}
                    />
                    {compareAtPriceNotice ? (
                      <p className="text-xs font-medium text-destructive">{compareAtPriceNotice}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Déjalo vacío si el producto no tiene descuento.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency_code">Moneda</Label>
                    <Controller
                      control={control}
                      name="currency_code"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                            <SelectItem value="USD">USD - Dólar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Controller
                    control={control}
                    name="track_inventory"
                    render={({ field }) => (
                      <Checkbox
                        id="track_inventory"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    )}
                  />
                  <Label htmlFor="track_inventory" className="cursor-pointer">
                    Rastrear inventario
                  </Label>
                </div>

                {trackInventory && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inventory_quantity">Cantidad en Stock</Label>
                      <Input
                        id="inventory_quantity"
                        type="number"
                        min="0"
                        {...register("inventory_quantity")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="low_stock_threshold">Umbral de Stock Bajo</Label>
                      <Input
                        id="low_stock_threshold"
                        type="number"
                        min="0"
                        {...register("low_stock_threshold")}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seo_title">Título SEO</Label>
                  <Input
                    id="seo_title"
                    placeholder="Título para motores de búsqueda"
                    {...register("seo_title")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seo_description">Descripción SEO</Label>
                  <Textarea
                    id="seo_description"
                    placeholder="Descripción para motores de búsqueda"
                    rows={3}
                    {...register("seo_description")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Etiquetas (separadas por comas)</Label>
                  <Input
                    id="tags"
                    placeholder="etiqueta1, etiqueta2, etiqueta3"
                    {...register("tags")}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Imágenes del Producto</CardTitle>
                <CardDescription>
                  Máximo 5 imágenes. Cada imagen debe pesar 1 MB o menos. La primera imagen será la
                  imagen principal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MultiImageUpload
                  images={images}
                  onChange={(next) =>
                    setValue("images", next, { shouldValidate: true, shouldDirty: true })
                  }
                  maxImages={5}
                  maxSizeMB={1}
                  context="product-images"
                  label="Imágenes del Producto"
                />
                <FieldError message={errors.images?.message} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado y Configuración</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Controller
                    control={control}
                    name="is_active"
                    render={({ field }) => (
                      <Checkbox
                        id="is_active"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    )}
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Producto activo
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Controller
                    control={control}
                    name="is_featured"
                    render={({ field }) => (
                      <Checkbox
                        id="is_featured"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    )}
                  />
                  <Label htmlFor="is_featured" className="cursor-pointer">
                    Producto destacado
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Controller
                    control={control}
                    name="is_available_for_sale"
                    render={({ field }) => (
                      <Checkbox
                        id="is_available_for_sale"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    )}
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
                    {...register("display_order")}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/products">Cancelar</Link>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
