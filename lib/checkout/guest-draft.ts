import { guestCheckoutFormSchema, type GuestCheckoutFormValues } from "@/lib/checkout/schemas";

const GUEST_CHECKOUT_DRAFT_STORAGE_KEY = "osoria_checkout_guest_draft";

/**
 * Reads the guest checkout draft saved on this browser.
 *
 * @returns the fields written so far, or null when there is no readable draft.
 *   A draft is always partial -- it is written while the form is still being
 *   filled -- so it is validated field by field, never against the full schema.
 */
export function readGuestCheckoutDraft(): Partial<GuestCheckoutFormValues> | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(GUEST_CHECKOUT_DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = guestCheckoutFormSchema.partial().safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    console.warn("[Checkout] No se pudo leer el borrador del checkout:", error);
    return null;
  }
}

export function saveGuestCheckoutDraft(values: Partial<GuestCheckoutFormValues>): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(GUEST_CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(values));
  } catch (error) {
    console.warn("[Checkout] No se pudo guardar el borrador del checkout:", error);
  }
}

export function clearGuestCheckoutDraft(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(GUEST_CHECKOUT_DRAFT_STORAGE_KEY);
  } catch (error) {
    console.warn("[Checkout] No se pudo borrar el borrador del checkout:", error);
  }
}
