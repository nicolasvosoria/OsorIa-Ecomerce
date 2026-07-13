import { NextRequest, NextResponse } from "next/server";

import { getHomeDiscountPopupServiceClients } from "@/lib/home-discount-popup-admin";
import {
  buildHomeDiscountPopupUploadPath,
  HOME_DISCOUNT_POPUP_UPLOAD_BUCKET,
  validateHomeDiscountPopupUpload,
} from "@/lib/home-discount-popup-upload";
import { authorizeStoreAdmin } from "@/lib/supabase/admin-route-guard";

export async function POST(request: NextRequest) {
  try {
    const clients = getHomeDiscountPopupServiceClients();
    if (!clients) {
      return NextResponse.json(
        { error: "Supabase no configurado" },
        { status: 500 },
      );
    }

    const auth = await authorizeStoreAdmin(request, clients.ecommerceClient);
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }
    const storeId = auth.storeId;

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

    const objectPath = buildHomeDiscountPopupUploadPath(storeId, file.name);

    const { error: uploadError } = await clients.serviceClient.storage
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
    } = clients.serviceClient.storage
      .from(HOME_DISCOUNT_POPUP_UPLOAD_BUCKET)
      .getPublicUrl(objectPath);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: objectPath,
    });
  } catch (error) {
    console.error("[Home Discount Popup Upload] Error interno:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
