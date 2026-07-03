const NEWSLETTER_SUBSCRIBERS_TABLE = "newsletter_subscribers";

export async function subscribeEmail(email: string, client: any): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  const { error } = await client
    .from(NEWSLETTER_SUBSCRIBERS_TABLE)
    .upsert(
      { email: normalizedEmail },
      { onConflict: "email", ignoreDuplicates: true },
    );

  if (error) {
    console.error("[Newsletter] Error al suscribir email:", error);
    throw new Error("No se pudo suscribir el email");
  }
}
