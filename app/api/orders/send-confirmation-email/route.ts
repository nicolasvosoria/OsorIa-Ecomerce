import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Solo disponible en desarrollo" }, { status: 404 });
  }

  return NextResponse.redirect(new URL("/api/email-preview?template=order-received", request.url));
}
