"use client"

import { useMemo, useState, useTransition } from "react"
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { ImageUpload } from "@/components/admin/image-upload"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { FieldError } from "@/components/ui/field-error"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { emptyComboFormValues, toComboFormValues } from "@/lib/combos/form-values"
import { comboSchema, type ComboFormValues } from "@/lib/combos/schemas"
import type { ComboCatalogDetails } from "@/lib/combos/types"
import {
  cleanupDeferredUploadedImage,
  resolveDeferredImageUpload,
} from "@/lib/products/deferred-image-upload"
import { MAX_PRODUCT_IMAGE_SIZE_MB, PRODUCT_IMAGES_UPLOAD_CONTEXT } from "@/lib/products/images"
import { deleteImage, uploadImage } from "@/lib/supabase/storage-api"
import type { ItemCategory, StoreItemWithDetails } from "@/lib/types/products"
import { createComboAction, updateComboAction } from "../actions"

const NO_CATEGORY_VALUE = "__none"
const BASE_PRODUCT_VALUE = "base"

type ComboFormProps = {
  editingCombo: ComboCatalogDetails | null
  products: StoreItemWithDetails[]
  categories: ItemCategory[]
  onFinished: () => void
}

export function ComboForm({ editingCombo, products, categories, onFinished }: ComboFormProps) {
  const defaultValues = editingCombo ? toComboFormValues(editingCombo) : emptyComboFormValues
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
    defaultValues,
  })

  const imageUrl = useWatch({ control, name: "image_url" })

  const finish = () => {
    setSelectedImageFile(null)
    reset(emptyComboFormValues)
    onFinished()
  }

  const onSubmit = (values: ComboFormValues) => {
    startTransition(async () => {
      let uploadedImageUrl: string | undefined
      try {
        const imageResult = await resolveDeferredImageUpload({
          file: selectedImageFile,
          imageUrl: values.image_url,
          context: PRODUCT_IMAGES_UPLOAD_CONTEXT,
          uploadImage,
        })
        uploadedImageUrl = imageResult.uploadedUrl

        const payload: ComboFormValues = { ...values, image_url: imageResult.imageUrl ?? "" }
        const result = editingCombo
          ? await updateComboAction(editingCombo.id, payload)
          : await createComboAction(payload)

        if (!result.success) {
          await cleanupDeferredUploadedImage(uploadedImageUrl, deleteImage)
          toast.error(result.error || "No se pudo guardar el combo")
          return
        }

        toast.success(editingCombo ? "Combo actualizado" : "Combo creado")
        finish()
      } catch (error) {
        await cleanupDeferredUploadedImage(uploadedImageUrl, deleteImage)
        console.error("[Admin Combos] Error guardando combo:", error)
        toast.error(error instanceof Error ? error.message : "Error al guardar el combo")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingCombo ? "Editar combo" : "Nuevo combo"}</CardTitle>
        <CardDescription>El precio se calcula desde los componentes actuales.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField id="name" label="Nombre *" error={errors.name?.message}>
            {(fieldProps) => <Input {...fieldProps} {...register("name")} />}
          </FormField>

          <FormField
            id="slug"
            label="Slug"
            hint="Se normaliza al guardar; por ejemplo, “combo test” queda como “combo-test”."
          >
            {(fieldProps) => (
              <Input {...fieldProps} placeholder="combo-cafe-premium" {...register("slug")} />
            )}
          </FormField>

          <FormField id="category_id" label="Categoría">
            {(fieldProps) => (
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select
                    value={field.value || NO_CATEGORY_VALUE}
                    onValueChange={(value) =>
                      field.onChange(value === NO_CATEGORY_VALUE ? "" : value)
                    }
                  >
                    <SelectTrigger {...fieldProps}>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY_VALUE}>Sin categoría</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>

          <FormField id="description" label="Descripción">
            {(fieldProps) => <Textarea {...fieldProps} rows={3} {...register("description")} />}
          </FormField>

          <ImageUpload
            value={imageUrl || ""}
            onChange={(nextImageUrl) => setValue("image_url", nextImageUrl)}
            onFileSelect={setSelectedImageFile}
            label="Imagen del combo"
            context={PRODUCT_IMAGES_UPLOAD_CONTEXT}
            maxSizeMB={MAX_PRODUCT_IMAGE_SIZE_MB}
            deferUpload
            allowUrlInput
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField id="discount_type" label="Tipo descuento">
              {(fieldProps) => (
                <Controller
                  control={control}
                  name="discount_type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger {...fieldProps}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentaje</SelectItem>
                        <SelectItem value="fixed_cop">Valor fijo COP</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FormField>

            <FormField id="discount_value" label="Valor">
              {(fieldProps) => (
                <Input {...fieldProps} type="number" min="0" {...register("discount_value")} />
              )}
            </FormField>
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

          <ComboComponentsField control={control} products={products} setValue={setValue} />
          <FieldError message={errors.components?.message} />

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar
            </Button>
            {editingCombo && (
              <Button type="button" variant="outline" onClick={finish}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function ComboComponentsField({
  control,
  products,
  setValue,
}: {
  control: Control<ComboFormValues>
  products: StoreItemWithDetails[]
  setValue: (name: `components.${number}.variant_id`, value: string) => void
}) {
  const { fields, append } = useFieldArray({ control, name: "components" })
  const watchedComponents = useWatch({ control, name: "components" })

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )

  return (
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
        const selectedProduct = productById.get(watchedComponents?.[index]?.product_id || "")

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
                  value={variantField.value || BASE_PRODUCT_VALUE}
                  onValueChange={(value) =>
                    variantField.onChange(value === BASE_PRODUCT_VALUE ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Producto base o variante" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BASE_PRODUCT_VALUE}>Producto base</SelectItem>
                    {(selectedProduct?.variants || []).map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.variant_code || "Variante"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Controller
              control={control}
              name={`components.${index}.quantity`}
              render={({ field: quantityField }) => (
                <Input
                  {...quantityField}
                  type="number"
                  min="1"
                  placeholder="Cantidad requerida"
                  aria-label={`Cantidad del componente ${index + 1}`}
                />
              )}
            />
          </div>
        )
      })}
    </div>
  )
}
