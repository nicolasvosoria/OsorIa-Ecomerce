"use client"

import { useMemo, useState, useTransition } from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, PackageCheck, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column } from "@/components/admin/data-table"
import { uploadImage, deleteImage } from "@/lib/supabase/storage-api"
import { cleanupDeferredUploadedImage, resolveDeferredImageUpload } from "@/lib/products/deferred-image-upload"
import { formatPrice } from "@/lib/commerce/utils"
import { comboSchema, type ComboFormValues } from "@/lib/combos/schemas"
import type { ComboCatalogDetails } from "@/lib/combos/types"
import type { ItemCategory, StoreItemWithDetails } from "@/lib/types/products"
import { DeferredImageUpload } from "../../components/deferred-image-upload"
import { FieldError } from "@/components/admin/field-error"
import { createComboAction, updateComboAction } from "../actions"
import { DeleteComboButton } from "./delete-combo-button"

const emptyComboValues: ComboFormValues = {
  name: "",
  slug: "",
  category_id: "",
  description: "",
  image_url: "",
  is_active: true,
  discount_type: "percentage",
  discount_value: "0",
  components: [
    { product_id: "", variant_id: "", quantity: "1" },
    { product_id: "", variant_id: "", quantity: "1" },
  ],
}

function toFormValues(combo: ComboCatalogDetails): ComboFormValues {
  return {
    name: combo.name,
    slug: combo.slug || "",
    category_id: combo.categoryId || "",
    description: combo.description || "",
    image_url: combo.imageUrl || "",
    is_active: combo.isActive,
    discount_type: combo.pricing.discountType,
    discount_value: combo.pricing.discountValue.toString(),
    components: combo.components.map((component) => ({
      product_id: component.productId,
      variant_id: component.variantId || "",
      quantity: component.quantity.toString(),
    })),
  }
}

type CombosManagerProps = {
  combos: ComboCatalogDetails[]
  state: "ready" | "empty" | "error"
  products: StoreItemWithDetails[]
  categories: ItemCategory[]
}

