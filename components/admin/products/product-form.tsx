"use client"

import { useRef, useState, type ComponentProps } from "react"
import Link from "next/link"
import { Controller, useForm, useWatch, type UseFormReturn } from "react-hook-form"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { translations } from "@/lib/i18n/translations"
import {
  MAX_PRODUCT_IMAGE_SIZE_MB,
  MAX_PRODUCT_IMAGES,
  PRODUCT_IMAGES_UPLOAD_CONTEXT,
} from "@/lib/products/images"
import { getAdminCompareAtPriceNotice } from "@/lib/products/pricing"
import { productSchema, type ProductFormValues } from "@/lib/products/schemas"
import type { ItemCategory } from "@/lib/types/products"

const PRODUCTS_PATH = "/admin/products"
const SUBMIT_ACTION_FIELD = "productSubmitAction"
// The admin console has no runtime language switch (D31 still applies to new copy,
// but no /admin/* screen consumes useLanguage()): a static read, like sibling slice
// S2's ShippingModeForm, avoids requiring every ProductForm consumer to wrap in a
// LanguageProvider it never otherwise needs.
const copy = translations.es.products

type ProductFormHandle = {
  resetToDefaults: () => void
}

type ProductFormSubmitAction = {
  label: string
  pendingLabel: string
  variant?: ComponentProps<typeof Button>["variant"]
  onSubmit: (values: ProductFormValues, form: ProductFormHandle) => Promise<void>
}

type ProductFormProps = {
  categories: ItemCategory[]
  defaultValues: ProductFormValues
  submitActions: ProductFormSubmitAction[]
}

export function ProductForm({ categories, defaultValues, submitActions }: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  })
  const submitLockRef = useRef(false)
  const [imageResetToken, setImageResetToken] = useState(0)

  const basePrice = useWatch({ control: form.control, name: "base_price" })
  const compareAtPrice = useWatch({
    control: form.control,
    name: "compare_at_price",
  })
  const compareAtPriceNotice = getAdminCompareAtPriceNotice(basePrice, compareAtPrice)

  const runSubmittedAction = async (
    values: ProductFormValues,
    event?: React.BaseSyntheticEvent,
  ) => {
    if (submitLockRef.current) return
    const action = submitActions[submittedActionIndex(event)] ?? submitActions[0]

    if (values.compare_at_price && compareAtPriceNotice) {
      toast.warning(compareAtPriceNotice)
    }

    submitLockRef.current = true
    try {
      await action.onSubmit(values, {
        resetToDefaults: () => {
          form.reset(defaultValues)
          setImageResetToken((token) => token + 1)
        },
      })
    } finally {
      submitLockRef.current = false
    }
  }

  return (
    <form
      onSubmit={(event) => void form.handleSubmit(runSubmittedAction)(event)}
      className="space-y-6"
    >
      <BasicInfoCard form={form} categories={categories} />
      <ImagesCard form={form} resetToken={imageResetToken} />
      <PricingCard form={form} compareAtPriceNotice={compareAtPriceNotice} />
      <ShippingCard form={form} />
      <InventoryCard form={form} />
      <StatusCard form={form} />
      <ProductSeoCard form={form} />
      <SubmitActions actions={submitActions} isSubmitting={form.formState.isSubmitting} />
    </form>
  )
}

function BasicInfoCard({
  form,
  categories,
}: {
  form: UseFormReturn<ProductFormValues>
  categories: ItemCategory[]
}) {
  const { register, control, formState } = form

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información Básica</CardTitle>
        <CardDescription>Datos principales del producto</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          id="item_name"
          label="Nombre del Producto *"
          error={formState.errors.item_name?.message}
        >
          {(fieldProps) => (
            <Input
              {...fieldProps}
              placeholder="Ej: Auriculares Inalámbricos Premium"
              {...register("item_name")}
            />
          )}
        </FormField>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="item_code" label="Código del Producto">
            {(fieldProps) => (
              <Input {...fieldProps} placeholder="SKU-001" {...register("item_code")} />
            )}
          </FormField>

          <FormField id="category_id" label="Categoría">
            {(fieldProps) => (
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger {...fieldProps} className="w-full">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent className="editor-chrome">
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
            )}
          </FormField>
        </div>

        <FormField id="item_description" label="Descripción">
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              placeholder="Descripción del producto..."
              rows={6}
              {...register("item_description")}
            />
          )}
        </FormField>

        <FormField
          id="ai_details"
          label="Detalles y Características para el Asistente Virtual"
          hint="Información detallada sobre características, especificaciones técnicas, materiales, compatibilidad, etc. Esta información será utilizada por el asistente virtual para responder preguntas específicas sobre el producto."
        >
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              placeholder="Ej: Material: Aluminio anodizado. Dimensiones: 15x10x5 cm. Peso: 250g. Incluye: Cable USB-C, manual de usuario. Garantía: 2 años. Compatible con: iOS 12+, Android 8+..."
              rows={6}
              className="font-mono text-sm"
              {...register("ai_details")}
            />
          )}
        </FormField>
      </CardContent>
    </Card>
  )
}

