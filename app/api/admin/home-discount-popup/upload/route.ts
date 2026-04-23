import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  getHomeDiscountPopupServerClients,
  getHomeDiscountPopupStoreLookup,
  requireHomeDiscountPopupAdmin,
  resolveHomeDiscountPopupStoreId,
} from "@/lib/home-discount-popup-admin";
import {
  buildHomeDiscountPopupUploadPath,
  HOME_DISCOUNT_POPUP_UPLOAD_BUCKET,
  validateHomeDiscountPopupUpload,
} from "@/lib/home-discount-popup-upload";

function getServiceRoleStorageClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  try {
    const clients = await getHomeDiscountPopupServerClients();
    if (!clients) {
      return NextResponse.json(
        { error: "Supabase no configurado" },
        { status: 500 },
      );
    }

    const adminCheck = await requireHomeDiscountPopupAdmin(
      clients.authClient,
      clients.ecommerceClient,
    );
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status },
      );
    }

    const storageClient = getServiceRoleStorageClient();
    if (!storageClient) {
      return NextResponse.json(
        { error: "Falta SUPABASE_SERVICE_ROLE_KEY para subir imágenes" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Debes enviar un archivo de imagen" },
        { status: 400 },
      );
    }

    const validation = validateHomeDiscountPopupUpload({
      type: file.type,
      size: file.size,
    });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const storeId = await resolveHomeDiscountPopupStoreId(
      clients.ecommerceClient as any,
      await getHomeDiscountPopupStoreLookup(),
    );
    const objectPath = buildHomeDiscountPopupUploadPath(storeId, file.name);

    const { error: uploadError } = await storageClient.storage
      .from(HOME_DISCOUNT_POPUP_UPLOAD_BUCKET)
      .upload(objectPath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error(
        "[Home Discount Popup Upload] Error al subir imagen:",
        uploadError,
      );
      return NextResponse.json(
        { error: uploadError.message || "No se pudo subir la imagen" },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = storageClient.storage
      .from(HOME_DISCOUNT_POPUP_UPLOAD_BUCKET)
      .getPublicUrl(objectPath);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: objectPath,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Tienda no encontrada") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("[Home Discount Popup Upload] Error interno:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
