"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/language-context";
import {
  blamePasswordFields,
  findPasswordProblem,
  type PasswordFieldErrors,
  type PasswordProblem,
} from "@/lib/account/password-rule";
import type { SavedAddress } from "@/lib/account/saved-address";
import type { AccountProfile } from "@/lib/account/schemas";
import { changeOwnPassword, type PasswordChangeResult } from "@/lib/supabase/auth-api";
import { AddressBook } from "./address-book";
import type { AccountPageView } from "./load-account-view";
import { ProfileForm } from "./profile-form";

export function AccountPageClient({ view }: { view: AccountPageView }) {
  if (!view.authenticated) {
    return <AccountGuestState />;
  }

  return (
    <AccountSettings email={view.email} profile={view.profile} addresses={view.addresses} />
  );
}

// El único inicio de sesión que existe en los dos mundos es /auth/login: en el
// host admin no hay header de tienda con su modal, y esta pantalla se sirve en
// ambos (D14).
function AccountGuestState() {
  const { t } = useLanguage();

  return (
    <AccountLayout title={t.account.guestTitle} description={t.account.guestDescription}>
      <Button asChild className="w-full sm:w-auto">
        <Link href="/auth/login">{t.auth.login}</Link>
      </Button>
    </AccountLayout>
  );
}

function AccountSettings({
  email,
  profile,
  addresses,
}: {
  email: string | null;
  profile: AccountProfile;
  addresses: SavedAddress[];
}) {
  const { t } = useLanguage();

  return (
    <AccountLayout title={t.account.title} description={t.account.description}>
      {/* `CardTitle` pinta un <div>: sin rol de encabezado, las secciones de esta
          pantalla existen a la vista pero no para quien navega por encabezados.
          La primitiva se comparte con la consola, así que el nivel se declara
          aquí, bajo el único <h1> de la página. */}
      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>
            {t.auth.email}
          </CardTitle>
          <CardDescription>{t.account.emailFixed}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="break-all font-medium">{email ?? "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>
            {t.account.profileTitle}
          </CardTitle>
          <CardDescription>{t.account.profileDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      {/* La cuenta no repite el historial: lo enlaza. /orders es la única
          pantalla de pedidos del storefront, la misma a la que llegan el menú
          de usuario y el footer (D20). */}
      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>
            {t.account.ordersTitle}
          </CardTitle>
          <CardDescription>{t.account.ordersDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/orders">{t.nav.orders}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>
            {t.account.addressesTitle}
          </CardTitle>
          <CardDescription>{t.account.addressesDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <AddressBook addresses={addresses} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>
            {t.auth.password}
          </CardTitle>
          <CardDescription>{t.account.passwordDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>
    </AccountLayout>
  );
}

function AccountLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-8 md:py-16">
        <div className="mb-8">
          <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}

function PasswordChangeForm() {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({});

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const problem: PasswordProblem | null = !currentPassword
      ? "incomplete"
      : findPasswordProblem({ newPassword, confirmation });
    if (problem) {
      const message = {
        incomplete: t.header.incompleteFieldsDescription,
        tooShort: t.header.passwordMinLength,
        mismatch: t.header.passwordsDoNotMatch,
      }[problem];
      setFieldErrors(
        blamePasswordFields({
          problem,
          message,
          typed: { currentPassword, newPassword, confirmation },
        }),
      );
      toast.error(message);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    const result = await changeOwnPassword({ currentPassword, newPassword });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(t.passwordReset.updateFailed, {
        description: describeChangeFailure(result, t),
        duration: 5000,
      });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
    toast.success(t.account.passwordChanged, {
      description: t.account.passwordChangedHint,
      duration: 3000,
    });
  };

  // Sin `required` ni `minLength` nativos a propósito: el navegador redacta esos
  // avisos en su propio idioma, y aquí la interfaz habla el del producto. La
  // validación vive entera en la regla compartida, y su aviso se queda en el
  // campo que lo provocó además de pasar por el toast.
  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField
        id="current-password"
        label={t.account.currentPassword}
        error={fieldErrors.currentPassword}
      >
        {(field) => (
          <Input
            {...field}
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        )}
      </FormField>
      <FormField
        id="new-password"
        label={t.passwordReset.newPassword}
        hint={t.header.passwordMinLength}
        error={fieldErrors.newPassword}
      >
        {(field) => (
          <Input
            {...field}
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        )}
      </FormField>
      <FormField
        id="confirm-password"
        label={t.auth.confirmPassword}
        error={fieldErrors.confirmation}
      >
        {(field) => (
          <Input
            {...field}
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        )}
      </FormField>
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t.passwordReset.updating}
          </>
        ) : (
          t.account.changePassword
        )}
      </Button>
    </form>
  );
}

type FailedPasswordChange = Extract<PasswordChangeResult, { success: false }>;

function describeChangeFailure(
  failure: FailedPasswordChange,
  t: ReturnType<typeof useLanguage>["t"],
): string {
  if (failure.reason === "wrongCurrentPassword") {
    return t.account.wrongCurrentPassword;
  }
  if (failure.reason === "samePassword") {
    return t.account.samePassword;
  }
  return failure.error;
}
