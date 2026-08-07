import { NextRequest, NextResponse } from "next/server";

import { getEmailPreviewFixture } from "@/lib/email/fixtures";
import { renderEmail } from "@/lib/email/render";
import { EMAIL_TEMPLATE_KINDS, type EmailTemplateKind } from "@/lib/email/types";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Solo disponible en desarrollo" }, { status: 404 });
  }

  const kind = new URL(request.url).searchParams.get("template");
  if (!isEmailTemplateKind(kind)) {
    return NextResponse.json({ error: "Selecciona un template permitido" }, { status: 400 });
  }

  const preview = await renderEmail(getEmailPreviewFixture(kind));
  return new NextResponse(preview.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function isEmailTemplateKind(value: string | null): value is EmailTemplateKind {
  return value !== null && EMAIL_TEMPLATE_KINDS.includes(value as EmailTemplateKind);
}
