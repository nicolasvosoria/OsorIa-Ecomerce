import { createHmac, timingSafeEqual } from "node:crypto";

export const ACTIVE_STORE_COOKIE = "active-store";

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function signActiveStore(storeId: string): string {
  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret) {
    throw new Error("ADMIN_COOKIE_SECRET is not set");
  }

  return `${storeId}.${sign(storeId, secret)}`;
}

export function verifyActiveStore(
  value: string | undefined | null,
): string | null {
  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret || !value) {
    return null;
  }

  const separatorIndex = value.lastIndexOf(".");
  if (separatorIndex <= 0) {
    return null;
  }

  const storeId = value.slice(0, separatorIndex);
  const providedSignature = value.slice(separatorIndex + 1);

  return matchesSignature(providedSignature, sign(storeId, secret))
    ? storeId
    : null;
}

function sign(storeId: string, secret: string): string {
  return createHmac("sha256", secret).update(storeId).digest("hex");
}

function matchesSignature(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided, "hex");
  const expectedBytes = Buffer.from(expected, "hex");

  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  );
}
