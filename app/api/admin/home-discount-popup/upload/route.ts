import { NextRequest, NextResponse } from "next/server";

import {
  getHomeDiscountPopupServiceClients,
  getHomeDiscountPopupStoreLookup,
  resolveHomeDiscountPopupStoreId,
} from "@/lib/home-discount-popup-admin";
import {
  buildHomeDiscountPopupUploadPath,
  HOME_DISCOUNT_POPUP_UPLOAD_BUCKET,
  validateHomeDiscountPopupUpload,
} from "@/lib/home-discount-popup-upload";
import { requireAdminUser } from "@/lib/supabase/admin-route-auth";

export async function POST(request: NextRequest) {
  try {
    const clients = getHomeDiscountPopupServiceClients();
    if (!clients) {
      return NextResponse.json(
        { error: "Supabase no configurado" },
        { status: 500 },
      );
    }

    const adminCheck = await requireAdminUser(request, clients.ecommerceClient);
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status },
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
