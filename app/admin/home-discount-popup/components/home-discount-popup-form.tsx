"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Percent, Save } from "lucide-react"
import { toast } from "sonner"

import { ImageUpload } from "@/components/admin/image-upload"
import { HomeDiscountPopupPreview } from "@/components/home-discount-popup"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  homeDiscountPopupFormSchema,
  normalizeHomeDiscountPopupConfig,
  parseDateTimeLocalValue,
  toDateTimeLocalValue,
  validateHomeDiscountPopupAdminStatus,
  type HomeDiscountPopupAdminIssue,
  type HomeDiscountPopupCtaMode,
  type HomeDiscountPopupFormValues,
} from "@/lib/home-discount-popup"
import { deferStateUpdate } from "@/lib/react/defer-state-update"
import { getAdminRequestHeaders } from "@/lib/supabase/admin-request-headers"
import { saveHomeDiscountPopupConfigAction } from "../actions"

const SAVE_ERROR_MESSAGE = "No se pudo guardar el popup"
const UPLOAD_ERROR_MESSAGE = "No se pudo subir la imagen del popup"

type PopupFormFields = {
  register: UseFormRegister<HomeDiscountPopupFormValues>
  control: Control<HomeDiscountPopupFormValues>
  errors: FieldErrors<HomeDiscountPopupFormValues>
}

export function HomeDiscountPopupForm({
  defaultValues,
}: {
  defaultValues: HomeDiscountPopupFormValues
}) {
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [isPreviewVisible, setIsPreviewVisible] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HomeDiscountPopupFormValues>({
    resolver: zodResolver(homeDiscountPopupFormSchema),
    defaultValues,
  })

  const config = useWatch({ control })

  useEffect(() => {
    let isActive = true

    if (!pendingImageFile) {
      deferStateUpdate(() => {
        if (isActive) {
          setPreviewImageUrl(null)
        }
      })
      return () => {
        isActive = false
      }
    }

    const objectUrl = URL.createObjectURL(pendingImageFile)
    deferStateUpdate(() => {
      if (isActive) {
        setPreviewImageUrl(objectUrl)
      }
    })

    return () => {
      isActive = false
      URL.revokeObjectURL(objectUrl)
    }
  }, [pendingImageFile])

  const onSubmit = async (values: HomeDiscountPopupFormValues) => {
    try {
      const imageUrl = pendingImageFile
        ? await uploadPopupImage(pendingImageFile)
        : values.imageUrl
      const normalizedConfig = normalizeHomeDiscountPopupConfig({ ...values, imageUrl })

      const result = await saveHomeDiscountPopupConfigAction(normalizedConfig)
      if (!result.success) {
        throw new Error(result.error || SAVE_ERROR_MESSAGE)
      }

      reset(normalizedConfig)
      setPendingImageFile(null)
      setIsPreviewVisible(false)
      toast.success("Popup promocional guardado")
    } catch (error) {
      console.error("[Home Discount Popup Admin] Error al guardar:", error)
      toast.error(error instanceof Error ? error.message : SAVE_ERROR_MESSAGE)
    }
  }

  const normalizedConfig = normalizeHomeDiscountPopupConfig(config)
  const previewConfig = {
    ...normalizedConfig,
    imageUrl: previewImageUrl ?? normalizedConfig.imageUrl,
    fingerprint: "admin-preview",
  }
  const adminStatus = validateHomeDiscountPopupAdminStatus(normalizedConfig)

  return (
    <>
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-6">
        {normalizedConfig.active && !adminStatus.publishable ? (
          <UnpublishableAlert issues={adminStatus.issues} />
        ) : null}

        <ContentCard
          register={register}
          control={control}
          errors={errors}
          hasPendingImage={Boolean(pendingImageFile)}
          onImageFileSelect={setPendingImageFile}
        />
        <BehaviorCard register={register} control={control} errors={errors} />

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard">Cancelar</Link>
          </Button>
          <Button variant="outline" type="button" onClick={() => setIsPreviewVisible(true)}>
            Vista previa
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar popup
          </Button>
        </div>
      </form>

      {isPreviewVisible ? (
        <HomeDiscountPopupPreview
          config={previewConfig}
          onDismiss={() => setIsPreviewVisible(false)}
        />
      ) : null}
    </>
  )
}

// La imagen sube por su propio route handler (bucket marketing-assets con
// service client), no por el server action ni por storage-api.
async function uploadPopupImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)

  const adminHeaders = await getAdminRequestHeaders()
  const authHeaders = Object.fromEntries(
    Object.entries(adminHeaders).filter(
      ([header]) => header.toLowerCase() !== "content-type",
    ),
  )
  const response = await fetch("/api/admin/home-discount-popup/upload", {
    method: "POST",
    headers: authHeaders,
    body: formData,
  })
  const data = await response.json().catch(() => null)

  if (!response.ok || typeof data?.url !== "string") {
    throw new Error(data?.error || UPLOAD_ERROR_MESSAGE)
  }

  return data.url
}

