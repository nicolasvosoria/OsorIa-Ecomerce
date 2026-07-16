"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { CheckboxField } from "@/components/admin/checkbox-field"
import { ImageUpload } from "@/components/admin/image-upload"
import { SeoCard } from "@/components/admin/seo-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useAdminActiveStoreId } from "@/contexts/admin-active-store-context"
import type { AdminActionResult } from "@/lib/admin/action-result"
import { comboSchema, type ComboFormValues } from "@/lib/combos/schemas"
import {
  cleanupDeferredUploadedImage,
  resolveDeferredImageUpload,
} from "@/lib/products/deferred-image-upload"
import { MAX_PRODUCT_IMAGE_SIZE_MB, PRODUCT_IMAGES_UPLOAD_CONTEXT } from "@/lib/products/images"
import { deleteImage, uploadImage } from "@/lib/supabase/storage-api"
import type { ItemCategory, StoreItemWithDetails } from "@/lib/types/products"

const COMBOS_PATH = "/admin/products/combos"
const NO_CATEGORY_VALUE = "__none"
const BASE_PRODUCT_VALUE = "base"

type ComboFormProps = {
  products: StoreItemWithDetails[]
  categories: ItemCategory[]
  defaultValues: ComboFormValues
  submitLabel: string
  pendingLabel: string
  successMessage: string
  onSubmit: (values: ComboFormValues) => Promise<AdminActionResult>
}

export function ComboForm({
  products,
  categories,
  defaultValues,
  submitLabel,
  pendingLabel,
  successMessage,
  onSubmit,
}: ComboFormProps) {
  const router = useRouter()
  const storeId = useAdminActiveStoreId()
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ComboFormValues>({
    resolver: zodResolver(comboSchema),
    defaultValues,
  })

  const imageUrl = useWatch({ control, name: "image_url" })

  const saveCombo = (values: ComboFormValues) => {
    startTransition(async () => {
      let uploadedImageUrl: string | undefined
      try {
        const imageResult = await resolveDeferredImageUpload({
          file: selectedImageFile,
          imageUrl: values.image_url,
          storeId,
          context: PRODUCT_IMAGES_UPLOAD_CONTEXT,
          uploadImage,
        })
        uploadedImageUrl = imageResult.uploadedUrl

        const result = await onSubmit({ ...values, image_url: imageResult.imageUrl ?? "" })

        if (!result.success) {
          await cleanupDeferredUploadedImage(uploadedImageUrl, deleteImage)
          toast.error(result.error || "No se pudo guardar el combo")
          return
        }

        toast.success(successMessage)
        router.push(COMBOS_PATH)
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
        <CardTitle>Datos del combo</CardTitle>
        <CardDescription>El precio se calcula desde los componentes actuales.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(saveCombo)} className="space-y-4">
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
                    <SelectTrigger {...fieldProps} className="w-full">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent className="editor-chrome">
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

          <div className="grid gap-4 md:grid-cols-2">
            <FormField id="discount_type" label="Tipo descuento">
              {(fieldProps) => (
                <Controller
                  control={control}
                  name="discount_type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger {...fieldProps} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="editor-chrome">
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

          <CheckboxField control={control} name="is_active" label="Activo para venta" />

          <ComboComponentsField control={control} products={products} setValue={setValue} />
          <FieldError message={errors.components?.message} />

          <SeoCard
            register={register}
            description="Si lo dejas vacío se usa el nombre y la descripción del combo."
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button type="button" variant="outline" asChild>
              <Link href={COMBOS_PATH}>Cancelar</Link>
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {pendingLabel}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {submitLabel}
                </>
              )}
            </Button>
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
    <div className="space-y-2">
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
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Producto" />
                  </SelectTrigger>
                  <SelectContent className="editor-chrome">
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
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Producto base o variante" />
                  </SelectTrigger>
                  <SelectContent className="editor-chrome">
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
