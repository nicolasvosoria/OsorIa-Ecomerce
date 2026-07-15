"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Percent, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/admin/image-upload";
import { HomeDiscountPopupPreview } from "@/components/home-discount-popup";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdminPermissions } from "@/contexts/admin-permissions-context";
import { deferStateUpdate } from "@/lib/react/defer-state-update";
import {
  homeDiscountPopupFormSchema,
  normalizeHomeDiscountPopupConfig,
  parseDateTimeLocalValue,
  validateHomeDiscountPopupAdminStatus,
  type HomeDiscountPopupCtaMode,
  type HomeDiscountPopupFormValues,
  toDateTimeLocalValue,
} from "@/lib/home-discount-popup";
import { getAdminRequestHeaders } from "@/lib/supabase/admin-request-headers";
import { FieldError } from "@/components/admin/field-error";

function PopupField({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const defaultFormValues: HomeDiscountPopupFormValues =
  normalizeHomeDiscountPopupConfig({});

export default function HomeDiscountPopupConfigPage() {
  const { isAdmin } = useAdminPermissions();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<HomeDiscountPopupFormValues>({
    resolver: zodResolver(homeDiscountPopupFormSchema),
    defaultValues: defaultFormValues,
  });

  const config = useWatch({ control });

  useEffect(() => {
    const loadConfig = async () => {
      if (!isAdmin) {
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch("/api/home-discount-popup-config", {
          headers: await getAdminRequestHeaders(),
        });
        if (!response.ok) {
          throw new Error("No se pudo cargar la configuración");
        }

        const data = await response.json();
        reset(normalizeHomeDiscountPopupConfig(data.config));
        setPendingImageFile(null);
      } catch (error) {
        console.error("[Home Discount Popup Admin] Error al cargar:", error);
        toast.error("No se pudo cargar la configuración del popup");
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdmin) {
      loadConfig();
    }
  }, [isAdmin, reset]);

  useEffect(() => {
    let isActive = true;

    if (!pendingImageFile) {
      deferStateUpdate(() => {
        if (isActive) {
          setPreviewImageUrl(null);
        }
      });
      return () => {
        isActive = false;
      };
    }

    const objectUrl = URL.createObjectURL(pendingImageFile);
    deferStateUpdate(() => {
      if (isActive) {
        setPreviewImageUrl(objectUrl);
      }
    });

    return () => {
      isActive = false;
      URL.revokeObjectURL(objectUrl);
    };
  }, [pendingImageFile]);

  const onSubmit = async (values: HomeDiscountPopupFormValues) => {
    setIsSaving(true);
    try {
      const nextConfig = { ...values };

      if (pendingImageFile) {
        const formData = new FormData();
        formData.append("file", pendingImageFile);

        const adminHeaders = await getAdminRequestHeaders();
        const authHeaders = Object.fromEntries(
          Object.entries(adminHeaders).filter(
            ([header]) => header.toLowerCase() !== "content-type",
          ),
        );
        const uploadResponse = await fetch(
          "/api/admin/home-discount-popup/upload",
          {
            method: "POST",
            headers: authHeaders,
            body: formData,
          },
        );
        const uploadData = await uploadResponse.json().catch(() => null);

        if (!uploadResponse.ok || typeof uploadData?.url !== "string") {
          throw new Error(
            uploadData?.error || "No se pudo subir la imagen del popup",
          );
        }

        nextConfig.imageUrl = uploadData.url;
      }

      const normalizedConfig = normalizeHomeDiscountPopupConfig(nextConfig);
      const response = await fetch("/api/home-discount-popup-config", {
        method: "POST",
        headers: await getAdminRequestHeaders(),
        body: JSON.stringify({ config: normalizedConfig }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo guardar la configuración");
      }

      reset(normalizedConfig);
      setPendingImageFile(null);
      setIsPreviewVisible(false);
      toast.success("Popup promocional guardado");
    } catch (error) {
      console.error("[Home Discount Popup Admin] Error al guardar:", error);
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar el popup",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const normalizedConfig = normalizeHomeDiscountPopupConfig(config);
  const previewConfig = {
    ...normalizedConfig,
    imageUrl: previewImageUrl ?? normalizedConfig.imageUrl,
    fingerprint: "admin-preview",
  };
  const adminStatus = validateHomeDiscountPopupAdminStatus(normalizedConfig);

  return (
    <div className="max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">
              Popup de descuento en home
            </h1>
            <p className="text-sm text-muted-foreground">
              Configura una sola promo flotante para la portada de la tienda.
            </p>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-6">
          {normalizedConfig.active && !adminStatus.publishable ? (
            <div
              role="alert"
              className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
            >
              <p className="font-semibold">
                La promo activa no se publicará hasta corregir la
                configuración.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {adminStatus.issues.map((issue) => (
                  <li key={issue.code}>
                    <span>{issue.message}</span>
                    <span> {issue.action}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Estado y contenido
              </CardTitle>
              <CardDescription>
                El popup solo se publica en home y respeta la ventana de
                validez y frecuencia.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="font-medium text-foreground">Popup activo</p>
                  <p className="text-sm text-muted-foreground">
                    Desactivalo para dejar de mostrarlo sin borrar la
                    configuración.
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
                <PopupField id="title" label="Titulo">
                  <Input id="title" {...register("title")} />
                </PopupField>
                <PopupField id="ctaText" label="Texto del CTA">
                  <Input id="ctaText" {...register("ctaText")} />
                </PopupField>
              </div>

              <PopupField id="text" label="Mensaje principal">
                <Textarea id="text" {...register("text")} />
              </PopupField>

              <div className="grid gap-4 md:grid-cols-2">
                <PopupField
                  id="imageUrl"
                  label="Imagen"
                  hint={
                    pendingImageFile
                      ? "Hay una nueva imagen pendiente. Se sube recien al guardar."
                      : "La imagen se publica en Supabase Storage cuando guardas la configuracion."
                  }
                >
                  <Controller
                    control={control}
                    name="imageUrl"
                    render={({ field }) => (
                      <ImageUpload
                        value={field.value ?? ""}
                        onChange={(url) => field.onChange(url || null)}
                        onFileSelect={setPendingImageFile}
                        label=""
                        context="home-discount-popup"
                        deferUpload
                        skipStorageDelete
                        recommendedWidth={1200}
                        recommendedHeight={900}
                        fileTypes={["PNG", "JPG", "WEBP", "GIF"]}
                      />
                    )}
                  />
                </PopupField>
                <PopupField
                  id="coupon"
                  label="Cupon"
                  hint="Necesario cuando el CTA copia el codigo."
                >
                  <Input id="coupon" {...register("coupon")} />
                </PopupField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comportamiento</CardTitle>
              <CardDescription>
                Define si el CTA redirige o copia el cupon, y controla delay,
                cooldown y visibilidad.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <PopupField id="ctaMode" label="Modo del CTA">
                  <Controller
                    control={control}
                    name="ctaMode"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value: HomeDiscountPopupCtaMode) =>
                          field.onChange(value)
                        }
                      >
                        <SelectTrigger id="ctaMode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="copy_coupon">
                            Copiar cupon
                          </SelectItem>
                          <SelectItem value="redirect">
                            Redireccionar a URL
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </PopupField>
                <PopupField
                  id="ctaUrl"
                  label="URL del CTA"
                  hint="Solo se usa cuando el modo es redireccion. Requiere URL absoluta HTTPS."
                >
                  <Controller
                    control={control}
                    name="ctaUrl"
                    render={({ field }) => (
                      <Input
                        id="ctaUrl"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(event.target.value || null)
                        }
                      />
                    )}
                  />
                </PopupField>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <PopupField
                  id="delaySeconds"
                  label="Delay inicial (segundos)"
                >
                  <Input
                    id="delaySeconds"
                    type="number"
                    min={3}
                    max={5}
                    {...register("delaySeconds", { valueAsNumber: true })}
                  />
                  <FieldError message={errors.delaySeconds?.message} />
                </PopupField>
                <PopupField id="frequencyHours" label="Frecuencia (horas)">
                  <Input
                    id="frequencyHours"
                    type="number"
                    {...register("frequencyHours", { valueAsNumber: true })}
                  />
                  <FieldError message={errors.frequencyHours?.message} />
                </PopupField>
                <PopupField
                  id="visibleDurationSeconds"
                  label="Duracion visible (segundos)"
                >
                  <Input
                    id="visibleDurationSeconds"
                    type="number"
                    min={5}
                    max={120}
                    {...register("visibleDurationSeconds", { valueAsNumber: true })}
                  />
                  <FieldError message={errors.visibleDurationSeconds?.message} />
                </PopupField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <PopupField id="startsAt" label="Vigencia desde">
                  <Controller
                    control={control}
                    name="startsAt"
                    render={({ field }) => (
                      <Input
                        id="startsAt"
                        type="datetime-local"
                        value={toDateTimeLocalValue(field.value)}
                        onChange={(event) =>
                          field.onChange(
                            parseDateTimeLocalValue(event.target.value),
                          )
                        }
                      />
                    )}
                  />
                </PopupField>
                <PopupField id="endsAt" label="Vigencia hasta">
                  <Controller
                    control={control}
                    name="endsAt"
                    render={({ field }) => (
                      <Input
                        id="endsAt"
                        type="datetime-local"
                        value={toDateTimeLocalValue(field.value)}
                        onChange={(event) =>
                          field.onChange(
                            parseDateTimeLocalValue(event.target.value),
                          )
                        }
                      />
                    )}
                  />
                </PopupField>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link href="/dashboard">Cancelar</Link>
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsPreviewVisible(true)}
            >
              Vista previa
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar popup
            </Button>
          </div>
        </form>
      )}

      {isPreviewVisible ? (
        <HomeDiscountPopupPreview
          config={previewConfig}
          onDismiss={() => setIsPreviewVisible(false)}
        />
      ) : null}
    </div>
  );
}