function PricingCard({
  form,
  compareAtPriceNotice,
}: {
  form: UseFormReturn<ProductFormValues>
  compareAtPriceNotice: string | null
}) {
  const { register, control, formState } = form

  return (
    <Card>
      <CardHeader>
        <CardTitle>Precios</CardTitle>
        <CardDescription>
          El precio de venta actual es el que paga el cliente. El precio anterior solo se muestra
          tachado si es mayor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            id="base_price"
            label="Precio base / venta actual *"
            error={formState.errors.base_price?.message}
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("base_price")}
              />
            )}
          </FormField>

          <FormField
            id="compare_at_price"
            label="Precio anterior / precio de comparación"
            hint={
              compareAtPriceNotice ? undefined : "Déjalo vacío si el producto no tiene descuento."
            }
            error={compareAtPriceNotice ?? undefined}
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("compare_at_price")}
              />
            )}
          </FormField>

          <FormField id="currency_code" label="Moneda">
            {(fieldProps) => (
              <Controller
                control={control}
                name="currency_code"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger {...fieldProps} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="editor-chrome">
                      <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                      <SelectItem value="USD">USD - Dólar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>
        </div>
      </CardContent>
    </Card>
  )
}

function ShippingCard({ form }: { form: UseFormReturn<ProductFormValues> }) {
  const { register, formState } = form

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.weightSectionTitle}</CardTitle>
        <CardDescription>{copy.weightSectionDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <FormField
          id="weight_grams"
          label={copy.weightLabel}
          error={formState.errors.weight_grams?.message}
        >
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="number"
              step="1"
              min="0"
              placeholder="0"
              {...register("weight_grams")}
            />
          )}
        </FormField>
      </CardContent>
    </Card>
  )
}

function InventoryCard({ form }: { form: UseFormReturn<ProductFormValues> }) {
  const { register, control, formState } = form
  const trackInventory = useWatch({ control, name: "track_inventory" })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventario</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CheckboxField control={control} name="track_inventory" label="Rastrear inventario" />

        {trackInventory && (
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id="inventory_quantity"
              label="Cantidad en Stock"
              error={formState.errors.inventory_quantity?.message}
            >
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="number"
                  min="0"
                  placeholder="0"
                  {...register("inventory_quantity")}
                />
              )}
            </FormField>

            <FormField
              id="low_stock_threshold"
              label="Umbral de Stock Bajo"
              hint="Se enviará una alerta cuando el stock esté por debajo de este valor"
            >
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="number"
                  min="0"
                  placeholder="10"
                  {...register("low_stock_threshold")}
                />
              )}
            </FormField>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProductSeoCard({ form }: { form: UseFormReturn<ProductFormValues> }) {
  const { register } = form

  return (
    <SeoCard register={register}>
      <FormField id="tags" label="Etiquetas (separadas por comas)">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            placeholder="etiqueta1, etiqueta2, etiqueta3"
            {...register("tags")}
          />
        )}
      </FormField>
    </SeoCard>
  )
}

function ImagesCard({
  form,
  resetToken,
}: {
  form: UseFormReturn<ProductFormValues>
  resetToken: number
}) {
  const { control, setValue, formState } = form
  const images = useWatch({ control, name: "images" })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Imágenes del Producto</CardTitle>
        <CardDescription>
          Máximo {MAX_PRODUCT_IMAGES} imágenes. Cada imagen debe pesar {MAX_PRODUCT_IMAGE_SIZE_MB}{" "}
          MB o menos. La primera imagen será la imagen principal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ImageUpload
          multiple
          values={images}
          onChange={(next) =>
            setValue("images", next, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          maxImages={MAX_PRODUCT_IMAGES}
          maxSizeMB={MAX_PRODUCT_IMAGE_SIZE_MB}
          context={PRODUCT_IMAGES_UPLOAD_CONTEXT}
          label="Imágenes del Producto"
          resetToken={resetToken}
        />
        <FieldError message={formState.errors.images?.message} />
      </CardContent>
    </Card>
  )
}

function StatusCard({ form }: { form: UseFormReturn<ProductFormValues> }) {
  const { register, control } = form

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado y Configuración</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CheckboxField control={control} name="is_active" label="Producto activo" />
        <CheckboxField control={control} name="is_featured" label="Producto destacado" />
        <CheckboxField
          control={control}
          name="is_available_for_sale"
          label="Disponible para venta"
        />

        <FormField id="display_order" label="Orden de Visualización">
          {(fieldProps) => (
            <Input {...fieldProps} type="number" min="0" {...register("display_order")} />
          )}
        </FormField>
      </CardContent>
    </Card>
  )
}

function SubmitActions({
  actions,
  isSubmitting,
}: {
  actions: ProductFormSubmitAction[]
  isSubmitting: boolean
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
      <Button type="button" variant="outline" asChild>
        <Link href={PRODUCTS_PATH}>Cancelar</Link>
      </Button>
      {actions.map((action, index) => (
        <Button
          key={action.label}
          type="submit"
          name={SUBMIT_ACTION_FIELD}
          value={index}
          variant={action.variant}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {action.pendingLabel}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {action.label}
            </>
          )}
        </Button>
      ))}
    </div>
  )
}

function submittedActionIndex(event?: React.BaseSyntheticEvent): number {
  const submitter = (event?.nativeEvent as SubmitEvent | undefined)?.submitter
  if (!(submitter instanceof HTMLButtonElement) || submitter.name !== SUBMIT_ACTION_FIELD) {
    return 0
  }

  const index = Number.parseInt(submitter.value, 10)
  return Number.isNaN(index) ? 0 : index
}