function UnpublishableAlert({ issues }: { issues: HomeDiscountPopupAdminIssue[] }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
    >
      <p className="font-semibold">
        La promo activa no se publicará hasta corregir la configuración.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {issues.map((issue) => (
          <li key={issue.code}>
            <span>{issue.message}</span>
            <span> {issue.action}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ContentCard({
  register,
  control,
  errors,
  hasPendingImage,
  onImageFileSelect,
}: PopupFormFields & {
  hasPendingImage: boolean
  onImageFileSelect: (file: File | null) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Estado y contenido
        </CardTitle>
        <CardDescription>
          El popup solo se publica en home y respeta la ventana de validez y frecuencia.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-xl border p-4">
          <div>
            <p className="font-medium text-foreground">Popup activo</p>
            <p className="text-sm text-muted-foreground">
              Desactivalo para dejar de mostrarlo sin borrar la configuración.
            </p>
          </div>
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label="Activar popup"
              />
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="title" label="Titulo" error={errors.title?.message}>
            {(field) => <Input {...field} {...register("title")} />}
          </FormField>
          <FormField id="ctaText" label="Texto del CTA" error={errors.ctaText?.message}>
            {(field) => <Input {...field} {...register("ctaText")} />}
          </FormField>
        </div>

        <FormField id="text" label="Mensaje principal" error={errors.text?.message}>
          {(field) => <Textarea {...field} {...register("text")} />}
        </FormField>

        <div className="grid gap-4 md:grid-cols-2">
          {/* ImageUpload es un widget compuesto que rotula su propio control, así
              que aquí el error va suelto como en ImagesCard y no dentro de un
              FormField: su <Label htmlFor> no tendría a qué apuntar. */}
          <div className="space-y-2">
            <Controller
              control={control}
              name="imageUrl"
              render={({ field }) => (
                <ImageUpload
                  value={field.value ?? ""}
                  onChange={(url) => field.onChange(url || null)}
                  onFileSelect={onImageFileSelect}
                  label="Imagen"
                  deferUpload
                  recommendedSize={{ width: 1200, height: 900 }}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              {hasPendingImage
                ? "Hay una nueva imagen pendiente. Se sube recien al guardar."
                : "La imagen se publica en Supabase Storage cuando guardas la configuracion."}
            </p>
            <FieldError message={errors.imageUrl?.message} />
          </div>
          <FormField
            id="coupon"
            label="Cupon"
            hint="Necesario cuando el CTA copia el codigo."
            error={errors.coupon?.message}
          >
            {(field) => <Input {...field} {...register("coupon")} />}
          </FormField>
        </div>
      </CardContent>
    </Card>
  )
}

function BehaviorCard({ register, control, errors }: PopupFormFields) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comportamiento</CardTitle>
        <CardDescription>
          Define si el CTA redirige o copia el cupon, y controla delay, cooldown y visibilidad.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="ctaMode" label="Modo del CTA" error={errors.ctaMode?.message}>
            {(field) => (
              <Controller
                control={control}
                name="ctaMode"
                render={({ field: ctaMode }) => (
                  <Select
                    value={ctaMode.value}
                    onValueChange={(value: HomeDiscountPopupCtaMode) => ctaMode.onChange(value)}
                  >
                    <SelectTrigger {...field}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="editor-chrome">
                      <SelectItem value="copy_coupon">Copiar cupon</SelectItem>
                      <SelectItem value="redirect">Redireccionar a URL</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>
          <FormField
            id="ctaUrl"
            label="URL del CTA"
            hint="Solo se usa cuando el modo es redireccion. Requiere URL absoluta HTTPS."
            error={errors.ctaUrl?.message}
          >
            {(field) => (
              <Controller
                control={control}
                name="ctaUrl"
                render={({ field: ctaUrl }) => (
                  <Input
                    {...field}
                    value={ctaUrl.value ?? ""}
                    onChange={(event) => ctaUrl.onChange(event.target.value || null)}
                  />
                )}
              />
            )}
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            id="delaySeconds"
            label="Delay inicial (segundos)"
            error={errors.delaySeconds?.message}
          >
            {(field) => (
              <Input
                {...field}
                type="number"
                min={3}
                max={5}
                {...register("delaySeconds", { valueAsNumber: true })}
              />
            )}
          </FormField>
          <FormField
            id="frequencyHours"
            label="Frecuencia (horas)"
            error={errors.frequencyHours?.message}
          >
            {(field) => (
              <Input
                {...field}
                type="number"
                {...register("frequencyHours", { valueAsNumber: true })}
              />
            )}
          </FormField>
          <FormField
            id="visibleDurationSeconds"
            label="Duracion visible (segundos)"
            error={errors.visibleDurationSeconds?.message}
          >
            {(field) => (
              <Input
                {...field}
                type="number"
                min={5}
                max={120}
                {...register("visibleDurationSeconds", { valueAsNumber: true })}
              />
            )}
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="startsAt" label="Vigencia desde" error={errors.startsAt?.message}>
            {(field) => (
              <Controller
                control={control}
                name="startsAt"
                render={({ field: startsAt }) => (
                  <Input
                    {...field}
                    type="datetime-local"
                    value={toDateTimeLocalValue(startsAt.value)}
                    onChange={(event) =>
                      startsAt.onChange(parseDateTimeLocalValue(event.target.value))
                    }
                  />
                )}
              />
            )}
          </FormField>
          <FormField id="endsAt" label="Vigencia hasta" error={errors.endsAt?.message}>
            {(field) => (
              <Controller
                control={control}
                name="endsAt"
                render={({ field: endsAt }) => (
                  <Input
                    {...field}
                    type="datetime-local"
                    value={toDateTimeLocalValue(endsAt.value)}
                    onChange={(event) =>
                      endsAt.onChange(parseDateTimeLocalValue(event.target.value))
                    }
                  />
                )}
              />
            )}
          </FormField>
        </div>
      </CardContent>
    </Card>
  )
}
