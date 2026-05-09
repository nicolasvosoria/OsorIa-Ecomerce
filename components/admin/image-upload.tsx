/* eslint-disable @next/next/no-img-element -- Existing dynamic storefront images intentionally use native img in these legacy components; converting all to next/image is outside the global-gates cleanup risk budget. */
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as Loader2 } from "lucide-react";
import { uploadImage, deleteImage } from "@/lib/supabase/storage-api";
import { deferStateUpdate } from "@/lib/react/defer-state-update";
import { toast } from "sonner";

type UploadHandler = (
  file: File,
  context?: string,
) => Promise<{ success: boolean; url?: string; error?: string }>;

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onFileSelect?: (file: File | null) => void;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  context?: string; // Contexto nemotécnico para el nombre del archivo (ej: "hero-banner", "featured-product")
  recommendedWidth?: number; // Ancho recomendado en px
  recommendedHeight?: number; // Alto recomendado en px
  fileTypes?: string[]; // Tipos de archivo permitidos (ej: ["PNG", "SVG", "JPG"])
  uploadHandler?: UploadHandler;
  skipStorageDelete?: boolean;
  deferUpload?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onFileSelect,
  label = "Imagen",
  accept = "image/jpeg,image/jpg,image/png,image/webp,image/gif",
  maxSizeMB = 5,
  context,
  recommendedWidth,
  recommendedHeight,
  fileTypes,
  uploadHandler,
  skipStorageDelete = false,
  deferUpload = false,
}: ImageUploadProps) {
  // Si el contexto es de productos, usar 1 MB como límite
  const isProductContext =
    context && (context.includes("product") || context.includes("item"));
  const effectiveMaxSizeMB = isProductContext ? 1 : maxSizeMB;
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    deferStateUpdate(() => setPreview(value || null));
  }, [value]);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen válido");
      return;
    }

    // Validar tamaño - Para productos, máximo 1 MB
    const maxSize = effectiveMaxSizeMB * 1024 * 1024;
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);

    if (file.size > maxSize) {
      toast.error(
        `El archivo es demasiado grande. Tamaño máximo permitido: ${effectiveMaxSizeMB}MB. Tu archivo: ${fileSizeMB}MB`,
        { duration: 5000 },
      );
      return;
    }

    // Mostrar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    if (deferUpload) {
      onFileSelect?.(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Subir archivo
    setUploading(true);
    try {
      const result = await (uploadHandler ?? uploadImage)(file, context);

      if (result.success && result.url) {
        onChange(result.url);
        toast.success("Imagen subida correctamente");
      } else {
        toast.error(result.error || "Error al subir la imagen");
        setPreview(value || null); // Restaurar preview anterior
      }
    } catch (error) {
      console.error("[ImageUpload] Error:", error);
      toast.error("Error al subir la imagen");
      setPreview(value || null);
    } finally {
      setUploading(false);
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (!value && !preview) return;

    // Si es una imagen de Supabase Storage, intentar eliminarla
    if (!skipStorageDelete && value.includes("supabase.co/storage")) {
      try {
        await deleteImage(value);
        toast.success("Imagen eliminada");
      } catch (error) {
        console.error("[ImageUpload] Error al eliminar:", error);
        // Continuar aunque falle la eliminación
      }
    }

    onChange("");
    onFileSelect?.(null);
    setPreview(null);
  };

  return (
    <div className="space-y-2">
      {label ? <Label>{label}</Label> : null}

      {/* Preview de imagen */}
      {preview && (
        <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-muted">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-contain"
            onError={() => setPreview(null)}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Botón para subir archivo */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Subir Imagen
            </>
          )}
        </Button>

        {preview && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={uploading}
            title="Eliminar imagen"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Información */}
      <div className="space-y-1">
        {fileTypes && fileTypes.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Tipos de archivo permitidos:</span>{" "}
            {fileTypes.join(", ")}
          </p>
        )}
        {recommendedWidth && recommendedHeight && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Dimensiones recomendadas:</span>{" "}
            {recommendedWidth}px × {recommendedHeight}px
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Tamaño máximo: {effectiveMaxSizeMB}MB
          {isProductContext && (
            <span className="text-orange-600 font-medium ml-1">
              (Límite para productos)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