export function CombosManager({ combos, state, products, categories }: CombosManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ComboFormValues>({
    resolver: zodResolver(comboSchema),
    defaultValues: emptyComboValues,
  })

  const { fields, append } = useFieldArray({ control, name: "components" })
  const watchedComponents = useWatch({ control, name: "components" })
  const imageUrl = useWatch({ control, name: "image_url" })

  const selectedProductById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )

  function startEdit(combo: ComboCatalogDetails) {
    setSelectedImageFile(null)
    setEditingId(combo.id)
    reset(toFormValues(combo))
  }

  function cancelEdit() {
    setSelectedImageFile(null)
    setEditingId(null)
    reset(emptyComboValues)
  }

  const onSubmit = (values: ComboFormValues) => {
    startTransition(async () => {
      let uploadedImageUrl: string | undefined
      try {
        const imageResult = await resolveDeferredImageUpload({
          file: selectedImageFile,
          imageUrl: values.image_url,
          context: "product-images",
          uploadImage,
        })
        uploadedImageUrl = imageResult.uploadedUrl

        const payload: ComboFormValues = { ...values, image_url: imageResult.imageUrl ?? "" }
        const result = editingId
          ? await updateComboAction(editingId, payload)
          : await createComboAction(payload)

        if (!result.success) {
          await cleanupDeferredUploadedImage(uploadedImageUrl, deleteImage)
          toast.error(result.error || "No se pudo guardar el combo")
          return
        }

        toast.success(editingId ? "Combo actualizado" : "Combo creado")
        cancelEdit()
      } catch (error: any) {
        await cleanupDeferredUploadedImage(uploadedImageUrl, deleteImage)
        console.error("[Admin Combos] Error guardando combo:", error)
        toast.error(error.message || "Error al guardar el combo")
      }
    })
  }

  const columns: Column<ComboCatalogDetails>[] = [
    {
      key: "combo",
      header: "Combo",
      cell: (combo) => (
        <div className="flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-primary" />
          <span className="font-semibold">{combo.name}</span>
          <Badge variant={combo.isActive ? "default" : "secondary"}>
            {combo.isActive ? "Activo" : "Inactivo"}
          </Badge>
          {!combo.availability.isAvailable && <Badge variant="destructive">Sin stock</Badge>}
        </div>
      ),
    },
    {
      key: "price",
      header: "Precio",
      cell: (combo) => (
        <p className="text-sm text-muted-foreground">
          {formatPrice(combo.pricing.componentSubtotal.toString(), combo.pricing.currencyCode)} - descuento{" "}
          {formatPrice(combo.pricing.discountAmount.toString(), combo.pricing.currencyCode)} ={" "}
          <strong className="text-foreground">
            {formatPrice(combo.pricing.finalUnitPrice.toString(), combo.pricing.currencyCode)}
          </strong>
        </p>
      ),
    },
    {
      key: "components",
      header: "Componentes",
      cell: (combo) => (
        <ul className="text-sm text-muted-foreground">
          {combo.components.map((component) => (
            <li key={`${combo.id}-${component.productId}-${component.variantId || "base"}`}>
              {component.quantity}× {component.productName}
              {component.variantTitle ? ` · ${component.variantTitle}` : ""}
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Acciones</span>,
      className: "text-right",
      cell: (combo) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="outline" size="sm" onClick={() => startEdit(combo)}>
            Editar
          </Button>
          <DeleteComboButton comboId={combo.id} comboName={combo.name} />
        </div>
      ),
    },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Listado de combos</CardTitle>
          <CardDescription>
            {state === "ready" ? `${combos.length} combos configurados` : "Combos configurados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            rows={combos}
            state={state}
            emptyMessage="No hay combos aún."
            errorMessage="No se pudieron cargar los combos"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar combo" : "Nuevo combo"}</CardTitle>
          <CardDescription>El precio se calcula desde los componentes actuales.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" {...register("name")} />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="combo-cafe-premium" {...register("slug")} />
              <p className="text-xs text-muted-foreground">
                Se normaliza al guardar; por ejemplo, “combo test” queda como “combo-test”.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select
                    value={field.value || "__none"}
                    onValueChange={(value) => field.onChange(value === "__none" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Sin categoría</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" rows={3} {...register("description")} />
            </div>
            <DeferredImageUpload
              imageUrl={imageUrl || ""}
              selectedFile={selectedImageFile}
              onImageUrlChange={(nextImageUrl) => setValue("image_url", nextImageUrl)}
              onFileChange={setSelectedImageFile}
              onValidationError={(message) => toast.error(message)}
              label="Imagen del combo"
              maxSizeMB={1}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo descuento</Label>
                <Controller
                  control={control}
                  name="discount_type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentaje</SelectItem>
                        <SelectItem value="fixed_cop">Valor fijo COP</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_value">Valor</Label>
                <Input id="discount_value" type="number" min="0" {...register("discount_value")} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                )}
              />
              Activo para venta
            </label>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Componentes</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ product_id: "", variant_id: "", quantity: "1" })}
                >
                  Agregar
                </Button>
              </div>
              {fields.map((field, index) => {
                const component = watchedComponents?.[index]
                const selectedProduct = selectedProductById.get(component?.product_id || "")
                return (
                  <div key={field.id} className="space-y-2 rounded-md border p-3">
                    <Controller
                      control={control}
                      name={`components.${index}.product_id`}
                      render={({ field: productField }) => (
                        <Select
                          value={productField.value}
                          onValueChange={(value) => {
                            productField.onChange(value)
                            setValue(`components.${index}.variant_id`, "")
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.item_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <Controller
                      control={control}
                      name={`components.${index}.variant_id`}
                      render={({ field: variantField }) => (
                        <Select
                          value={variantField.value || "base"}
                          onValueChange={(value) => variantField.onChange(value === "base" ? "" : value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Producto base o variante" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="base">Producto base</SelectItem>
                            {(selectedProduct?.variants || []).map((variant) => (
                              <SelectItem key={variant.id} value={variant.id}>
                                {variant.variant_code || "Variante"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <Input
                      type="number"
                      min="1"
                      placeholder="Cantidad requerida"
                      {...register(`components.${index}.quantity`)}
                    />
                  </div>
                )
              })}
              <FieldError message={errors.components?.message} />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
