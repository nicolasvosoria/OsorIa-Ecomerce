"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/contexts/admin-context";
import { useComponentStyle } from "@/contexts/styles-context";
import { cn } from "@/lib/utils";
import { isValidEmail } from "@/lib/utils/email";
import { isToggleOn } from "@/lib/section-editor/toggle-value";
import {
  NEWSLETTER_CONTENT_ALIGN_CLASS,
  resolveLayout,
  resolveNewsletterContentAlign,
} from "@/lib/sections/newsletter-variant";

export const NEWSLETTER_DEFAULTS = {
  title: "Unite a Nuestro Newsletter",
  description:
    "Recibí lanzamientos de productos, ofertas exclusivas y un 10% de descuento en tu próxima compra.",
  discountText: "Obtené un 10% de descuento en tu próxima compra",
  emailPlaceholder: "Correo electrónico",
  buttonText: "Suscribirse",
  backgroundImage: "",
  overlayColor: "#0f172a",
  overlayOpacity: 0.55,
  titleColor: "#ffffff",
  textColor: "#ffffff",
  buttonColor: "",
  logoImage: "",
  contentAlign: "center",
  layout: "stacked",
  showLogo: true,
};

type SubscribeStatus = "idle" | "loading" | "success" | "error" | "invalid";

const LOADING_LABEL = "Suscribiendo…";
const SUCCESS_MESSAGE = "¡Listo! Ya formás parte.";
const ERROR_MESSAGE = "No pudimos suscribirte. Probá de nuevo.";
const INVALID_EMAIL_MESSAGE = "Ingresá un email válido.";

function clampOverlayOpacity(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return NEWSLETTER_DEFAULTS.overlayOpacity;
  return Math.min(Math.max(numeric, 0), 1);
}

export function NewsletterSection() {
  const { styles: styleData } = useComponentStyle(
    "newsletter",
    NEWSLETTER_DEFAULTS,
  );
  const { componentEdits } = useAdmin();
  const edits = componentEdits.get("newsletter") || {};
  const newsletter = { ...NEWSLETTER_DEFAULTS, ...styleData, ...edits };
  const overlayOpacity = clampOverlayOpacity(newsletter.overlayOpacity);
  const buttonColor =
    newsletter.buttonColor || "var(--sec-newsletter-button, var(--primary))";
  const contentAlign = resolveNewsletterContentAlign(newsletter.contentAlign);
  const layout = resolveLayout(newsletter.layout);
  const showLogo = isToggleOn(newsletter.showLogo) && Boolean(newsletter.logoImage);
  const contentAlignClass = NEWSLETTER_CONTENT_ALIGN_CLASS[contentAlign];

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubscribeStatus>("idle");
  const isLoading = status === "loading";

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setStatus("invalid");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (!response.ok) throw new Error("Newsletter subscribe request failed");

      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  const logo = showLogo ? (
    <div
      role="img"
      aria-label="Logo"
      className="h-16 w-16 rounded-full border-4 border-background bg-cover bg-center shadow-lg md:h-20 md:w-20"
      style={{ backgroundImage: `url(${newsletter.logoImage})` }}
    />
  ) : null;

  const titleAndDescription = (
    <>
      <h2
        className="max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl"
        style={{ color: newsletter.titleColor }}
      >
        {newsletter.title}
      </h2>
      <p
        className="max-w-xl text-sm leading-relaxed md:text-base"
        style={{ color: newsletter.textColor }}
      >
        {newsletter.description}
      </p>
    </>
  );

  const discountLine = (
    <p className="font-semibold" style={{ color: newsletter.textColor }}>
      {newsletter.discountText}
    </p>
  );

  const subscribeForm = (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-xl flex-col gap-3 sm:flex-row"
    >
      <Input
        type="email"
        value={email}
        onChange={handleEmailChange}
        placeholder={newsletter.emailPlaceholder}
        aria-label="Newsletter email"
        required
        className="h-12 rounded-[var(--button-radius)] border-none bg-white px-6 text-foreground"
      />
      <Button
        type="submit"
        disabled={isLoading}
        className="h-12 shrink-0 rounded-[var(--button-radius)] px-8"
        style={{ backgroundColor: buttonColor }}
      >
        {isLoading ? LOADING_LABEL : newsletter.buttonText}
      </Button>
    </form>
  );

  const statusMessage =
    status === "success" ? (
      <p className="text-sm font-medium" style={{ color: newsletter.textColor }}>
        {SUCCESS_MESSAGE}
      </p>
    ) : status === "error" ? (
      <p className="text-sm font-medium text-destructive">{ERROR_MESSAGE}</p>
    ) : status === "invalid" ? (
      <p className="text-sm font-medium text-destructive">{INVALID_EMAIL_MESSAGE}</p>
    ) : null;

  return (
    <section data-component="newsletter" className="px-2 py-4 md:px-4 md:py-8">
      <div className="relative mx-2 my-4 overflow-hidden rounded-card md:mx-4 md:my-8">
        <div
          className={cn(
            "absolute inset-0 bg-cover bg-center",
            !newsletter.backgroundImage &&
              "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900",
          )}
          style={
            newsletter.backgroundImage
              ? { backgroundImage: `url(${newsletter.backgroundImage})` }
              : undefined
          }
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: newsletter.overlayColor,
            opacity: overlayOpacity,
          }}
        />

        {layout === "split" ? (
          <div className="relative z-10 grid gap-8 px-6 py-16 md:grid-cols-2 md:items-center md:py-24">
            <div className={cn("flex flex-col gap-6", contentAlignClass)}>
              {logo}
              {titleAndDescription}
              {discountLine}
            </div>
            <div className="flex flex-col gap-3">
              {subscribeForm}
              {statusMessage}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "relative z-10 flex flex-col gap-6 px-6 py-16 md:py-24",
              contentAlignClass,
            )}
          >
            {logo}
            {titleAndDescription}
            {subscribeForm}
            {statusMessage}
            {discountLine}
          </div>
        )}
      </div>
    </section>
  );
}
