"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Percent, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  normalizeHomeDiscountPopupConfig,
  type HomeDiscountPopupConfig,
  type HomeDiscountPopupCtaMode,
} from "@/lib/home-discount-popup";

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

export default function HomeDiscountPopupConfigPage() {
  const { isAdmin, loading } = useAdminPermissions();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<HomeDiscountPopupConfig>(
    normalizeHomeDiscountPopupConfig({}),
  );

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/");
    }
  }, [isAdmin, loading, router]);

  useEffect(() => {
    const loadConfig = async () => {
      if (!isAdmin) {
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch("/api/home-discount-popup-config");
        if (!response.ok) {
          throw new Error("No se pudo cargar la configuración");
        }

        const data = await response.json();
        setConfig(normalizeHomeDiscountPopupConfig(data.config));
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
  }, [isAdmin]);

  const updateConfig = <Key extends keyof HomeDiscountPopupConfig>(
    key: Key,
    value: HomeDiscountPopupConfig[Key],
  ) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const normalizedConfig = normalizeHomeDiscountPopupConfig(config);
      const response = await fetch("/api/home-discount-popup-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: normalizedConfig }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo guardar la configuración");
      }

      setConfig(normalizedConfig);
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle>Acceso denegado</CardTitle>
            </div>
            <CardDescription>
              No tienes permisos para esta sección.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Volver al inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-foreground">
              Popup de descuento en home
            </h1>
            <p className="text-sm text-muted-foreground">
              Configura una sola promo flotante para la portada de la tienda.
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
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
                  <Switch
                    checked={config.active}
                    onCheckedChange={(checked) =>
                      updateConfig("active", checked)
                    }
                    aria-label="Activar popup"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <PopupField id="title" label="Titulo">
                    <Input
                      id="title"
                      value={config.title}
                      onChange={(event) =>
                        updateConfig("title", event.target.value)
                      }
                    />
                  </PopupField>
                  <PopupField id="ctaText" label="Texto del CTA">
                    <Input
                      id="ctaText"
                      value={config.ctaText}
                      onChange={(event) =>
                        updateConfig("ctaText", event.target.value)
                      }
                    />
                  </PopupField>
                </div>

                <PopupField id="text" label="Mensaje principal">
                  <Textarea
                    id="text"
                    value={config.text}
                    onChange={(event) =>
                      updateConfig("text", event.target.value)
                    }
                  />
                </PopupField>

                <div className="grid gap-4 md:grid-cols-2">
                  <PopupField
                    id="imageUrl"
                    label="Imagen"
                    hint="Usa una URL HTTPS pública."
                  >
                    <Input
                      id="imageUrl"
                      value={config.imageUrl ?? ""}
                      onChange={(event) =>
                        updateConfig("imageUrl", event.target.value || null)
                      }
                    />
                  </PopupField>
                  <PopupField
                    id="coupon"
                    label="Cupon"
                    hint="Necesario cuando el CTA copia el codigo."
                  >
                    <Input
                      id="coupon"
                      value={config.coupon}
                      onChange={(event) =>
                        updateConfig("coupon", event.target.value)
                      }
                    />
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
                    <Select
                      value={config.ctaMode}
                      onValueChange={(value: HomeDiscountPopupCtaMode) =>
                        updateConfig("ctaMode", value)
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
                  </PopupField>
                  <PopupField
                    id="ctaUrl"
                    label="URL del CTA"
                    hint="Solo se usa cuando el modo es redireccion. Requiere URL absoluta HTTPS."
                  >
                    <Input
                      id="ctaUrl"
                      value={config.ctaUrl ?? ""}
                      onChange={(event) =>
                        updateConfig("ctaUrl", event.target.value || null)
                      }
                    />
                  </PopupField>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <PopupField id="delayMs" label="Delay inicial (ms)">
                    <Input
                      id="delayMs"
                      type="number"
                      value={config.delayMs}
                      onChange={(event) =>
                        updateConfig("delayMs", Number(event.target.value) || 0)
                      }
                    />
                  </PopupField>
                  <PopupField id="frequencyHours" label="Frecuencia (horas)">
                    <Input
                      id="frequencyHours"
                      type="number"
                      value={config.frequencyHours}
                      onChange={(event) =>
                        updateConfig(
                          "frequencyHours",
                          Number(event.target.value) || 0,
                        )
                      }
                    />
                  </PopupField>
                  <PopupField
                    id="visibleDurationMs"
                    label="Duracion visible (ms)"
                  >
                    <Input
                      id="visibleDurationMs"
                      type="number"
                      value={config.visibleDurationMs}
                      onChange={(event) =>
                        updateConfig(
                          "visibleDurationMs",
                          Number(event.target.value) || 0,
                        )
                      }
                    />
                  </PopupField>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <PopupField id="startsAt" label="Vigencia desde">
                    <Input
                      id="startsAt"
                      type="datetime-local"
                      value={
                        config.startsAt ? config.startsAt.slice(0, 16) : ""
                      }
                      onChange={(event) =>
                        updateConfig(
                          "startsAt",
                          event.target.value
                            ? new Date(event.target.value).toISOString()
                            : null,
                        )
                      }
                    />
                  </PopupField>
                  <PopupField id="endsAt" label="Vigencia hasta">
                    <Input
                      id="endsAt"
                      type="datetime-local"
                      value={config.endsAt ? config.endsAt.slice(0, 16) : ""}
                      onChange={(event) =>
                        updateConfig(
                          "endsAt",
                          event.target.value
                            ? new Date(event.target.value).toISOString()
                            : null,
                        )
                      }
                    />
                  </PopupField>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" asChild>
                <Link href="/dashboard">Cancelar</Link>
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar popup
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
