"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/language-context";
import type { AccountProfile, AccountProfileInput } from "@/lib/account/schemas";
import { saveAccountProfile } from "./actions";
import { useAccountMutation } from "./use-account-mutation";

export function ProfileForm({ profile }: { profile: AccountProfile }) {
  const { t } = useLanguage();
  const [fields, setFields] = useState<AccountProfileInput>(() => toEditableFields(profile));
  const { isPending, runMutation } = useAccountMutation();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    runMutation(
      () => saveAccountProfile(fields),
      () => toast.success(t.account.profileSaved),
    );
  };

  const editField =
    (field: keyof AccountProfileInput) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setFields((current) => ({ ...current, [field]: event.target.value }));

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="account-first-name" label={t.auth.firstName}>
          {(field) => (
            <Input
              {...field}
              autoComplete="given-name"
              value={fields.firstName}
              onChange={editField("firstName")}
            />
          )}
        </FormField>
        <FormField id="account-last-name" label={t.auth.lastName}>
          {(field) => (
            <Input
              {...field}
              autoComplete="family-name"
              value={fields.lastName}
              onChange={editField("lastName")}
            />
          )}
        </FormField>
      </div>
      <FormField id="account-phone" label={t.auth.phone}>
        {(field) => (
          <Input
            {...field}
            type="tel"
            autoComplete="tel"
            value={fields.phone}
            onChange={editField("phone")}
          />
        )}
      </FormField>
      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t.passwordReset.updating}
          </>
        ) : (
          t.common.save
        )}
      </Button>
    </form>
  );
}

function toEditableFields(profile: AccountProfile): AccountProfileInput {
  return {
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    phone: profile.phone ?? "",
  };
}
