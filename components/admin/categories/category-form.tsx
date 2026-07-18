"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { CheckboxField } from "@/components/admin/checkbox-field"
import { ImageUpload } from "@/components/admin/image-upload"
import { SeoCard } from "@/components/admin/seo-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAdminActiveStoreId } from "@/contexts/admin-active-store-context"
import type { AdminActionResult } from "@/lib/admin/action-result"
import { categorySchema, type CategoryFormValues } from "@/lib/categories/schemas"
import {
  cleanupDeferredUploadedImage,
  resolveDeferredImageUpload,
} from "@/lib/products/deferred-image-upload"
import { MAX_PRODUCT_IMAGE_SIZE_MB, PRODUCT_IMAGES_UPLOAD_CONTEXT } from "@/lib/products/images"
import { deleteImage, uploadImage } from "@/lib/supabase/storage-api"
import { generateCategorySlug } from "@/lib/utils/category-slug"

const CATEGORIES_PATH = "/admin/products/categories"

type CategoryFormProps = {
  defaultValues: CategoryFormValues
  submitLabel: string
  pendingLabel: string
  successMessage: string
  onSubmit: (values: CategoryFormValues) => Promise<AdminActionResult>
}

export function CategoryForm({
  defaultValues,
  submitLabel,
  pendingLabel,
  successMessage,
  onSubmit,
}: CategoryFormProps) {
  const router = useRouter()
  const storeId = useAdminActiveStoreId()
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  })

  const imageUrl = useWatch({ control, name: "category_image_url" })

  const suggestSlugFromName = () => {
    const { category_name: name, slug } = getValues()
    if (slug.trim() || !name.trim()) return
    setValue("slug", generateCategorySlug(name))
  }

  const saveCategory = (values: CategoryFormValues) => {
    startTransition(async () => {
      let uploadedImageUrl: string | undefined
      try {
        const imageResult = await resolveDeferredImageUpload({
          file: selectedImageFile,
          imageUrl: values.category_image_url,
          storeId,
          context: PRODUCT_IMAGES_UPLOAD_CONTEXT,
          uploadImage,
        })
        uploadedImageUrl = imageResult.uploadedUrl

        const result = await onSubmit({
          ...values,
          category_image_url: imageResult.imageUrl ?? "",
        })

        if (!result.success) {
          await cleanupDeferredUploadedImage(uploadedImageUrl, deleteImage)
          toast.error(result.error || "No se pudo guardar la categoría")
          return
        }

        toast.success(successMessage)
        router.push(CATEGORIES_PATH)
      } catch (error) {
        await cleanupDeferredUploadedImage(uploadedImageUrl, deleteImage)
        console.error("[Admin Categorías] Error guardando categoría:", error)
        toast.error(error instanceof Error ? error.message : "Error al guardar la categoría")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de la categoría</CardTitle>
        <CardDescription>
          El slug define la URL pública de la categoría (/shop/&lt;slug&gt;); si lo cambias, los
          enlaces antiguos dejan de funcionar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(saveCategory)} className="space-y-4">
          <FormField id="category_name" label="Nombre *" error={errors.category_name?.message}>
            {(fieldProps) => (
              <Input {...fieldProps} {...register("category_name", { onBlur: suggestSlugFromName })} />
            )}
          </FormField>

          <FormField
            id="slug"
            label="Slug"
            hint="Se sugiere desde el nombre y se normaliza al guardar; por ejemplo, “Ropa Íntima” queda como “ropa-intima”."
          >
            {(fieldProps) => <Input {...fieldProps} placeholder="ropa-intima" {...register("slug")} />}
          </FormField>

          <FormField id="category_description" label="Descripción">
            {(fieldProps) => (
              <Textarea {...fieldProps} rows={3} {...register("category_description")} />
            )}
          </FormField>

          <ImageUpload
            value={imageUrl || ""}
            onChange={(nextImageUrl) => setValue("category_image_url", nextImageUrl)}
            onFileSelect={setSelectedImageFile}
            label="Imagen de la categoría"
            context={PRODUCT_IMAGES_UPLOAD_CONTEXT}
            maxSizeMB={MAX_PRODUCT_IMAGE_SIZE_MB}
            deferUpload
            allowUrlInput
          />

          <FormField id="display_order" label="Orden" hint="Menor número, aparece antes.">
            {(fieldProps) => (
              <Input {...fieldProps} type="number" min="0" {...register("display_order")} />
            )}
          </FormField>

          <CheckboxField control={control} name="is_active" label="Activa en la tienda" />

          <SeoCard
            register={register}
            description="Si lo dejas vacío se usa el nombre y la descripción de la categoría."
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button type="button" variant="outline" asChild>
              <Link href={CATEGORIES_PATH}>Cancelar</Link>
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
